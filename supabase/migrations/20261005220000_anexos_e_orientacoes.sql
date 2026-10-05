-- 1) Imagens no chat: bucket privado "chat", arquivos em <vinculo_id>/<uuid>.<ext>.
--    Mesmas regras das mensagens: lê quem participa do vínculo ativo; envia
--    quem participa, com o plano do paciente em dia. Ninguém altera ou apaga.
-- 2) Fase 3: orientações do profissional (metas e plano alimentar) por vínculo.
--    Só o servidor lê e grava (api/prof e api/vinculos).

-- ---------- Anexos ----------
alter table public.mensagens
  alter column texto set default '',
  drop constraint mensagens_texto_check,
  add column anexo_path text,
  add constraint mensagens_conteudo_check check (
    char_length(texto) <= 2000 and (char_length(btrim(texto)) >= 1 or anexo_path is not null)
  ),
  add constraint mensagens_anexo_check check (
    anexo_path is null or (
      anexo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
      and split_part(anexo_path, '/', 1) = vinculo_id::text
    )
  );
grant insert (anexo_path) on public.mensagens to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Vínculo dono do arquivo (primeira pasta do caminho), ou null se o caminho for inválido.
create or replace function private.vinculo_do_arquivo(p_nome text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when p_nome ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
              then split_part(p_nome, '/', 1)::uuid end;
$$;
revoke execute on function private.vinculo_do_arquivo(text) from public, anon;
grant execute on function private.vinculo_do_arquivo(text) to authenticated;

create policy "chat: participantes veem as imagens"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'chat' and (select private.participa_vinculo(private.vinculo_do_arquivo(name))));

create policy "chat: participantes enviam imagens com plano ativo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat'
    and private.vinculo_do_arquivo(name) is not null
    and (select private.participa_vinculo(private.vinculo_do_arquivo(name)))
    and (select private.vinculo_com_plano(private.vinculo_do_arquivo(name)))
  );

-- ---------- Orientações do profissional ----------
create table public.orientacoes (
  vinculo_id       uuid primary key references public.vinculos (id) on delete cascade,
  meta_peso_kg     numeric(5,1) check (meta_peso_kg between 30 and 300),
  meta_data        date,
  meta_agua_copos  smallint check (meta_agua_copos between 4 and 20),
  refeicoes        jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(refeicoes) = 'array' and jsonb_array_length(refeicoes) <= 12 and pg_column_size(refeicoes) <= 20000),
  observacoes      text check (char_length(observacoes) <= 2000),
  atualizado_em    timestamptz not null default now()
);
alter table public.orientacoes enable row level security;
revoke all on public.orientacoes from anon, authenticated;
grant select, insert, update, delete on public.orientacoes to service_role;
