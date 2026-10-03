// POST /api/subscriptions
// Cria (ou reaproveita) a assinatura no cartão da pessoa logada, no plano do
// perfil dela. O corpo da requisição é ignorado: preço, frequência e data da
// primeira cobrança saem de SUBSCRIPTION_OFFERS e do perfil, no servidor.
// → { id, plano, valor, status, initPoint }  (o app redireciona para initPoint)
'use strict';

const { supabaseAdmin, urlDoSite, mercadoPago, usuarioDaRequisicao, responder } = require('../_lib/pix');
const { SUBSCRIPTION_OFFERS, VIVOS, hojeSP, saida } = require('../_lib/assinatura');

/** Meio-dia em São Paulo do dia informado, no formato que o Mercado Pago aceita. */
function inicioCobranca(dia) {
  return new Date(dia + 'T12:00:00-03:00').toISOString();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const db = supabaseAdmin();
    const { data: perfil, error } = await db.from('perfis')
      .select('plano, teste_gratis_ate, acesso_ate').eq('id', usuario.id).maybeSingle();
    if (error) throw error;
    if (!perfil) return responder(res, 404, { erro: 'Perfil não encontrado.' });

    const plano = perfil.plano === 'anual' ? 'anual' : 'mensal';
    const trustedOffer = SUBSCRIPTION_OFFERS[plano];

    // Já tem uma assinatura viva?
    const { data: atual } = await db.from('assinaturas').select('*')
      .eq('usuario_id', usuario.id).in('status', VIVOS).maybeSingle();
    if (atual) {
      if (atual.status !== 'pending') {
        return responder(res, 409, { erro: 'Você já tem o pagamento automático no cartão.' });
      }
      if (atual.plano === plano && atual.init_point) {
        return responder(res, 200, Object.assign(saida(atual), { initPoint: atual.init_point }));
      }
      if (!atual.mp_id) return responder(res, 409, { erro: 'Já estamos preparando sua assinatura. Tente de novo em instantes.' });
      // Pendente de outro plano: cancela e cria uma nova no plano atual.
      await mercadoPago('/preapproval/' + encodeURIComponent(atual.mp_id), { method: 'PUT', body: { status: 'canceled' } });
      await db.from('assinaturas').update({ status: 'canceled', atualizado_em: new Date().toISOString() }).eq('id', atual.id);
    }

    // Reserva a linha antes de chamar o Mercado Pago: o id vira o
    // external_reference, e o índice único barra uma segunda assinatura.
    const { data: linha, error: eIns } = await db.from('assinaturas')
      .insert({ usuario_id: usuario.id, plano, valor: trustedOffer.amount, status: 'pending' })
      .select('*').single();
    if (eIns) {
      if (eIns.code === '23505') return responder(res, 409, { erro: 'Já estamos preparando sua assinatura. Tente de novo em instantes.' });
      throw eIns;
    }

    // Primeira cobrança no fim do teste grátis ou do período já pago (Pix).
    // Se já acabou, o Mercado Pago cobra logo após a confirmação do cartão.
    const fimPago = [perfil.teste_gratis_ate, perfil.acesso_ate].filter(Boolean).sort().pop();
    const autoRecurring = {
      frequency: trustedOffer.frequency,
      frequency_type: trustedOffer.frequencyType,
      transaction_amount: trustedOffer.amount,
      currency_id: trustedOffer.currency
    };
    if (fimPago && fimPago > hojeSP()) autoRecurring.start_date = inicioCobranca(fimPago);

    const token = (process.env.MP_ACCESS_TOKEN || '').trim();
    if (!token) throw new Error('Variável de ambiente ausente: MP_ACCESS_TOKEN');
    const backUrl = urlDoSite() + '/app.html?assinatura=retorno#plano';
    const r = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: trustedOffer.reason,
        external_reference: linha.id,
        payer_email: usuario.email,
        auto_recurring: autoRecurring,
        back_url: backUrl,
        status: 'pending'
      })
    });
    const mp = await r.json().catch(() => ({}));

    if (!r.ok || !mp.id || !mp.init_point) {
      await db.from('assinaturas').delete().eq('id', linha.id);
      console.error('[subscriptions/criar] Mercado Pago', r.status, mp.message || mp.error || '');
      return responder(res, 502, { erro: 'O Mercado Pago não aceitou a assinatura agora. Tente de novo em alguns minutos.' });
    }

    const { data: salva, error: eUpd } = await db.from('assinaturas')
      .update({ mp_id: String(mp.id), init_point: mp.init_point, atualizado_em: new Date().toISOString() })
      .eq('id', linha.id).select('*').single();
    if (eUpd) throw eUpd;

    return responder(res, 201, Object.assign(saida(salva), { initPoint: salva.init_point }));
  } catch (err) {
    console.error('[subscriptions/criar]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível iniciar a assinatura agora. Tente de novo em instantes.' });
  }
};
