// PontoFit — código comum do pagamento no cartão (Checkout Pro do Mercado Pago).
// A compra (tabela pagamentos_cartao) é criada antes da preferência; o id dela
// vai como external_reference e liga o pagamento do Mercado Pago à compra.
'use strict';

const { supabaseAdmin, mercadoPago, cpfDoPagador } = require('./pix');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere um pagamento do Mercado Pago e, se aprovado com o valor certo,
 * confirma a compra e estende o acesso. Nunca confia em dados do navegador
 * nem do corpo do aviso: tudo vem da API com o nosso Access Token.
 * → status da compra ('approved', 'pending', 'rejected'...) ou null se o
 *   pagamento não for de uma compra do PontoFit.
 */
async function conferirPagamento(mp) {
  const ref = String(mp.external_reference || '');
  if (!UUID.test(ref)) return null;

  const db = supabaseAdmin();
  const { data: compra, error } = await db.from('pagamentos_cartao')
    .select('id, valor, status, aprovado_em').eq('id', ref).maybeSingle();
  if (error) throw error;
  if (!compra) return null;
  if (compra.aprovado_em) return 'approved';

  const valorOk = mp.currency_id === 'BRL' && Number(mp.transaction_amount) >= Number(compra.valor);
  if (mp.status === 'approved' && valorOk) {
    const { error: e } = await db.rpc('confirmar_pagamento_cartao', { p_compra_id: compra.id, p_pagamento_id: String(mp.id), p_cpf_pagador: cpfDoPagador(mp) });
    if (e) throw e;
    return 'approved';
  }

  const status = mp.status === 'approved' ? 'valor_divergente' : (mp.status || compra.status);
  if (status !== compra.status) await db.from('pagamentos_cartao').update({ status }).eq('id', compra.id);
  return status;
}

/** Pagamento pelo id (aviso do webhook). */
async function sincronizarPorPagamento(pagamentoId) {
  return conferirPagamento(await mercadoPago('/v1/payments/' + encodeURIComponent(pagamentoId)));
}

/** Procura os pagamentos de uma compra (volta do Checkout Pro). → status */
async function sincronizarCompra(compraId) {
  const busca = await mercadoPago('/v1/payments/search?sort=date_created&criteria=desc&external_reference=' + encodeURIComponent(compraId));
  const pagamentos = (busca && busca.results) || [];
  let status = null;
  for (const mp of pagamentos) {
    const s = await conferirPagamento(mp);
    if (s === 'approved') return 'approved';
    status = status || s;
  }
  return status;
}

module.exports = { UUID, sincronizarPorPagamento, sincronizarCompra };
