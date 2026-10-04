-- ============================================================================
-- PontoFit — água do dia
--
-- Um registro por pessoa por dia com a quantidade de copos (250 ml) bebidos.
-- O painel mostra o copo do dia, a meta (pelo peso) e a sequência de dias
-- batendo a meta. Como as outras tabelas de dados, exige acesso ativo.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create table public.registros_agua (
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  data        date not null,
  copos       smallint not null default 0 check (copos between 0 and 40),
  meta        smallint not null default 8 check (meta between 1 and 40),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, data)
);

alter table public.registros_agua enable row level security;

create policy registros_agua_select_proprios on public.registros_agua for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy registros_agua_insert_proprios on public.registros_agua for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy registros_agua_update_proprios on public.registros_agua for update to authenticated
  using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy registros_agua_exige_acesso_ativo on public.registros_agua as restrictive for all to authenticated
  using ((select private.acesso_ativo())) with check ((select private.acesso_ativo()));

revoke all on table public.registros_agua from public, anon, authenticated;
grant select, insert, update on table public.registros_agua to authenticated;
