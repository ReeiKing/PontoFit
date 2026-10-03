-- ============================================================================
-- PontoFit — assinatura no cartão (Mercado Pago, assinatura sem plano com
-- pagamento pendente)
--
-- Convive com o Pix: a pessoa pode pagar cada mensalidade com Pix ou ativar o
-- pagamento automático no cartão. Quem libera o acesso continua sendo o
-- servidor (funções /api da Vercel, service_role).
--
--   assinaturas             uma linha por assinatura criada no Mercado Pago.
--                           id = external_reference enviado ao Mercado Pago.
--                           O app só lê as próprias (para mostrar o status).
--   pagamentos_assinatura   cada cobrança recorrente aprovada (fatura do
--                           Mercado Pago). Garante que um aviso repetido não
--                           estenda o acesso duas vezes.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run
-- (depois da migração do Pix).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Assinaturas
-- status segue o Mercado Pago: pending | authorized | paused | canceled
-- ----------------------------------------------------------------------------
create table public.assinaturas (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  plano          text not null check (plano in ('mensal', 'anual')),
  valor          numeric(8,2) not null check (valor > 0),
  status         text not null default 'pending'
                 check (status in ('pending', 'authorized', 'paused', 'canceled')),
  mp_id          text unique,          -- id da assinatura (preapproval) no Mercado Pago
  init_point     text,                 -- link do Mercado Pago para informar o cartão
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index assinaturas_usuario_idx on public.assinaturas (usuario_id);

-- No máximo uma assinatura viva por pessoa (também barra clique duplo).
create unique index assinaturas_uma_ativa_idx on public.assinaturas (usuario_id)
  where status in ('pending', 'authorized', 'paused');

alter table public.assinaturas enable row level security;

create policy assinaturas_select_proprias on public.assinaturas for select to authenticated
  using (usuario_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- Cobranças recorrentes aprovadas (id = id da fatura no Mercado Pago)
-- ----------------------------------------------------------------------------
create table public.pagamentos_assinatura (
  id             text primary key,
  assinatura_id  uuid not null references public.assinaturas (id) on delete cascade,
  mp_pagamento_id text not null,
  valor          numeric(8,2) not null check (valor > 0),
  aprovado_em    timestamptz not null default now()
);
create index pagamentos_assinatura_assinatura_idx on public.pagamentos_assinatura (assinatura_id);

-- RLS ligado e nenhuma política: o app não enxerga esta tabela.
alter table public.pagamentos_assinatura enable row level security;

-- ----------------------------------------------------------------------------
-- Permissões
-- ----------------------------------------------------------------------------
revoke all on table public.assinaturas, public.pagamentos_assinatura from public, anon, authenticated;
grant select (id, plano, valor, status, criado_em, atualizado_em) on table public.assinaturas to authenticated;

grant select, insert, update, delete on table public.assinaturas to service_role;
grant select, insert on table public.pagamentos_assinatura to service_role;

-- ----------------------------------------------------------------------------
-- Confirma uma cobrança recorrente aprovada (chamada só pelo servidor).
-- Idempotente: só o primeiro aviso de cada fatura muda algo.
-- Marca a mensalidade em aberto mais antiga como paga (se houver) e libera
-- 1 mês (mensal) ou 12 (anual), igual a confirmar_pagamento_pix().
-- ----------------------------------------------------------------------------
create or replace function public.confirmar_pagamento_assinatura(
  p_fatura_id text,
  p_assinatura_id uuid,
  p_pagamento_id text,
  p_valor numeric
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_ass  public.assinaturas;
begin
  select * into v_ass from public.assinaturas where id = p_assinatura_id;
  if not found then
    return false;
  end if;

  insert into public.pagamentos_assinatura (id, assinatura_id, mp_pagamento_id, valor)
  values (p_fatura_id, p_assinatura_id, p_pagamento_id, p_valor)
  on conflict (id) do nothing;

  if not found then
    return false;
  end if;

  update public.cobrancas
     set pago_em = v_hoje
   where id = (
     select c.id from public.cobrancas c
      where c.usuario_id = v_ass.usuario_id and c.pago_em is null
      order by c.vencimento
      limit 1
   );

  update public.perfis
     set acesso_ate = (greatest(acesso_ate, v_hoje)
                       + make_interval(months => case when v_ass.plano = 'anual' then 12 else 1 end))::date
   where id = v_ass.usuario_id;

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_assinatura(text, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_assinatura(text, uuid, text, numeric) to service_role;
