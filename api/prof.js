// /api/prof — painel do profissional (gratuito para o profissional).
//
// GET  ?acao=eu                    perfil profissional da conta (ou null) e código de convite
// GET  ?acao=pacientes             pacientes com vínculo ativo + resumo e alertas
// GET  ?acao=paciente&id=<id>      detalhes de um paciente (só o que ele compartilhou)
// POST { acao: 'ativar', nome, profissao, registro?, empresa? }   cria o painel numa conta existente
// POST { acao: 'atualizar', nome?, profissao?, registro?, empresa? }
// POST { acao: 'trocar-codigo' }   novo link de convite (o antigo deixa de funcionar)
// POST { acao: 'orientacoes', pacienteId, metaPesoKg?, metaData?, metaAguaCopos?, refeicoes?, observacoes? }
//      metas e plano alimentar para o paciente (substitui as anteriores)
//
// Cada leitura confere o vínculo ativo e os campos compartilha_* do paciente.
'use strict';

const { supabaseAdmin, usuarioDaRequisicao, responder } = require('./_lib/pix');
const P = require('./_lib/prof');

function texto(v, max) { return String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, max); }

function validarPerfil(corpo, parcial) {
  const linha = {};
  if (!parcial || corpo.nome != null) {
    const nome = texto(corpo.nome, 120);
    if (nome.length < 2) throw new P.ErroUsuario(400, 'Informe seu nome (como os pacientes conhecem você).');
    linha.nome = nome;
  }
  if (!parcial || corpo.profissao != null) {
    if (!Object.prototype.hasOwnProperty.call(P.PROFISSOES, corpo.profissao)) throw new P.ErroUsuario(400, 'Escolha a profissão.');
    linha.profissao = corpo.profissao;
  }
  if (corpo.registro != null) linha.registro = texto(corpo.registro, 40) || null;
  if (corpo.empresa != null) linha.empresa = texto(corpo.empresa, 120) || null;
  return linha;
}

function perfilSaida(prof) {
  return Object.assign(P.profissionalPublico(prof), { codigo: prof.codigo });
}

