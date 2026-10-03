// GET /api/pix/status?id=<id do pagamento>
// A tela do QR pergunta aqui a cada poucos segundos. Além de ler o banco,
// consulta o Mercado Pago: se o webhook atrasar, o acesso libera mesmo assim.
// → { status: 'approved' | 'pending' | 'expired' | ... }
'use strict';

const { supabaseAdmin, usuarioDaRequisicao, sincronizarPagamento, responder } = require('../_lib/pix');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return responder(res, 405, { erro: 'Use GET.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const id = String((req.query && req.query.id) || '');
    if (!/^\d{1,20}$/.test(id)) return responder(res, 400, { erro: 'Pagamento inválido.' });

    const { data: pg, error } = await supabaseAdmin().from('pagamentos_pix')
      .select('usuario_id, status, expira_em').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!pg || pg.usuario_id !== usuario.id) return responder(res, 404, { erro: 'Pagamento não encontrado.' });

    let status = pg.status;
    if (status === 'pending') status = (await sincronizarPagamento(id)) || status;
    if (status === 'pending' && new Date(pg.expira_em) < new Date()) status = 'expired';

    return responder(res, 200, { status });
  } catch (err) {
    console.error('[pix/status]', err);
    return responder(res, 500, { erro: 'Não foi possível consultar o pagamento.' });
  }
};
