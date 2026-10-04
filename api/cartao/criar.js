// POST /api/cartao/criar  { plano: 'semanal' | 'mensal' | 'semestral' }
// Cria a preferência do Checkout Pro (Mercado Pago) para o plano escolhido.
// Valor e descrição saem de PLANOS (servidor), nunca do navegador.
// → { id, initPoint }  (o app redireciona para initPoint)
'use strict';

const { PLANOS, supabaseAdmin, urlDoSite, mercadoPago, usuarioDaRequisicao, responder } = require('../_lib/pix');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const planoId = req.body && req.body.plano;
    const plano = Object.prototype.hasOwnProperty.call(PLANOS, planoId) ? PLANOS[planoId] : null;
    if (!plano) return responder(res, 400, { erro: 'Plano inválido.' });

    // A compra nasce antes da preferência: o id dela é o external_reference.
    const db = supabaseAdmin();
    const { data: compra, error } = await db.from('pagamentos_cartao')
      .insert({ usuario_id: usuario.id, plano: planoId, valor: plano.valor })
      .select('id').single();
    if (error) throw error;

    const site = urlDoSite();
    // auto_return só com endereço público HTTPS: o Mercado Pago recusa localhost.
    const publicAppUrl = /^https:\/\//i.test(site) && !/^https:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::|\/|$)/i.test(site);
    const volta = site + '/app.html?pagamento=' + compra.id + '#plano';

    let preferencia;
    try {
      preferencia = await mercadoPago('/checkout/preferences', {
        method: 'POST',
        body: {
          items: [{ id: planoId, title: 'PontoFit - ' + plano.item, quantity: 1, unit_price: plano.valor, currency_id: 'BRL' }],
          payer: { email: usuario.email },
          external_reference: compra.id,
          back_urls: { success: volta, failure: volta, pending: volta },
          ...(publicAppUrl ? { auto_return: 'approved' } : {}),
          notification_url: site + '/api/cartao/webhook',
          statement_descriptor: 'PONTOFIT',
          // Cartão e saldo do Mercado Pago. Pix tem fluxo próprio no site e
          // boleto demoraria dias para liberar o acesso.
          payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }] }
        }
      });
    } catch (err) {
      await db.from('pagamentos_cartao').delete().eq('id', compra.id);
      throw err;
    }

    await db.from('pagamentos_cartao')
      .update({ preferencia_id: String(preferencia.id), init_point: preferencia.init_point }).eq('id', compra.id);

    // Sempre init_point: o Mercado Pago não tem mais ambiente sandbox.
    return responder(res, 201, { id: compra.id, initPoint: preferencia.init_point });
  } catch (err) {
    console.error('[cartao/criar]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível abrir o pagamento no cartão agora. Tente de novo em instantes.' });
  }
};
