-- ============================================================================
-- PontoFit — correção: desconto_disponivel() falhava para clientes logados
--
-- A função (security invoker) filtra pagamentos_pix e pagamentos_cartao por
-- usuario_id, mas o papel authenticated só tinha SELECT em algumas colunas.
-- Resultado: "permission denied for table pagamentos_pix" e a seção
-- Assinaturas mostrava "Sua sessão expirou". A RLS continua limitando as
-- linhas às da própria pessoa.
-- ============================================================================

grant select (usuario_id) on table public.pagamentos_pix to authenticated;
grant select (usuario_id) on table public.pagamentos_cartao to authenticated;
