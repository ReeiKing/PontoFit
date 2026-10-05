-- ============================================================================
-- PontoFit — profissionais (nutricionistas, personal, academias) e vínculos
--
-- profissionais: conta com painel profissional (gratuito). Registro (CRN,
--   CREF...) e empresa são opcionais. codigo = convite pessoal
--   (pontofit.site/convite.html?c=CODIGO).
-- vinculos: o paciente autoriza um profissional e escolhe o que compartilha.
--   Pode mudar ou revogar quando quiser. Sem vínculo ativo, o profissional não
--   vê nada.
-- Tudo passa pelo servidor (api/prof/*, api/vinculos, api/convite), que
-- confere o vínculo a cada leitura: RLS ligado e nenhuma política.
--
-- Cadastro: com raw_user_meta_data.tipo = 'profissional', o CPF é opcional
-- (se vier, precisa ser válido) e o perfil profissional é criado junto.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create table public.profissionais (
  usuario_id  uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(nome) between 2 and 120),
  profissao   text not null check (profissao in ('nutricionista', 'personal', 'academia', 'medico', 'outro')),
  registro    text check (registro is null or char_length(registro) <= 40),
  empresa     text check (empresa is null or char_length(empresa) <= 120),
  codigo      text not null unique check (codigo ~ '^[A-Z0-9-]{4,24}$'),
  criado_em   timestamptz not null default now()
);

create table public.vinculos (
  id                        uuid primary key default gen_random_uuid(),
  profissional_id           uuid not null references public.profissionais (usuario_id) on delete cascade,
  paciente_id               uuid not null references auth.users (id) on delete cascade,
  compartilha_peso          boolean not null default true,
  compartilha_agua          boolean not null default true,
  compartilha_medicamentos  boolean not null default true,
  compartilha_ficha         boolean not null default true,
  compartilha_gestacao      boolean not null default false,
  status                    text not null default 'ativo' check (status in ('ativo', 'revogado')),
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  revogado_em               timestamptz,
  check (profissional_id <> paciente_id)
);
create unique index vinculos_um_ativo on public.vinculos (profissional_id, paciente_id) where status = 'ativo';
create index vinculos_paciente_idx on public.vinculos (paciente_id);

alter table public.profissionais enable row level security;
alter table public.vinculos enable row level security;
revoke all on table public.profissionais, public.vinculos from public, anon, authenticated;
grant select, insert, update on table public.profissionais to service_role;
grant select, insert, update on table public.vinculos to service_role;

-- Código de convite a partir do nome: ANA-4821 (sem acento, até 8 letras).
create or replace function private.gerar_codigo_profissional(p_nome text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_base text;
  v_codigo text;
begin
  v_base := upper(translate(split_part(btrim(coalesce(p_nome, '')), ' ', 1),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));
  v_base := left(regexp_replace(v_base, '[^A-Z0-9]', '', 'g'), 8);
  if char_length(v_base) < 2 then v_base := 'PRO'; end if;
  loop
    v_codigo := v_base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.profissionais where codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;
revoke execute on function private.gerar_codigo_profissional(text) from public, anon, authenticated;
grant execute on function private.gerar_codigo_profissional(text) to service_role;

-- Para o servidor criar o perfil profissional de quem já tem conta.
create or replace function public.ativar_profissional(p_usuario uuid, p_nome text, p_profissao text, p_registro text, p_empresa text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_codigo text;
begin
  select codigo into v_codigo from public.profissionais where usuario_id = p_usuario;
  if found then
    return v_codigo;
  end if;
  v_codigo := private.gerar_codigo_profissional(p_nome);
  insert into public.profissionais (usuario_id, nome, profissao, registro, empresa, codigo)
  values (p_usuario, btrim(p_nome), p_profissao, nullif(btrim(coalesce(p_registro, '')), ''), nullif(btrim(coalesce(p_empresa, '')), ''), v_codigo);
  return v_codigo;
end;
$$;
revoke execute on function public.ativar_profissional(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ativar_profissional(uuid, text, text, text, text) to service_role;

-- Novo código de convite (o antigo deixa de funcionar).
create or replace function public.trocar_codigo_profissional(p_usuario uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_nome text;
  v_codigo text;
begin
  select nome into v_nome from public.profissionais where usuario_id = p_usuario for update;
  if not found then
    raise exception 'Profissional não encontrado' using errcode = 'P0002';
  end if;
  v_codigo := private.gerar_codigo_profissional(v_nome);
  update public.profissionais set codigo = v_codigo where usuario_id = p_usuario;
  return v_codigo;
end;
$$;
revoke execute on function public.trocar_codigo_profissional(uuid) from public, anon, authenticated;
grant execute on function public.trocar_codigo_profissional(uuid) to service_role;

-- Cadastro: profissional não precisa de CPF; cria o perfil profissional junto.
create or replace function private.criar_dados_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nome  text := left(coalesce(btrim(v_meta ->> 'nome'), ''), 120);
  v_plano text := case
    when v_meta ->> 'plano' in ('semanal', 'mensal', 'semestral') then v_meta ->> 'plano'
    else 'mensal'
  end;
  v_cpf   text := nullif(regexp_replace(coalesce(v_meta ->> 'cpf', ''), '\D', '', 'g'), '');
  v_prof  boolean := coalesce((v_meta ->> 'tipo') = 'profissional', false);
  v_profissao text := case
    when v_meta ->> 'profissao' in ('nutricionista', 'personal', 'academia', 'medico', 'outro') then v_meta ->> 'profissao'
    else 'outro'
  end;
begin
  if (v_prof and v_cpf is not null and not private.cpf_valido(v_cpf))
     or (not v_prof and not private.cpf_valido(coalesce(v_cpf, ''))) then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;

  insert into public.perfis (id, nome, email, plano, cpf, aceite_aviso_saude)
  values (new.id, v_nome, coalesce(new.email, ''), v_plano, v_cpf,
          coalesce((v_meta ->> 'aceite_aviso_saude')::boolean, false));
  insert into public.fichas (usuario_id, nome) values (new.id, nullif(v_nome, ''));

  if v_prof then
    insert into public.profissionais (usuario_id, nome, profissao, registro, empresa, codigo)
    values (new.id, coalesce(nullif(v_nome, ''), 'Profissional'), v_profissao,
            nullif(left(btrim(coalesce(v_meta ->> 'registro', '')), 40), ''),
            nullif(left(btrim(coalesce(v_meta ->> 'empresa', '')), 120), ''),
            private.gerar_codigo_profissional(v_nome));
  end if;
  return new;
end;
$$;
revoke execute on function private.criar_dados_novo_usuario() from public, anon, authenticated;
