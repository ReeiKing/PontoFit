// POST /api/pix/webhook — o Mercado Pago avisa aqui quando um pagamento muda.
//
// Segurança: o aviso só traz o id do pagamento. Nada é liberado com base no
// corpo da requisição: sincronizarPagamento() consulta o pagamento na API do
// Mercado Pago com o nosso Access Token e confere status e valor. Um aviso
// falso, no máximo, faz o servidor consultar um pagamento à toa.
'use strict';

const { sincronizarPagamento, responder } = require('../_lib/pix');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  const q = req.query || {};
  const corpo = req.body || {};
  const tipo = corpo.type || q.type || q.topic;
  const id = (corpo.data && corpo.data.id) || q['data.id'] || q.id;

  // Outros tipos de aviso (merchant_order, etc.) não interessam: responde 200.
  if (tipo !== 'payment' || !/^\d{1,20}$/.test(String(id || ''))) {
    return responder(res, 200, { ok: true, ignorado: true });
  }

  try {
    const status = await sincronizarPagamento(id);
    return responder(res, 200, { ok: true, status });
  } catch (err) {
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    console.error('[pix/webhook]', id, err);
    return responder(res, 500, { ok: false });
  }
};
