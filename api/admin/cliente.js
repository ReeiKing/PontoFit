// GET  /api/admin/cliente?id=<usuário>   dados do cliente para o painel "Gerenciar"
// POST /api/admin/cliente { id, acao, ... }
//   acao 'dados'           { nome?, email?, cpf? }
//   acao 'senha'           { senha, desconectar }
//   acao 'confirmar-email'
//   acao 'cortesia'        { dias (1 a 365), motivo }
//   acao 'acesso'          { data (AAAA-MM-DD), motivo }   data exata; ontem = encerrar
//   acao 'plano'           { plano }                       plano preferido
//   acao 'desconectar'                                      sai de todos os aparelhos
//   acao 'excluir'         { motivo, confirmacao }          confirmacao = e-mail do cliente
//     Apaga a conta e os dados pessoais e de saúde. Pagamentos e registros da
//     administração ficam sem vínculo (conta excluída); contas_excluidas guarda
//     quem excluiu, quando, o motivo e um resumo.
// Só administradores. Contas de administrador não podem ser alteradas aqui.
// Tudo fica registrado em admin_acoes (a senha nunca é gravada).
'use strict';

const { PLANOS, supabaseAdmin, responder } = require('../_lib/pix');
const { exigirAdmin, ehAdmin } = require('../_lib/admin');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function cpfValido(d) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const dv = function (n) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    return (soma * 10) % 11 % 10;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}
function mascararCpf(cpf) {
  return cpf && cpf.length === 11 ? '***.' + cpf.slice(3, 6) + '.' + cpf.slice(6, 9) + '-**' : null;
}

class ErroUsuario extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}

async function registrar(db, admin, usuarioId, acao, detalhes) {
  const { error } = await db.from('admin_acoes').insert({ admin_id: admin.id, usuario_id: usuarioId, acao, detalhes: detalhes || {} });
  if (error) throw error;
}