/** Dados dos pacientes (em lote), já filtrados pelo que cada um compartilhou. */
async function carregarPacientes(db, vinculos, detalhe) {
  const ids = vinculos.map(function (v) { return v.paciente_id; });
  if (!ids.length) return [];
  const desde = P.somarDias(P.hojeSP(), detalhe ? -30 : -7);
  const [perfis, fichas, pesos, meds, apls, agua] = await Promise.all([
    P.dados(db.from('perfis').select('id, nome, acesso_ate').in('id', ids)),
    P.dados(db.from('fichas').select('*').in('usuario_id', ids)),
    P.dados(db.from('registros_peso').select('usuario_id, data, peso_kg, cintura_cm').in('usuario_id', ids).order('data', { ascending: true })),
    P.dados(db.from('medicamentos').select('id, usuario_id, nome, dose_ml, dose_mg, intervalo_dias, data_ultima_aplicacao, observacoes').in('usuario_id', ids)),
    P.dados(db.from('aplicacoes').select('usuario_id, medicamento_id, data, dose_ml').in('usuario_id', ids).order('data', { ascending: false })),
    P.dados(db.from('registros_agua').select('usuario_id, data, copos, meta').in('usuario_id', ids).gte('data', desde).order('data', { ascending: false }))
  ]);
  const hoje = P.hojeSP();

  return vinculos.map(function (v) {
    const c = P.compartilhaDe(v);
    const id = v.paciente_id;
    const perfil = perfis.find(function (x) { return x.id === id; }) || {};
    const ficha = fichas.find(function (x) { return x.usuario_id === id; }) || null;
    const seus = function (lista) { return lista.filter(function (x) { return x.usuario_id === id; }); };
    const p = {
      id: id,
      vinculoId: v.id,
      nome: perfil.nome || (ficha && ficha.nome) || 'Paciente',
      desde: v.criado_em,
      compartilha: c,
      planoAtivo: !!(perfil.acesso_ate && perfil.acesso_ate >= hoje),
      planoAte: perfil.acesso_ate || null,
      alertas: []
    };

    if (c.ficha && ficha) {
      p.idade = P.idade(ficha.data_nascimento);
      p.sexo = ficha.sexo || null;
      p.objetivo = ficha.objetivo || null;
      if (detalhe) {
        p.ficha = {
          alturaCm: ficha.altura_cm != null ? Number(ficha.altura_cm) : null,
          nivelAtividade: ficha.nivel_atividade, condicoes: ficha.condicoes_saude || [], condicoesOutras: ficha.condicoes_outras,
          alergias: ficha.alergias, medicamentosEmUso: ficha.medicamentos_em_uso, observacoes: ficha.observacoes,
          cidade: ficha.cidade, estado: ficha.estado, telefone: ficha.telefone
        };
      }
    }

    if (c.peso) {
      const fichaPeso = ficha ? { peso_inicial_kg: ficha.peso_inicial_kg, data_peso_inicial: ficha.data_peso_inicial, meta_peso_kg: ficha.meta_peso_kg, altura_cm: ficha.altura_cm, meta_data: ficha.meta_data } : null;
      const registros = seus(pesos);
      p.peso = P.resumoPeso(fichaPeso, registros);
      if (p.peso && p.peso.ultimaPesagemDias >= 14) p.alertas.push({ tipo: 'peso', texto: 'Sem pesar há ' + p.peso.ultimaPesagemDias + ' dias' });
      if (!p.peso) p.alertas.push({ tipo: 'peso', texto: 'Nenhum peso registrado' });
      if (detalhe) {
        p.pesos = registros.map(function (r) { return { data: r.data, pesoKg: Number(r.peso_kg), cinturaCm: r.cintura_cm != null ? Number(r.cintura_cm) : null }; });
        if (fichaPeso && fichaPeso.meta_data) p.metaData = fichaPeso.meta_data;
      }
    }

    if (c.medicamentos) {
      p.doses = P.proximasDoses(seus(meds), seus(apls));
      p.doses.forEach(function (d) {
        if (d.dias != null && d.dias < 0) p.alertas.push({ tipo: 'dose', texto: d.nome + ': dose atrasada há ' + Math.abs(d.dias) + (Math.abs(d.dias) === 1 ? ' dia' : ' dias') });
      });
      if (detalhe) {
        p.aplicacoes = seus(apls).slice(0, 20).map(function (a) {
          const m = meds.find(function (x) { return x.id === a.medicamento_id; });
          return { data: a.data, medicamento: m ? m.nome : '—', doseMl: a.dose_ml != null ? Number(a.dose_ml) : null };
        });
      }
    }

    if (c.agua) {
      const reg = seus(agua);
      const hojeReg = reg.find(function (a) { return a.data === hoje; });
      const ultimos7 = reg.filter(function (a) { return a.data > P.somarDias(hoje, -7); });
      p.agua = {
        hoje: hojeReg ? hojeReg.copos : 0,
        meta: hojeReg ? hojeReg.meta : (reg[0] ? reg[0].meta : 8),
        diasNaMeta7: ultimos7.filter(function (a) { return a.copos >= a.meta; }).length
      };
      if (detalhe) p.aguaDias = reg.map(function (a) { return { data: a.data, copos: a.copos, meta: a.meta }; });
    }

    if (c.gestacao) p.gestacao = P.resumoGestacao(ficha);
    return p;
  });
}

