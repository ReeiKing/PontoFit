// POST /api/pix/criar  { cobrancaId }
// Gera (ou reaproveita) o Pix de uma mensalidade em aberto da pessoa logada.
// → { id, valor, qrCode, qrCodeBase64, expiraEm }
'use strict';

const { randomUUID } = require('node:crypto');
const { PLANOS, supabaseAdmin, urlDoSite, mercadoPago, usuarioDaRequisicao, responder } = require('../_lib/pix');

const VALIDADE_MIN = 60; // o Mercado Pago aceita de 30 min a 30 dias
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function saida(pg) {
  return { id: pg.id, valor: Number(pg.valor), qrCode: pg.qr_code, qrCodeBase64: pg.qr_code_base64, expiraEm: pg.expira_em };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const cobrancaId = req.body && req.body.cobrancaId;
    if (!UUID.test(String(cobrancaId || ''))) return responder(res, 400, { erro: 'Mensalidade inválida.' });

    const db = supabaseAdmin();
    const { data: c, error } = await db.from('cobrancas')
      .select('id, usuario_id, numero, plano, pago_em').eq('id', cobrancaId).maybeSingle();
    if (error) throw error;
    if (!c || c.usuario_id !== usuario.id) return responder(res, 404, { erro: 'Mensalidade não encontrada.' });
    if (c.pago_em) return responder(res, 409, { erro: 'Esta mensalidade já está paga.' });

    // Já existe um Pix válido para ela? Reaproveita (evita QR duplicado).
    const margem = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: existente } = await db.from('pagamentos_pix').select('*')
      .eq('cobranca_id', c.id).eq('status', 'pending').gt('expira_em', margem)
      .order('criado_em', { ascending: false }).limit(1).maybeSingle();
    if (existente) return responder(res, 200, saida(existente));

    const plano = PLANOS[c.plano];
    const expira = new Date(Date.now() + VALIDADE_MIN * 60 * 1000);
    const mp = await mercadoPago('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': randomUUID() },
      body: {
        transaction_amount: plano.valor,
        description: 'PontoFit - ' + plano.item + ' ' + c.numero,
        payment_method_id: 'pix',
        payer: { email: usuario.email },
        external_reference: c.id,
        notification_url: urlDoSite() + '/api/pix/webhook',
        date_of_expiration: expira.toISOString().replace(/\.\d{3}Z$/, '.000Z')
      }
    });

    const dadosPix = mp.point_of_interaction && mp.point_of_interaction.transaction_data;
    if (!dadosPix || !dadosPix.qr_code) throw new Error('Mercado Pago não devolveu o QR Code (a conta tem chave Pix cadastrada?).');

    const linha = {
      id: String(mp.id),
      usuario_id: usuario.id,
      cobranca_id: c.id,
      plano: c.plano,
      valor: plano.valor,
      status: mp.status || 'pending',
      qr_code: dadosPix.qr_code,
      qr_code_base64: dadosPix.qr_code_base64,
      expira_em: mp.date_of_expiration || expira.toISOString()
    };
    const { error: e } = await db.from('pagamentos_pix').insert(linha);
    if (e) throw e;

    return responder(res, 201, saida(linha));
  } catch (err) {
    console.error('[pix/criar]', err);
    return responder(res, 500, { erro: 'Não foi possível gerar o Pix agora. Tente de novo em instantes.' });
  }
};
