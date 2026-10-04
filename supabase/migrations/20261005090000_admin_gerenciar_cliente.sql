-- ============================================================================
-- PontoFit — gerenciar cliente pela administração
--
-- admin_acoes: registro de tudo o que a administração altera em uma conta
-- (nome, e-mail, CPF, senha, acesso, plano preferido). A senha nunca é
-- gravada, só o fato de ter sido trocada.
-- encerrar_sessoes_admin(): desconecta o cliente de todos os aparelhos
-- (apaga as sessões e, em cascata, os tokens de renovação). O token de acesso
-- já emitido expira sozinho em até 1 hora.
-- definir_acesso_admin(): define a data exata do acesso (inclusive encerrar).
-- Tudo só pelo servidor (service_role, api/admin/cliente).
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create table public.admin_acoes (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references auth.users (id) on delete set null,
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  acao        text not null check (acao in ('nome', 'email', 'cpf', 'senha', 'acesso', 'plano', 'confirmar-email', 'sessoes')),
  detalhes    jsonb not null default '{}'::jsonb,
  criado_em   timestamptz not null default now()
);
create index admin_acoes_usuario_idx on public.admin_acoes (usuario_id);

alter table public.admin_acoes enable row level security;
revoke all on table public.admin_acoes from public, anon, authenticated;
grant select, insert on table public.admin_acoes to service_role;

-- Desconecta o cliente de todos os aparelhos. → quantas sessões foram encerradas
create or replace function public.encerrar_sessoes_admin(p_usuario uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.sessions where user_id = p_usuario;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.encerrar_sessoes_admin(uuid) from public, anon, authenticated;
grant execute on function public.encerrar_sessoes_admin(uuid) to service_role;

-- Define a data exata do acesso e registra. → acesso anterior
create or replace function public.definir_acesso_admin(p_usuario uuid, p_data date, p_admin uuid, p_motivo text)
returns date
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_antes date;
begin
  if p_data is null or p_data < date '2020-01-01' or p_data > date '2100-12-31' then
    raise exception 'Data de acesso inválida' using errcode = '22023';
  end if;
  select acesso_ate into v_antes from public.perfis where id = p_usuario for update;
  if not found then
    raise exception 'Assinante não encontrado' using errcode = 'P0002';
  end if;
  update public.perfis set acesso_ate = p_data where id = p_usuario;
  insert into public.admin_acoes (admin_id, usuario_id, acao, detalhes)
  values (p_admin, p_usuario, 'acesso', jsonb_build_object('antes', v_antes, 'depois', p_data, 'motivo', btrim(coalesce(p_motivo, ''))));
  return v_antes;
end;
$$;
revoke execute on function public.definir_acesso_admin(uuid, date, uuid, text) from public, anon, authenticated;
grant execute on function public.definir_acesso_admin(uuid, date, uuid, text) to service_role;
