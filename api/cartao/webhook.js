// POST /api/cartao/webhook — o Mercado Pago avisa aqui quando um pagamento do
// Checkout Pro muda (notification_url de cada preferência).
//
// Segurança: igual ao Pix, o aviso só traz o id do pagamento. Nada é liberado
// com base no corpo da requisição: o servidor busca o pagamento na API do
// Mercado Pago e confere compra, status, moeda e valor.
'use strict';

const { responder } = require('../_lib/pix');
const { sincronizarPorPagamento } = require('../_lib/cartao');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  const q = req.query || {};
  const corpo = req.body || {};
  const tipo = corpo.type || q.type || q.topic;
  const id = (corpo.data && corpo.data.id) || q['data.id'] || q.id;

  // Outros avisos (merchant_order etc.) não interessam: responde 200.
  if (tipo !== 'payment' || !/^\d{1,20}$/.test(String(id || ''))) {
    return responder(res, 200, { ok: true, ignorado: true });
  }

  try {
    const status = await sincronizarPorPagamento(id);
    return responder(res, 200, { ok: true, status: status || 'ignorado' });
  } catch (err) {
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    console.error('[cartao/webhook]', id, err.message || err);
    return responder(res, 500, { ok: false });
  }
};
