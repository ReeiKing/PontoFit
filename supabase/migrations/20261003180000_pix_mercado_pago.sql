-- ============================================================================
-- PontoFit — mensalidade por Pix (Mercado Pago) e bloqueio de acesso
--
-- Quem decide o acesso agora é o servidor:
--   perfis.acesso_ate   até quando a pessoa pode usar o app. Só o servidor
--                       altera (o app não tem permissão de UPDATE nela).
--   pagamentos_pix      cada Pix gerado no Mercado Pago. Só o servidor
--                       (service_role, nas funções /api da Vercel) lê e grava.
--   cobrancas.pago_em   deixa de ser editável pelo app: só um Pix aprovado
--                       marca uma mensalidade como paga.
--
-- Bloqueio: políticas RESTRITIVAS nas tabelas de dados exigem acesso ativo
-- (acesso_ate + tolerância). Perfil e mensalidades continuam visíveis para
-- que a pessoa bloqueada consiga pagar.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run
-- (depois da migração inicial).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Acesso: começa igual ao fim do teste grátis
-- ----------------------------------------------------------------------------
alter table public.perfis
  add column acesso_ate date not null default (current_date + 30);

update public.perfis set acesso_ate = teste_gratis_ate;

-- ----------------------------------------------------------------------------
-- Pix gerados no Mercado Pago (id = id do pagamento no Mercado Pago)
-- ----------------------------------------------------------------------------
create table public.pagamentos_pix (
  id              text primary key,
  usuario_id      uuid not null references auth.users (id) on delete cascade,
  cobranca_id     uuid references public.cobrancas (id) on delete set null,
  plano           text not null check (plano in ('mensal', 'anual')),
  valor           numeric(8,2) not null check (valor > 0),
  status          text not null default 'pending',
  qr_code         text not null,
  qr_code_base64  text not null,
  expira_em       timestamptz not null,
  aprovado_em     timestamptz,
  criado_em       timestamptz not null default now()
);
create index pagamentos_pix_usuario_idx on public.pagamentos_pix (usuario_id);
create index pagamentos_pix_cobranca_idx on public.pagamentos_pix (cobranca_id);

-- RLS ligado e nenhuma política: o app não enxerga esta tabela.
alter table public.pagamentos_pix enable row level security;

-- ----------------------------------------------------------------------------
-- Permissões
-- ----------------------------------------------------------------------------
revoke all on table public.pagamentos_pix from public, anon, authenticated;

-- Mensalidades: o app cria as próximas e troca plano/valor das em aberto,
-- mas não marca pagamento nem apaga.
revoke insert, update, delete on table public.cobrancas from authenticated;
grant insert (id, usuario_id, numero, offset_meses, vencimento, plano, valor)
  on table public.cobrancas to authenticated;
grant update (plano, valor) on table public.cobrancas to authenticated;

-- Funções da Vercel (chave secreta). Explícito porque tabelas novas não
-- recebem grants automáticos.
grant select, update on table public.perfis to service_role;
grant select, update on table public.cobrancas to service_role;
grant select, insert, update on table public.pagamentos_pix to service_role;

-- ----------------------------------------------------------------------------
-- Acesso ativo? (usada pelas políticas de bloqueio)
-- Tolerância de 3 dias depois do fim do período pago. Mude aqui e em
-- TOLERANCIA_DIAS (js/plano.js) se quiser outro prazo.
-- SECURITY INVOKER: a pessoa já pode ler o próprio perfil pela RLS.
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
      and p.acesso_ate + 3 >= (now() at time zone 'America/Sao_Paulo')::date
  );
$$;
revoke execute on function private.acesso_ativo() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.acesso_ativo() to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['fichas', 'registros_peso', 'medicamentos', 'nomes_medicamentos', 'aplicacoes', 'cesta_itens']
  loop
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using ((select private.acesso_ativo())) with check ((select private.acesso_ativo()))',
      t || '_exige_acesso_ativo', t);
  end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- Confirma um Pix aprovado (chamada só pelo servidor, via rpc).
-- Idempotente: o Mercado Pago pode avisar o mesmo pagamento várias vezes;
-- só a primeira muda algo.
-- Libera 1 mês (mensal) ou 12 (anual) a partir do fim do acesso atual, ou
-- de hoje se o acesso já tinha acabado (reativação).
-- ----------------------------------------------------------------------------
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

  update public.cobrancas
     set pago_em = v_hoje
   where id = v_pg.cobranca_id and pago_em is null;

  update public.perfis
     set acesso_ate = (greatest(acesso_ate, v_hoje)
                       + make_interval(months => case when v_pg.plano = 'anual' then 12 else 1 end))::date
   where id = v_pg.usuario_id;

  return true;
end;
$$;
revoke execute on function public.confirmar_pagamento_pix(text) from public, anon, authenticated;
grant execute on function public.confirmar_pagamento_pix(text) to service_role;
