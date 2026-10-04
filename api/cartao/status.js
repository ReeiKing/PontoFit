// GET /api/cartao/status?id=<id da compra>
// Chamado na volta do Checkout Pro. Procura o pagamento da compra no Mercado
// Pago e, se aprovado, libera o acesso na hora (sem esperar o webhook).
// → { status: 'approved' | 'pending' | 'in_process' | 'rejected' | ... }
'use strict';

const { supabaseAdmin, usuarioDaRequisicao, responder } = require('../_lib/pix');
const { UUID, sincronizarCompra } = require('../_lib/cartao');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return responder(res, 405, { erro: 'Use GET.' });

  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    const id = String((req.query && req.query.id) || '');
    if (!UUID.test(id)) return responder(res, 400, { erro: 'Pagamento inválido.' });

    const { data: compra, error } = await supabaseAdmin().from('pagamentos_cartao')
      .select('usuario_id, status, aprovado_em').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!compra || compra.usuario_id !== usuario.id) return responder(res, 404, { erro: 'Pagamento não encontrado.' });
    if (compra.aprovado_em) return responder(res, 200, { status: 'approved' });

    const status = (await sincronizarCompra(id)) || compra.status;
    return responder(res, 200, { status });
  } catch (err) {
    console.error('[cartao/status]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível consultar o pagamento.' });
  }
};
