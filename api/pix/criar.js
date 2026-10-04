// POST /api/pix/criar  { plano: 'semanal' | 'mensal' | 'semestral' }
// Gera (ou reaproveita) o Pix de um plano para a pessoa logada.
// O valor sai de PLANOS (servidor), nunca do navegador.
// → { id, plano, valor, qrCode, qrCodeBase64, expiraEm }
'use strict';

const { randomUUID } = require('node:crypto');
const { PLANOS, supabaseAdmin, urlDoSite, mercadoPago, usuarioDaRequisicao, responder } = require('../_lib/pix');

const VALIDADE_MIN = 60; // o Mercado Pago aceita de 30 min a 30 dias

function saida(pg) {
  return { id: pg.id, plano: pg.plano, valor: Number(pg.valor), qrCode: pg.qr_code, qrCodeBase64: pg.qr_code_base64, expiraEm: pg.expira_em };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const planoId = req.body && req.body.plano;
    const plano = Object.prototype.hasOwnProperty.call(PLANOS, planoId) ? PLANOS[planoId] : null;
    if (!plano) return responder(res, 400, { erro: 'Plano inválido.' });

    // Já existe um Pix válido deste plano? Reaproveita (evita QR duplicado).
    const db = supabaseAdmin();
    const margem = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: existente } = await db.from('pagamentos_pix').select('*')
      .eq('usuario_id', usuario.id).eq('plano', planoId).eq('status', 'pending').gt('expira_em', margem)
      .order('criado_em', { ascending: false }).limit(1).maybeSingle();
    if (existente) return responder(res, 200, saida(existente));

    const referencia = randomUUID();
    const expira = new Date(Date.now() + VALIDADE_MIN * 60 * 1000);
    const mp = await mercadoPago('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': referencia },
      body: {
        transaction_amount: plano.valor,
        description: 'PontoFit - ' + plano.item,
        payment_method_id: 'pix',
        payer: { email: usuario.email },
        external_reference: referencia,
        notification_url: urlDoSite() + '/api/pix/webhook',
        date_of_expiration: expira.toISOString().replace(/\.\d{3}Z$/, '.000Z')
      }
    });

    const dadosPix = mp.point_of_interaction && mp.point_of_interaction.transaction_data;
    if (!dadosPix || !dadosPix.qr_code) throw new Error('Mercado Pago não devolveu o QR Code (a conta tem chave Pix cadastrada?).');

    const linha = {
      id: String(mp.id),
      usuario_id: usuario.id,
      plano: planoId,
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
    console.error('[pix/criar]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível gerar o Pix agora. Tente de novo em instantes.' });
  }
};
