-- ============================================================================
-- PontoFit — correção: confirmação de pagamentos falhava no servidor
--
-- confirmar_pagamento_pix() e confirmar_pagamento_cartao() usam
-- private.duracao_plano(), e o UPDATE em perfis avalia a restrição que chama
-- private.cpf_valido(). O papel service_role (funções /api na Vercel) não
-- tinha USAGE no esquema private: "permission denied for schema private".
-- Resultado: o Mercado Pago aprovava, mas o acesso não era liberado.
-- ============================================================================

grant usage on schema private to service_role;
grant execute on function private.duracao_plano(text) to service_role;
grant execute on function private.cpf_valido(text) to service_role;
