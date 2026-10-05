-- Fase 2: conversa entre profissional e paciente (por vínculo).
-- Lê: os dois lados de um vínculo ATIVO (o histórico some do alcance quando
-- o paciente remove o acesso). Envia: idem, e o paciente precisa estar com o
-- plano ativo (quem paga o app é o paciente). Tempo real via Supabase
-- Realtime, que respeita as mesmas políticas.

create table public.mensagens (
  id          bigint generated always as identity primary key,
  vinculo_id  uuid not null references public.vinculos (id) on delete cascade,
  autor_id    uuid not null references auth.users (id) on delete cascade,
  texto       text not null check (char_length(btrim(texto)) between 1 and 2000),
  criado_em   timestamptz not null default now(),
  lida_em     timestamptz
);
create index mensagens_vinculo_idx on public.mensagens (vinculo_id, criado_em);
create index mensagens_nao_lidas_idx on public.mensagens (vinculo_id) where lida_em is null;

alter table public.mensagens enable row level security;

-- A pessoa logada participa do vínculo ativo (como profissional ou paciente)?
create or replace function private.participa_vinculo(p_vinculo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vinculos v
    where v.id = p_vinculo
      and v.status = 'ativo'
      and (select auth.uid()) in (v.profissional_id, v.paciente_id)
  );
$$;

-- O paciente desse vínculo está com o acesso pago em dia?
create or replace function private.vinculo_com_plano(p_vinculo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vinculos v
    join public.perfis p on p.id = v.paciente_id
    where v.id = p_vinculo
      and p.acesso_ate >= (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

revoke execute on function private.participa_vinculo(uuid) from public, anon;
revoke execute on function private.vinculo_com_plano(uuid) from public, anon;
grant execute on function private.participa_vinculo(uuid) to authenticated;
grant execute on function private.vinculo_com_plano(uuid) to authenticated;

create policy "mensagens: participantes leem"
  on public.mensagens for select
  to authenticated
  using ((select private.participa_vinculo(vinculo_id)));

create policy "mensagens: participantes enviam com plano ativo"
  on public.mensagens for insert
  to authenticated
  with check (
    autor_id = (select auth.uid())
    and (select private.participa_vinculo(vinculo_id))
    and (select private.vinculo_com_plano(vinculo_id))
  );

-- Só marca como lida o que a OUTRA pessoa escreveu.
create policy "mensagens: destinatário marca como lida"
  on public.mensagens for update
  to authenticated
  using (autor_id <> (select auth.uid()) and (select private.participa_vinculo(vinculo_id)))
  with check (autor_id <> (select auth.uid()) and (select private.participa_vinculo(vinculo_id)));

revoke all on public.mensagens from anon, authenticated;
grant select on public.mensagens to authenticated;
grant insert (vinculo_id, autor_id, texto) on public.mensagens to authenticated;
grant update (lida_em) on public.mensagens to authenticated;
grant select, delete on public.mensagens to service_role;

alter publication supabase_realtime add table public.mensagens;
