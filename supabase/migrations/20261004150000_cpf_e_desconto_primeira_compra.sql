-- ============================================================================
-- PontoFit — CPF único por conta e 50% no primeiro plano de 30 dias
--
-- CPF:
--   perfis.cpf (só dígitos) é obrigatório no cadastro, validado pelos dígitos
--   verificadores e único: o mesmo CPF não abre duas contas. Contas antigas
--   ficam sem CPF (null) e não recebem o desconto.
--
-- Desconto:
--   O plano mensal (30 dias) sai por R$ 7,50 na primeira compra. Vale uma vez
--   por CPF: quando uma compra com desconto é aprovada, o CPF da conta e o
--   CPF de quem pagou (quando o Mercado Pago informa) entram em
--   descontos_usados. Quem decide o preço é o servidor (api/_lib/pix.js),
--   consultando desconto_disponivel().
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Validação de CPF (11 dígitos + dígitos verificadores)
-- ----------------------------------------------------------------------------
create or replace function private.cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  d int[];
  soma int;
  dv1 int;
  dv2 int;
begin
  if p_cpf is null or p_cpf !~ '^\d{11}$' or p_cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;
  d := array(select substr(p_cpf, i, 1)::int from generate_series(1, 11) i);
  soma := 0;
  for i in 1..9 loop soma := soma + d[i] * (11 - i); end loop;
  dv1 := (soma * 10) % 11 % 10;
  soma := 0;
  for i in 1..10 loop soma := soma + d[i] * (12 - i); end loop;
  dv2 := (soma * 10) % 11 % 10;
  return dv1 = d[10] and dv2 = d[11];
end;
$$;
revoke execute on function private.cpf_valido(text) from public, anon;
grant execute on function private.cpf_valido(text) to authenticated, service_role;

alter table public.perfis add column cpf text;
alter table public.perfis add constraint perfis_cpf_valido check (cpf is null or private.cpf_valido(cpf));
create unique index perfis_cpf_unico on public.perfis (cpf);

-- Cadastro: CPF vem do formulário (metadata do signup). Inválido ou repetido
-- faz o cadastro falhar; o app avisa antes (validação) ou depois (CPF em uso).
create or replace function private.criar_dados_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome  text := left(coalesce(btrim(new.raw_user_meta_data ->> 'nome'), ''), 120);
  v_plano text := case
    when new.raw_user_meta_data ->> 'plano' in ('semanal', 'mensal', 'semestral') then new.raw_user_meta_data ->> 'plano'
    else 'mensal'
  end;
  v_cpf   text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g');
begin
  if not private.cpf_valido(v_cpf) then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;
  insert into public.perfis (id, nome, email, plano, cpf, aceite_aviso_saude)
  values (
    new.id,
    v_nome,
    coalesce(new.email, ''),
    v_plano,
    v_cpf,
    coalesce((new.raw_user_meta_data ->> 'aceite_aviso_saude')::boolean, false)
  );
  insert into public.fichas (usuario_id, nome) values (new.id, nullif(v_nome, ''));
  return new;
end;
$$;
revoke execute on function private.criar_dados_novo_usuario() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Descontos já usados (um por CPF)
-- ----------------------------------------------------------------------------
create table public.descontos_usados (
  cpf         text primary key check (cpf ~ '^\d{11}$'),
  usuario_id  uuid references auth.users (id) on delete set null,
  compra      text not null,
  usado_em    timestamptz not null default now()
);
alter table public.descontos_usados enable row level security;

-- A pessoa só enxerga o registro do próprio CPF (para saber se já usou).
create policy descontos_usados_select_proprio on public.descontos_usados for select to authenticated
  using (cpf = (select p.cpf from public.perfis p where p.id = (select auth.uid())));

revoke all on table public.descontos_usados from public, anon, authenticated;
grant select (cpf) on table public.descontos_usados to authenticated;
grant select, insert on table public.descontos_usados to service_role;

alter table public.pagamentos_pix add column com_desconto boolean not null default false;
alter table public.pagamentos_cartao add column com_desconto boolean not null default false;

-- Desconto do primeiro plano de 30 dias ainda disponível?
-- Pela app (authenticated) responde só sobre a própria conta: a RLS esconde
-- as linhas de outras pessoas. O servidor (service_role) passa o id.
create or replace function public.desconto_disponivel(p_usuario uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = p_usuario
      and p.cpf is not null
      and not exists (select 1 from public.descontos_usados d where d.cpf = p.cpf)
      and not exists (select 1 from public.pagamentos_pix x where x.usuario_id = p.id and x.aprovado_em is not null)
      and not exists (select 1 from public.pagamentos_cartao c where c.usuario_id = p.id and c.aprovado_em is not null)
  );
$$;
revoke execute on function public.desconto_disponivel(uuid) from public, anon;
grant execute on function public.desconto_disponivel(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Confirmações: registram o desconto usado (CPF da conta e de quem pagou)
-- ----------------------------------------------------------------------------
drop function public.confirmar_pagamento_pix(text);
create function public.confirmar_pagamento_pix(p_pagamento_id text, p_cpf_pagador text default null)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_pg   public.pagamentos_pix;
begin
  update public.pagamentos_pix
     set status = 'approved', aprovado_em = now()
   where id = p_pagamento_id and aprovado_em is null
  returning * into v_pg;

  if not found then
    return false;
  end if;

  update public.perfis
     set acesso_ate = (greatest(acesso_ate, v_hoje - 1) + private.duracao_plano(v_pg.plano))::date
   where id = v_pg.usuario_id;

  if v_pg.com_desconto then
    insert into public.descontos_usados (cpf, usuario_id, compra)
    select c.cpf, v_pg.usuario_id, 'pix:' || v_pg.id
      from (select p.cpf from public.perfis p where p.id = v_pg.usuario_id
            union select nullif(regexp_replace(coalesce(p_cpf_pagador, ''), '\D', '', 'g'), '')) c
     where c.cpf ~ '^\d{11}$'
    on conflict (cpf) do nothing;
  end if;

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_pix(text, text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_pix(text, text) to service_role;

drop function public.confirmar_pagamento_cartao(uuid, text);
create function public.confirmar_pagamento_cartao(p_compra_id uuid, p_pagamento_id text, p_cpf_pagador text default null)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_pg   public.pagamentos_cartao;
begin
  update public.pagamentos_cartao
     set status = 'approved', aprovado_em = now(), mp_pagamento_id = p_pagamento_id
   where id = p_compra_id and aprovado_em is null
  returning * into v_pg;

  if not found then
    return false;
  end if;

  update public.perfis
     set acesso_ate = (greatest(acesso_ate, v_hoje - 1) + private.duracao_plano(v_pg.plano))::date
   where id = v_pg.usuario_id;

  if v_pg.com_desconto then
    insert into public.descontos_usados (cpf, usuario_id, compra)
    select c.cpf, v_pg.usuario_id, 'cartao:' || v_pg.id
      from (select p.cpf from public.perfis p where p.id = v_pg.usuario_id
            union select nullif(regexp_replace(coalesce(p_cpf_pagador, ''), '\D', '', 'g'), '')) c
     where c.cpf ~ '^\d{11}$'
    on conflict (cpf) do nothing;
  end if;

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_cartao(uuid, text, text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_cartao(uuid, text, text) to service_role;
