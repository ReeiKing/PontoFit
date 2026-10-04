-- ============================================================================
-- PontoFit — planos avulsos (7 dias, 30 dias e 6 meses)
--
-- Troca as mensalidades recorrentes por pacotes de acesso pagos uma vez:
--   semanal    7 dias  · R$ 4,99
--   mensal    30 dias  · R$ 15,00
--   semestral  6 meses · R$ 50,00
-- Pagamento por Pix (QR no site) ou cartão (Checkout Pro do Mercado Pago).
-- Cada pagamento aprovado soma o período a perfis.acesso_ate, a partir do fim
-- do acesso atual (se ainda houver dias) ou de hoje.
--
-- Também:
--   - sem teste grátis: conta nova nasce sem acesso (só a seção Assinaturas);
--   - sem tolerância: acesso vale até o último dia pago, inclusive;
--   - remove a assinatura recorrente no cartão (tabelas assinaturas e
--     pagamentos_assinatura), substituída pelo pagamento avulso.
-- A tabela cobrancas fica no banco, mas o app deixa de usá-la.
--
-- Contas existentes mantêm o acesso_ate que já têm.
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Duração de cada plano (usada nas confirmações de pagamento)
-- ----------------------------------------------------------------------------
create or replace function private.duracao_plano(p_plano text)
returns interval
language sql
immutable
set search_path = ''
as $$
  select case p_plano
    when 'semanal' then interval '7 days'
    when 'mensal' then interval '30 days'
    when 'semestral' then interval '6 months'
  end;
$$;
revoke execute on function private.duracao_plano(text) from public, anon, authenticated;
grant execute on function private.duracao_plano(text) to service_role;

-- ----------------------------------------------------------------------------
-- Perfil: plano preferido (escolhido no cadastro) e acesso sem teste grátis
-- ----------------------------------------------------------------------------
alter table public.perfis drop constraint perfis_plano_check;
update public.perfis set plano = 'semestral' where plano = 'anual';
alter table public.perfis add constraint perfis_plano_check
  check (plano in ('semanal', 'mensal', 'semestral'));

-- acesso_ate = último dia com acesso. Ontem = conta nova ainda sem acesso.
alter table public.perfis
  alter column teste_gratis_ate set default (current_date - 1),
  alter column acesso_ate set default (current_date - 1);

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
begin
  insert into public.perfis (id, nome, email, plano, aceite_aviso_saude)
  values (
    new.id,
    v_nome,
    coalesce(new.email, ''),
    v_plano,
    coalesce((new.raw_user_meta_data ->> 'aceite_aviso_saude')::boolean, false)
  );
  insert into public.fichas (usuario_id, nome) values (new.id, nullif(v_nome, ''));
  return new;
end;
$$;
revoke execute on function private.criar_dados_novo_usuario() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Acesso ativo: até o último dia pago, sem tolerância
-- ----------------------------------------------------------------------------
create or replace function private.acesso_ativo()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid())
      and p.acesso_ate >= (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

-- ----------------------------------------------------------------------------
-- Pix: um pagamento por plano (sem vínculo com mensalidade)
-- ----------------------------------------------------------------------------
alter table public.pagamentos_pix drop constraint pagamentos_pix_plano_check;
alter table public.pagamentos_pix add constraint pagamentos_pix_plano_check
  check (plano in ('semanal', 'mensal', 'semestral'));

create policy pagamentos_pix_select_proprios on public.pagamentos_pix for select to authenticated
  using (usuario_id = (select auth.uid()));
grant select (id, plano, valor, status, criado_em, aprovado_em) on table public.pagamentos_pix to authenticated;

create or replace function public.confirmar_pagamento_pix(p_pagamento_id text)
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

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_pix(text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_pix(text) to service_role;

-- ----------------------------------------------------------------------------
-- Cartão (Checkout Pro): id = external_reference da preferência
-- ----------------------------------------------------------------------------
create table public.pagamentos_cartao (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null references auth.users (id) on delete cascade,
  plano            text not null check (plano in ('semanal', 'mensal', 'semestral')),
  valor            numeric(8,2) not null check (valor > 0),
  status           text not null default 'pending',
  preferencia_id   text,
  init_point       text,
  mp_pagamento_id  text unique,
  aprovado_em      timestamptz,
  criado_em        timestamptz not null default now()
);
create index pagamentos_cartao_usuario_idx on public.pagamentos_cartao (usuario_id);

alter table public.pagamentos_cartao enable row level security;

create policy pagamentos_cartao_select_proprios on public.pagamentos_cartao for select to authenticated
  using (usuario_id = (select auth.uid()));

revoke all on table public.pagamentos_cartao from public, anon, authenticated;
grant select (id, plano, valor, status, criado_em, aprovado_em) on table public.pagamentos_cartao to authenticated;
grant select, insert, update, delete on table public.pagamentos_cartao to service_role;

-- Confirma um pagamento no cartão aprovado (chamada só pelo servidor).
-- Idempotente: só a primeira confirmação de cada compra estende o acesso.
create or replace function public.confirmar_pagamento_cartao(p_compra_id uuid, p_pagamento_id text)
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

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_cartao(uuid, text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_cartao(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- Remove a assinatura recorrente no cartão
-- ----------------------------------------------------------------------------
drop function if exists public.confirmar_pagamento_assinatura(text, uuid, text, numeric);
drop table if exists public.pagamentos_assinatura;
drop table if exists public.assinaturas;
