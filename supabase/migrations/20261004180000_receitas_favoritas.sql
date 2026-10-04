-- ============================================================================
-- PontoFit — receitas favoritas
--
-- Cada pessoa marca receitas com o coração; a lista fica na conta (aparece em
-- qualquer aparelho). receita_id é o id da receita em js/receitas-dados.js.
-- Como as outras tabelas de dados, exige acesso ativo (plano pago).
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create table public.receitas_favoritas (
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  receita_id  text not null check (char_length(receita_id) between 1 and 80),
  criado_em   timestamptz not null default now(),
  primary key (usuario_id, receita_id)
);

alter table public.receitas_favoritas enable row level security;

create policy receitas_favoritas_select_proprias on public.receitas_favoritas for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy receitas_favoritas_insert_proprias on public.receitas_favoritas for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy receitas_favoritas_delete_proprias on public.receitas_favoritas for delete to authenticated
  using (usuario_id = (select auth.uid()));
create policy receitas_favoritas_exige_acesso_ativo on public.receitas_favoritas as restrictive for all to authenticated
  using ((select private.acesso_ativo())) with check ((select private.acesso_ativo()));

revoke all on table public.receitas_favoritas from public, anon, authenticated;
grant select, insert, delete on table public.receitas_favoritas to authenticated;
