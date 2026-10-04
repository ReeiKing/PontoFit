// POST /api/admin/liberar  { usuarioId, dias (1 a 365), motivo }
// Soma dias de acesso a um assinante (só administradores). A liberação fica
// registrada em admin_liberacoes com quem liberou e o acesso antes e depois.
// → { acessoAte }
'use strict';

const { supabaseAdmin, responder } = require('../_lib/pix');
const { exigirAdmin } = require('../_lib/admin');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });

  try {
    const admin = await exigirAdmin(req);
    if (!admin) return responder(res, 403, { erro: 'Acesso restrito à administração.' });

    const corpo = req.body || {};
    const usuarioId = String(corpo.usuarioId || '');
    const dias = Number(corpo.dias);
    const motivo = String(corpo.motivo || '').trim();
    if (!UUID.test(usuarioId)) return responder(res, 400, { erro: 'Assinante inválido.' });
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return responder(res, 400, { erro: 'Escolha de 1 a 365 dias.' });
    if (motivo.length < 3 || motivo.length > 200) return responder(res, 400, { erro: 'Escreva o motivo (de 3 a 200 caracteres).' });

    const { data, error } = await supabaseAdmin().rpc('liberar_dias_admin', {
      p_usuario: usuarioId, p_dias: dias, p_admin: admin.id, p_motivo: motivo
    });
    if (error) {
      if (error.code === 'P0002') return responder(res, 404, { erro: 'Assinante não encontrado.' });
      throw error;
    }
    return responder(res, 200, { acessoAte: data });
  } catch (err) {
    console.error('[admin/liberar]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível liberar os dias agora.' });
  }
};
