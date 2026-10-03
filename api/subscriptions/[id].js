// GET  /api/subscriptions/:id   consulta a assinatura no Mercado Pago e
//                               atualiza o status no banco
// POST /api/subscriptions/:id   { acao: 'pause' | 'reactivate' | 'cancel' }
//
// :id é o id da assinatura no PontoFit (tabela assinaturas), nunca o do
// Mercado Pago. Só a dona da assinatura consulta ou altera.
// → { id, plano, valor, status }
'use strict';

const { supabaseAdmin, mercadoPago, usuarioDaRequisicao, responder } = require('../_lib/pix');
const { VIVOS, sincronizarAssinatura, saida } = require('../_lib/assinatura');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ação pedida → status no Mercado Pago, e de quais status ela pode partir.
const ACOES = {
  pause: { status: 'paused', de: ['authorized'] },
  reactivate: { status: 'authorized', de: ['paused'] },
  cancel: { status: 'cancelled', de: ['pending', 'authorized', 'paused'] }
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return responder(res, 405, { erro: 'Use GET ou POST.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const id = String((req.query && req.query.id) || '');
    if (!UUID.test(id)) return responder(res, 400, { erro: 'Assinatura inválida.' });

    const db = supabaseAdmin();
    const { data: linha, error } = await db.from('assinaturas').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!linha || linha.usuario_id !== usuario.id) return responder(res, 404, { erro: 'Assinatura não encontrada.' });

    if (req.method === 'GET') {
      const atual = linha.mp_id && VIVOS.includes(linha.status) ? (await sincronizarAssinatura(linha.mp_id)) || linha : linha;
      return responder(res, 200, saida(atual));
    }

    const acao = ACOES[req.body && req.body.acao];
    if (!acao) return responder(res, 400, { erro: 'Ação inválida.' });
    if (!linha.mp_id || !acao.de.includes(linha.status)) {
      return responder(res, 409, { erro: 'Não dá para fazer isso com a assinatura no estado atual. Atualize a página.' });
    }

    await mercadoPago('/preapproval/' + encodeURIComponent(linha.mp_id), { method: 'PUT', body: { status: acao.status } });
    const { data: nova, error: e } = await db.from('assinaturas')
      .update({ status: acao.status, atualizado_em: new Date().toISOString() })
      .eq('id', linha.id).select('*').single();
    if (e) throw e;

    return responder(res, 200, saida(nova));
  } catch (err) {
    console.error('[subscriptions/:id]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.' });
  }
};