async function detalhes(db, id) {
  const [authRes, perfil, pix, cartao, liberacoes, acoes] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from('perfis').select('nome, email, cpf, plano, acesso_ate, criado_em').eq('id', id).maybeSingle(),
    db.from('pagamentos_pix').select('plano, valor, status, com_desconto, criado_em, aprovado_em').eq('usuario_id', id),
    db.from('pagamentos_cartao').select('plano, valor, status, com_desconto, criado_em, aprovado_em').eq('usuario_id', id),
    db.from('admin_liberacoes').select('dias, motivo, acesso_antes, acesso_depois, criado_em').eq('usuario_id', id),
    db.from('admin_acoes').select('acao, detalhes, criado_em').eq('usuario_id', id)
  ]);
  [perfil, pix, cartao, liberacoes, acoes].forEach(function (r) { if (r.error) throw r.error; });
  if (authRes.error || !authRes.data.user || !perfil.data) throw new ErroUsuario(404, 'Cliente não encontrado.');
  const u = authRes.data.user;
  const p = perfil.data;

  const pagamentos = pix.data.map(function (x) { return Object.assign({ meio: 'pix' }, x); })
    .concat(cartao.data.filter(function (c) { return c.status !== 'pending' || c.aprovado_em; }).map(function (x) { return Object.assign({ meio: 'cartao' }, x); }))
    .map(function (x) {
      return { quando: x.aprovado_em || x.criado_em, tipo: 'pagamento', meio: x.meio, plano: x.plano, valor: Number(x.valor), status: x.aprovado_em ? 'approved' : x.status, comDesconto: !!x.com_desconto };
    });
  const historico = pagamentos
    .concat(liberacoes.data.map(function (l) { return { quando: l.criado_em, tipo: 'liberacao', dias: l.dias, motivo: l.motivo, antes: l.acesso_antes, depois: l.acesso_depois }; }))
    .concat(acoes.data.map(function (a) { return { quando: a.criado_em, tipo: 'acao', acao: a.acao, detalhes: a.detalhes }; }))
    .sort(function (a, b) { return a.quando < b.quando ? 1 : -1; })
    .slice(0, 50);

  return {
    id: id,
    nome: p.nome || '',
    email: u.email,
    emailConfirmado: !!u.email_confirmed_at,
    cpf: mascararCpf(p.cpf),
    plano: p.plano,
    acessoAte: p.acesso_ate,
    criadoEm: p.criado_em,
    ultimoLogin: u.last_sign_in_at || null,
    historico: historico
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return responder(res, 405, { erro: 'Use GET ou POST.' });

  try {
    const admin = await exigirAdmin(req);
    if (!admin) return responder(res, 403, { erro: 'Acesso restrito à administração.' });

    const db = supabaseAdmin();
    const id = String((req.method === 'GET' ? req.query && req.query.id : req.body && req.body.id) || '');
    if (!UUID.test(id)) return responder(res, 400, { erro: 'Cliente inválido.' });

    const alvo = await db.auth.admin.getUserById(id);
    if (alvo.error || !alvo.data.user) return responder(res, 404, { erro: 'Cliente não encontrado.' });
    if (ehAdmin(alvo.data.user)) return responder(res, 403, { erro: 'Contas de administrador não podem ser alteradas por este painel.' });

    if (req.method === 'GET') return responder(res, 200, await detalhes(db, id));

    const corpo = req.body || {};
    const acao = corpo.acao;
    const feito = [];

    if (acao === 'dados') {
      const { data: perfil, error: ePerfil } = await db.from('perfis').select('nome, email, cpf').eq('id', id).maybeSingle();
      if (ePerfil) throw ePerfil;

      if (corpo.nome != null) {
        const nome = String(corpo.nome).trim().replace(/\s+/g, ' ');
        if (nome.length < 3 || nome.length > 120) throw new ErroUsuario(400, 'O nome precisa ter de 3 a 120 caracteres.');
        if (nome !== perfil.nome) {
          const r1 = await db.from('perfis').update({ nome }).eq('id', id);
          if (r1.error) throw r1.error;
          const r2 = await db.from('fichas').update({ nome }).eq('usuario_id', id);
          if (r2.error) throw r2.error;
          await registrar(db, admin, id, 'nome', { antes: perfil.nome, depois: nome });
          feito.push('nome');
        }
      }

      if (corpo.email != null) {
        const email = String(corpo.email).trim().toLowerCase();
        if (!EMAIL.test(email)) throw new ErroUsuario(400, 'Digite um e-mail válido.');
        if (email !== String(alvo.data.user.email || '').toLowerCase()) {
          const r = await db.auth.admin.updateUserById(id, { email, email_confirm: true });
          if (r.error) {
            if (/already|exists|registered/i.test(r.error.message || '') || r.error.code === 'email_exists') throw new ErroUsuario(409, 'Esse e-mail já é usado por outra conta.');
            throw r.error;
          }
          const r2 = await db.from('perfis').update({ email }).eq('id', id);
          if (r2.error) throw r2.error;
          await registrar(db, admin, id, 'email', { antes: alvo.data.user.email, depois: email });
          feito.push('e-mail');
        }
      }

      if (corpo.cpf != null && String(corpo.cpf).trim() !== '') {
        const cpf = String(corpo.cpf).replace(/\D/g, '');
        if (!cpfValido(cpf)) throw new ErroUsuario(400, 'Esse CPF não é válido.');
        if (cpf !== perfil.cpf) {
          const r = await db.from('perfis').update({ cpf }).eq('id', id);
          if (r.error) {
            if (r.error.code === '23505') throw new ErroUsuario(409, 'Esse CPF já pertence a outra conta.');
            throw r.error;
          }
          await registrar(db, admin, id, 'cpf', { antes: mascararCpf(perfil.cpf), depois: mascararCpf(cpf) });
          feito.push('CPF');
        }
      }
    } else if (acao === 'senha') {
      const senha = String(corpo.senha || '');
      if (senha.length < 8 || senha.length > 72 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
        throw new ErroUsuario(400, 'A senha precisa ter de 8 a 72 caracteres, com letras e números.');
      }
      const r = await db.auth.admin.updateUserById(id, { password: senha });
      if (r.error) {
        if (r.error.code === 'weak_password' || /weak|pwned|leaked/i.test(r.error.message || '')) throw new ErroUsuario(400, 'Essa senha foi recusada por ser fraca. Gere outra.');
        throw r.error;
      }
      let sessoes = 0;
      if (corpo.desconectar) {
        const s = await db.rpc('encerrar_sessoes_admin', { p_usuario: id });
        if (s.error) throw s.error;
        sessoes = s.data || 0;
      }
      await registrar(db, admin, id, 'senha', { desconectou: !!corpo.desconectar, sessoes });
      feito.push('senha');
    } else if (acao === 'confirmar-email') {
      const r = await db.auth.admin.updateUserById(id, { email_confirm: true });
      if (r.error) throw r.error;
      await registrar(db, admin, id, 'confirmar-email', {});
      feito.push('e-mail confirmado');
    } else if (acao === 'cortesia') {
      const dias = Number(corpo.dias);
      const motivo = String(corpo.motivo || '').trim();
      if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new ErroUsuario(400, 'Escolha de 1 a 365 dias.');
      if (motivo.length < 3 || motivo.length > 200) throw new ErroUsuario(400, 'Escreva o motivo (de 3 a 200 caracteres).');
      const r = await db.rpc('liberar_dias_admin', { p_usuario: id, p_dias: dias, p_admin: admin.id, p_motivo: motivo });
      if (r.error) throw r.error;
      feito.push('cortesia');
    } else if (acao === 'acesso') {
      const data = String(corpo.data || '');
      const motivo = String(corpo.motivo || '').trim();
      if (!DATA.test(data)) throw new ErroUsuario(400, 'Informe a data do acesso.');
      if (motivo.length < 3 || motivo.length > 200) throw new ErroUsuario(400, 'Escreva o motivo (de 3 a 200 caracteres).');
      const r = await db.rpc('definir_acesso_admin', { p_usuario: id, p_data: data, p_admin: admin.id, p_motivo: motivo });
      if (r.error) {
        if (r.error.code === '22023') throw new ErroUsuario(400, 'Data de acesso inválida.');
        throw r.error;
      }
      feito.push('acesso');
    } else if (acao === 'plano') {
      const plano = String(corpo.plano || '');
      if (!Object.prototype.hasOwnProperty.call(PLANOS, plano)) throw new ErroUsuario(400, 'Plano inválido.');
      const { data: antes } = await db.from('perfis').select('plano').eq('id', id).maybeSingle();
      const r = await db.from('perfis').update({ plano }).eq('id', id);
      if (r.error) throw r.error;
      await registrar(db, admin, id, 'plano', { antes: antes && antes.plano, depois: plano });
      feito.push('plano preferido');
    } else if (acao === 'desconectar') {
      const s = await db.rpc('encerrar_sessoes_admin', { p_usuario: id });
      if (s.error) throw s.error;
      await registrar(db, admin, id, 'sessoes', { sessoes: s.data || 0 });
      feito.push('desconectado');
    } else if (acao === 'excluir') {
      const usuario = alvo.data.user;
      const confirmacao = String(corpo.confirmacao || '').trim().toLowerCase();
      const motivo = String(corpo.motivo || '').trim();
      if (motivo.length < 3 || motivo.length > 200) throw new ErroUsuario(400, 'Escreva o motivo da exclusão (de 3 a 200 caracteres).');
      if (!confirmacao || confirmacao !== String(usuario.email || '').toLowerCase()) {
        throw new ErroUsuario(400, 'Para confirmar, digite exatamente o e-mail do cliente.');
      }
      const [perfil, pixOk, cartaoOk] = await Promise.all([
        db.from('perfis').select('nome, cpf, criado_em').eq('id', id).maybeSingle(),
        db.from('pagamentos_pix').select('valor').eq('usuario_id', id).not('aprovado_em', 'is', null),
        db.from('pagamentos_cartao').select('valor').eq('usuario_id', id).not('aprovado_em', 'is', null)
      ]);
      [perfil, pixOk, cartaoOk].forEach(function (r) { if (r.error) throw r.error; });
      const aprovados = pixOk.data.concat(cartaoOk.data);
      const total = Math.round(aprovados.reduce(function (t, x) { return t + Number(x.valor); }, 0) * 100) / 100;

      // Registra antes de apagar: se a exclusão falhar, o registro é desfeito.
      const { data: registro, error: eReg } = await db.from('contas_excluidas').insert({
        usuario_id: id,
        admin_id: admin.id,
        nome: perfil.data && perfil.data.nome,
        email: usuario.email,
        cpf_mascarado: mascararCpf(perfil.data && perfil.data.cpf),
        motivo,
        pagamentos_aprovados: aprovados.length,
        total_pago: total,
        conta_criada_em: (perfil.data && perfil.data.criado_em) || usuario.created_at
      }).select('id').single();
      if (eReg) throw eReg;

      const r = await db.auth.admin.deleteUser(id);
      if (r.error) {
        await db.from('contas_excluidas').delete().eq('id', registro.id);
        throw r.error;
      }
      return responder(res, 200, { excluido: true, email: usuario.email });
    } else {
      return responder(res, 400, { erro: 'Ação inválida.' });
    }

    return responder(res, 200, Object.assign({ alterado: feito }, await detalhes(db, id)));
  } catch (err) {
    if (err instanceof ErroUsuario) return responder(res, err.status, { erro: err.message });
    console.error('[admin/cliente]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
