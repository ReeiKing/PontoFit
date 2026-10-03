-- ============================================================================
-- PontoFit — status de assinatura cancelada usa a grafia do Mercado Pago
--
-- A API de assinaturas (/preapproval) usa 'cancelled' (com dois L). A
-- migração anterior aceitava 'canceled', e o Mercado Pago recusa um PUT com
-- essa grafia. Nenhuma linha usava 'canceled' ainda; o update é só garantia.
-- ============================================================================

alter table public.assinaturas drop constraint assinaturas_status_check;

update public.assinaturas set status = 'cancelled' where status = 'canceled';

alter table public.assinaturas add constraint assinaturas_status_check
  check (status in ('pending', 'authorized', 'paused', 'cancelled'));
