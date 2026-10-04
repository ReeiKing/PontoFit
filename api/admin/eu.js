// GET /api/admin/eu — a pessoa logada é administradora?
// O app usa para mostrar o link "Administração" no menu.
// → { admin: true | false }
'use strict';

const { usuarioDaRequisicao, responder } = require('../_lib/pix');
const { ehAdmin } = require('../_lib/admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return responder(res, 405, { erro: 'Use GET.' });
  try {
    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });
    return responder(res, 200, { admin: ehAdmin(usuario) });
  } catch (err) {
    console.error('[admin/eu]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível verificar agora.' });
  }
};