module.exports = async function handler(req, res) {
  try {
    const db = supabaseAdmin();
    const acao = req.method === 'GET' ? String((req.query && req.query.acao) || '') : String((req.body && req.body.acao) || '');

    // Perfil da conta logada (pode ainda não ser profissional) e ativação.
    if ((req.method === 'GET' && acao === 'eu') || (req.method === 'POST' && acao === 'ativar')) {
      const usuario = await usuarioDaRequisicao(req);
      if (!usuario) return responder(res, 401, { erro: 'Sua sessão expirou. Entre novamente.' });
      if (req.method === 'POST') {
        const linha = validarPerfil(req.body || {}, false);
        const r = await db.rpc('ativar_profissional', { p_usuario: usuario.id, p_nome: linha.nome, p_profissao: linha.profissao, p_registro: linha.registro || null, p_empresa: linha.empresa || null });
        if (r.error) throw r.error;
      }
      const prof = await P.dados(db.from('profissionais').select('*').eq('usuario_id', usuario.id).maybeSingle());
      return responder(res, 200, { profissional: prof ? perfilSaida(prof) : null });
    }

    const { prof } = await P.exigirProfissional(req);

    if (req.method === 'GET' && acao === 'pacientes') {
      const vinculos = await P.dados(db.from('vinculos').select('*').eq('profissional_id', prof.usuario_id).eq('status', 'ativo').order('criado_em', { ascending: false }));
      const pacientes = await carregarPacientes(db, vinculos, false);
      return responder(res, 200, { hoje: P.hojeSP(), profissional: perfilSaida(prof), pacientes: pacientes });
    }

    if (req.method === 'GET' && acao === 'paciente') {
      const id = String((req.query && req.query.id) || '');
      if (!P.UUID.test(id)) throw new P.ErroUsuario(400, 'Paciente inválido.');
      const vinculo = await P.dados(db.from('vinculos').select('*').eq('profissional_id', prof.usuario_id).eq('paciente_id', id).eq('status', 'ativo').maybeSingle());
      if (!vinculo) throw new P.ErroUsuario(404, 'Esse paciente não compartilha dados com você (ou removeu o acesso).');
      const [[paciente], orient] = await Promise.all([
        carregarPacientes(db, [vinculo], true),
        P.dados(db.from('orientacoes').select('*').eq('vinculo_id', vinculo.id).maybeSingle())
      ]);
      paciente.orientacoes = P.orientacoesSaida(orient);
      return responder(res, 200, { hoje: P.hojeSP(), paciente: paciente });
    }

    if (req.method === 'POST' && acao === 'orientacoes') {
      const corpo = req.body || {};
      const id = String(corpo.pacienteId || '');
      if (!P.UUID.test(id)) throw new P.ErroUsuario(400, 'Paciente inválido.');
      const vinculo = await P.dados(db.from('vinculos').select('id').eq('profissional_id', prof.usuario_id).eq('paciente_id', id).eq('status', 'ativo').maybeSingle());
      if (!vinculo) throw new P.ErroUsuario(404, 'Esse paciente não compartilha dados com você (ou removeu o acesso).');
      const linha = Object.assign(P.validarOrientacoes(corpo), { vinculo_id: vinculo.id, atualizado_em: new Date().toISOString() });
      const salva = await P.dados(db.from('orientacoes').upsert(linha, { onConflict: 'vinculo_id' }).select('*').single());
      return responder(res, 200, { orientacoes: P.orientacoesSaida(salva) });
    }

    if (req.method === 'POST' && acao === 'atualizar') {
      const linha = validarPerfil(req.body || {}, true);
      const atualizado = await P.dados(db.from('profissionais').update(linha).eq('usuario_id', prof.usuario_id).select('*').single());
      return responder(res, 200, { profissional: perfilSaida(atualizado) });
    }

    if (req.method === 'POST' && acao === 'trocar-codigo') {
      const r = await db.rpc('trocar_codigo_profissional', { p_usuario: prof.usuario_id });
      if (r.error) throw r.error;
      return responder(res, 200, { profissional: perfilSaida(Object.assign({}, prof, { codigo: r.data })) });
    }

    return responder(res, 400, { erro: 'Ação inválida.' });
  } catch (err) {
    if (err instanceof P.ErroUsuario) return responder(res, err.status, { erro: err.message });
    console.error('[prof]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
