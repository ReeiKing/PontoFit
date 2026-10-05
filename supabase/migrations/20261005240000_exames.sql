-- Exames de sangue do paciente: cada exame (data, laboratório, laudo
-- opcional) tem vários resultados (marcador, valor, unidade, referência).
-- Mesmas regras das outras tabelas do paciente: só o dono, com acesso pago.
-- O profissional vê pelo servidor, se o paciente marcar "Exames".

create table public.exames (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data          date not null check (data between '2000-01-01' and '2100-01-01'),
  laboratorio   text check (char_length(laboratorio) <= 120),
  observacoes   text check (char_length(observacoes) <= 2000),
  arquivo_path  text check (arquivo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$'),
  criado_em     timestamptz not null default now(),
  constraint exames_arquivo_do_dono check (arquivo_path is null or split_part(arquivo_path, '/', 1) = usuario_id::text)
);
create index exames_usuario_data_idx on public.exames (usuario_id, data desc);

create table public.exame_resultados (
  id          uuid primary key default gen_random_uuid(),
  exame_id    uuid not null references public.exames (id) on delete cascade,
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  marcador    text not null check (marcador ~ '^[a-z0-9_]{2,40}$'),
  nome        text not null check (char_length(nome) between 1 and 80),
  valor       numeric(12,3) not null check (valor >= 0 and valor < 1000000),
  unidade     text check (char_length(unidade) <= 20),
  ref_min     numeric(12,3),
  ref_max     numeric(12,3),
  posicao     smallint not null default 0,
  constraint exame_resultados_ref check (ref_min is null or ref_max is null or ref_min <= ref_max)
);
create index exame_resultados_exame_idx on public.exame_resultados (exame_id);
create index exame_resultados_marcador_idx on public.exame_resultados (usuario_id, marcador);

-- O resultado precisa pertencer a um exame do mesmo dono.
create or replace function private.exame_do_usuario(p_exame uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.exames e where e.id = p_exame and e.usuario_id = (select auth.uid()));
$$;
revoke execute on function private.exame_do_usuario(uuid) from public, anon;
grant execute on function private.exame_do_usuario(uuid) to authenticated;

alter table public.exames enable row level security;
alter table public.exame_resultados enable row level security;

create policy exames_select_proprio on public.exames for select to authenticated using ((select auth.uid()) = usuario_id);
create policy exames_insert_proprio on public.exames for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy exames_update_proprio on public.exames for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
create policy exames_delete_proprio on public.exames for delete to authenticated using ((select auth.uid()) = usuario_id);
create policy exames_exige_acesso_ativo on public.exames as restrictive for all to authenticated
  using ((select private.acesso_ativo())) with check ((select private.acesso_ativo()));

create policy exame_resultados_select_proprio on public.exame_resultados for select to authenticated using ((select auth.uid()) = usuario_id);
create policy exame_resultados_insert_proprio on public.exame_resultados for insert to authenticated
  with check ((select auth.uid()) = usuario_id and (select private.exame_do_usuario(exame_id)));
create policy exame_resultados_delete_proprio on public.exame_resultados for delete to authenticated using ((select auth.uid()) = usuario_id);
create policy exame_resultados_exige_acesso_ativo on public.exame_resultados as restrictive for all to authenticated
  using ((select private.acesso_ativo())) with check ((select private.acesso_ativo()));

revoke all on public.exames, public.exame_resultados from anon, authenticated;
grant select, delete on public.exames, public.exame_resultados to authenticated;
grant insert (id, usuario_id, data, laboratorio, observacoes, arquivo_path) on public.exames to authenticated;
grant update (data, laboratorio, observacoes, arquivo_path) on public.exames to authenticated;
grant insert (id, exame_id, usuario_id, marcador, nome, valor, unidade, ref_min, ref_max, posicao) on public.exame_resultados to authenticated;
grant select, delete on public.exames, public.exame_resultados to service_role;

-- Laudos (PDF ou foto): bucket privado, pasta = dono.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exames', 'exames', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "exames: dono vê os laudos" on storage.objects for select to authenticated
  using (bucket_id = 'exames' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy "exames: dono envia laudos com acesso ativo" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exames'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png|webp)$'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and (select private.acesso_ativo())
  );
create policy "exames: dono apaga laudos" on storage.objects for delete to authenticated
  using (bucket_id = 'exames' and split_part(name, '/', 1) = (select auth.uid())::text);

-- Novo item de compartilhamento com o profissional. Vínculos já existentes
-- começam desligados (o paciente não autorizou exames); novos convites
-- vêm marcados.
alter table public.vinculos add column compartilha_exames boolean not null default false;
alter table public.vinculos alter column compartilha_exames set default true;
