// POST /api/subscriptions/webhook — o Mercado Pago avisa aqui quando uma
// assinatura muda ou quando uma cobrança recorrente é processada.
// Tópicos: subscription_preapproval e subscription_authorized_payment.
//
// Segurança, em duas camadas:
//   1. A assinatura do aviso (x-signature, HMAC-SHA256 com MP_WEBHOOK_SECRET)
//      é conferida antes de tudo. Sem ela: 401.
//   2. Igual ao Pix, nada é liberado com base no corpo do aviso. O servidor
//      consulta a assinatura, a fatura e o pagamento na API do Mercado Pago e
//      confere status, moeda e valor.
//
// O processamento acontece antes da resposta (não depois do 200): na Vercel a
// função pode ser congelada assim que responde. São poucas consultas rápidas,
// e um 500 faz o Mercado Pago reenviar. Reenvios são seguros: a confirmação é
// idempotente por fatura (tabela pagamentos_assinatura).
'use strict';

const { supabaseAdmin, mercadoPago, responder } = require('../_lib/pix');
const { sincronizarAssinatura } = require('../_lib/assinatura');
const { conferirAssinatura } = require('../_lib/webhook');

/** Cobrança recorrente: se o pagamento foi aprovado, estende o acesso. */
async function processarFatura(faturaId) {
  const fatura = await mercadoPago('/authorized_payments/' + encodeURIComponent(faturaId));
  if (!fatura.preapproval_id || !fatura.payment || !fatura.payment.id) return 'sem_pagamento';

  const db = supabaseAdmin();
  const { data: ass, error } = await db.from('assinaturas').select('id, valor')
    .eq('mp_id', String(fatura.preapproval_id)).maybeSingle();
  if (error) throw error;
  if (!ass) return 'ignorado'; // assinatura que não foi criada pelo PontoFit

  const pg = await mercadoPago('/v1/payments/' + encodeURIComponent(fatura.payment.id));
  const aprovado = pg.status === 'approved' && pg.currency_id === 'BRL' &&
    Number(pg.transaction_amount) >= Number(ass.valor);
  if (!aprovado) return pg.status || 'pendente';

  const { error: e } = await db.rpc('confirmar_pagamento_assinatura', {
    p_fatura_id: String(fatura.id),
    p_assinatura_id: ass.id,
    p_pagamento_id: String(pg.id),
    p_valor: Number(pg.transaction_amount)
  });
  if (e) throw e;
  return 'approved';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  const assinatura = conferirAssinatura(req);
  if (assinatura === 'sem_segredo') {
    // 500: o Mercado Pago reenvia, e os avisos são processados quando a variável existir.
    console.error('[subscriptions/webhook] MP_WEBHOOK_SECRET não configurada; aviso recusado.');
    return responder(res, 500, { ok: false });
  }
  if (assinatura !== 'ok') return responder(res, 401, { ok: false });

  const q = req.query || {};
  const corpo = req.body || {};
  const tipo = corpo.type || q.type;
  const id = String(q['data.id'] || (corpo.data && corpo.data.id) || '');

  if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) return responder(res, 200, { ok: true, ignorado: true });

  try {
    if (tipo === 'subscription_preapproval') {
      const linha = await sincronizarAssinatura(id);
      return responder(res, 200, { ok: true, status: linha ? linha.status : 'ignorado' });
    }
    if (tipo === 'subscription_authorized_payment') {
      return responder(res, 200, { ok: true, status: await processarFatura(id) });
    }
    return responder(res, 200, { ok: true, ignorado: true });
  } catch (err) {
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    console.error('[subscriptions/webhook]', tipo, id, err.message || err);
    return responder(res, 500, { ok: false });
  }
};
