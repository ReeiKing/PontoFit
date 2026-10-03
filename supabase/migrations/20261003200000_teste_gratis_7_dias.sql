-- ============================================================================
-- PontoFit — teste grátis passa de 30 para 7 dias
--
-- Vale só para contas criadas depois desta migração: quem já se cadastrou
-- mantém o teste_gratis_ate e o acesso_ate que já tem.
-- O texto do site (index.html, login.html) e o valor reserva em
-- js/storage.js (getAssinatura) também usam 7 dias.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run
-- (depois da migração da assinatura no cartão).
-- ============================================================================

alter table public.perfis
  alter column teste_gratis_ate set default (current_date + 7),
  alter column acesso_ate set default (current_date + 7);
