// /api/vinculos — convite de profissional e autorizações do paciente.
//
// GET  ?convite=CODIGO          (público) quem é o profissional do convite
// GET                            (paciente) profissionais que me acompanham
// POST { acao: 'aceitar',   codigo, compartilha: { peso, agua, medicamentos, ficha, gestacao } }
// POST { acao: 'atualizar', id, compartilha }
// POST { acao: 'revogar',   id }
//
// O paciente é sempre quem autoriza: o profissional nunca cria vínculo sozinho.
'use strict';

const { supabaseAdmin, usuarioDaRequisicao, responder } = require('./_lib/pix');
const { CODIGO, UUID, ErroUsuario, dados, profissionalPublico, compartilhaDe, colunasCompartilha } = require('./_lib/prof');

function codigoDe(v) { return String(v || '').trim().toUpperCase(); }

module.exports = async function handler(req, res) {
  try {
    const db = supabaseAdmin();

    // Convite público: só nome, profissão, registro e empresa do profissional.
    if (req.method === 'GET' && req.query && req.query.convite != null) {
      const codigo = codigoDe(req.query.convite);
      if (!CODIGO.test(codigo)) return responder(res, 404, { erro: 'Convite não encontrado.' });
      const prof = await dados(db.from('profissionais').select('nome, profissao, registro, empresa').eq('codigo', codigo).maybeSingle());
      if (!prof) return responder(res, 404, { erro: 'Convite não encontrado. Peça um link novo ao profissional.' });
      return responder(res, 200, profissionalPublico(prof));
    }

    const usuario = await usuarioDaRequisicao(req);
    if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });

    async function lista() {
      const vinc = await dados(db.from('vinculos').select('*').eq('paciente_id', usuario.id).eq('status', 'ativo').order('criado_em', { ascending: true }));
      if (!vinc.length) return [];
      const profs = await dados(db.from('profissionais').select('usuario_id, nome, profissao, registro, empresa').in('usuario_id', vinc.map(function (v) { return v.profissional_id; })));
      return vinc.map(function (v) {
        const p = profs.find(function (x) { return x.usuario_id === v.profissional_id; }) || { nome: 'Profissional', profissao: 'outro' };
        return Object.assign({ id: v.id, desde: v.criado_em, compartilha: compartilhaDe(v) }, profissionalPublico(p));
      });
    }

    if (req.method === 'GET') return responder(res, 200, { profissionais: await lista() });
    if (req.method !== 'POST') return responder(res, 405, { erro: 'Use GET ou POST.' });

    const corpo = req.body || {};
    const agora = new Date().toISOString();

    if (corpo.acao === 'aceitar') {
      const codigo = codigoDe(corpo.codigo);
      if (!CODIGO.test(codigo)) throw new ErroUsuario(400, 'Convite inválido.');
      const prof = await dados(db.from('profissionais').select('usuario_id, nome').eq('codigo', codigo).maybeSingle());
      if (!prof) throw new ErroUsuario(404, 'Convite não encontrado. Peça um link novo ao profissional.');
      if (prof.usuario_id === usuario.id) throw new ErroUsuario(400, 'Esse é o seu próprio convite. Envie o link para os seus pacientes.');

      const existente = await dados(db.from('vinculos').select('id').eq('profissional_id', prof.usuario_id).eq('paciente_id', usuario.id).eq('status', 'ativo').maybeSingle());
      const colunas = Object.assign(colunasCompartilha(corpo.compartilha || {}), { atualizado_em: agora });
      if (existente) {
        await dados(db.from('vinculos').update(colunas).eq('id', existente.id));
      } else {
        const r = await db.from('vinculos').insert(Object.assign({ profissional_id: prof.usuario_id, paciente_id: usuario.id }, colunas));
        if (r.error && r.error.code !== '23505') throw r.error;
      }
      return responder(res, 200, { ok: true, profissional: prof.nome, profissionais: await lista() });
    }

    if (corpo.acao === 'atualizar' || corpo.acao === 'revogar') {
      const id = String(corpo.id || '');
      if (!UUID.test(id)) throw new ErroUsuario(400, 'Autorização inválida.');
      const v = await dados(db.from('vinculos').select('id, paciente_id, status').eq('id', id).maybeSingle());
      if (!v || v.paciente_id !== usuario.id || v.status !== 'ativo') throw new ErroUsuario(404, 'Autorização não encontrada.');
      const mudanca = corpo.acao === 'revogar'
        ? { status: 'revogado', revogado_em: agora, atualizado_em: agora }
        : Object.assign(colunasCompartilha(corpo.compartilha || {}), { atualizado_em: agora });
      await dados(db.from('vinculos').update(mudanca).eq('id', id));
      return responder(res, 200, { ok: true, profissionais: await lista() });
    }

    return responder(res, 400, { erro: 'Ação inválida.' });
  } catch (err) {
    if (err instanceof ErroUsuario) return responder(res, err.status, { erro: err.message });
    console.error('[vinculos]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
