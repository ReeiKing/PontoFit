// PontoFit — código comum da assinatura no cartão (Mercado Pago).
// Modelo: assinatura sem plano, com pagamento pendente. O servidor cria a
// assinatura e a pessoa informa o cartão na página do Mercado Pago
// (init_point). Usa as mesmas variáveis de ambiente do Pix (_lib/pix.js).
'use strict';

const { supabaseAdmin, mercadoPago } = require('./pix');

// Oferta de cada plano, decidida aqui, nunca pelo navegador.
// Mude o preço aqui, em PLANOS (_lib/pix.js) e em js/plano.js.
const SUBSCRIPTION_OFFERS = {
  mensal: { reason: 'PontoFit - Plano Mensal', frequency: 1, frequencyType: 'months', amount: 20, currency: 'BRL' },
  anual: { reason: 'PontoFit - Plano Anual', frequency: 12, frequencyType: 'months', amount: 199.99, currency: 'BRL' }
};

// Status de assinatura no Mercado Pago que o PontoFit conhece.
// O Mercado Pago escreve 'cancelled' (com dois L), não 'canceled': PUT com 'canceled' é recusado.
const STATUS = ['pending', 'authorized', 'paused', 'cancelled'];
// Assinatura "viva": ainda pode gerar cobranças.
const VIVOS = ['pending', 'authorized', 'paused'];

function hojeSP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
}

/**
 * Busca a assinatura no Mercado Pago e grava o status no banco.
 * → linha atualizada de "assinaturas" ou null se não for do PontoFit.
 */
async function sincronizarAssinatura(mpId) {
  const db = supabaseAdmin();
  const { data: linha, error } = await db.from('assinaturas').select('*').eq('mp_id', String(mpId)).maybeSingle();
  if (error) throw error;
  if (!linha) return null;

  const mp = await mercadoPago('/preapproval/' + encodeURIComponent(linha.mp_id));
  if (mp.external_reference && mp.external_reference !== linha.id) return null;
  if (!STATUS.includes(mp.status) || mp.status === linha.status) return linha;

  const { data: nova, error: e } = await db.from('assinaturas')
    .update({ status: mp.status, atualizado_em: new Date().toISOString() })
    .eq('id', linha.id).select('*').single();
  if (e) throw e;
  return nova;
}

/** O que o app pode ver de uma assinatura. */
function saida(linha) {
  return { id: linha.id, plano: linha.plano, valor: Number(linha.valor), status: linha.status };
}

module.exports = { SUBSCRIPTION_OFFERS, STATUS, VIVOS, hojeSP, sincronizarAssinatura, saida };
