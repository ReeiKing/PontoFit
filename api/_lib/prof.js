// PontoFit — código comum de profissionais e vínculos com pacientes.
// O profissional só vê dados de pacientes com vínculo ATIVO, e só o que o
// paciente escolheu compartilhar (compartilha_*). Tudo pelo servidor.
'use strict';

const { supabaseAdmin, usuarioDaRequisicao } = require('./pix');

const PROFISSOES = { nutricionista: 'Nutricionista', personal: 'Personal trainer', academia: 'Academia', medico: 'Médico(a)', outro: 'Profissional' };
const CODIGO = /^[A-Z0-9-]{4,24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS_COMPARTILHA = ['peso', 'agua', 'medicamentos', 'ficha', 'gestacao'];

class ErroUsuario extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}

function hojeSP() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
function somarDias(iso, dias) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function diasEntre(a, b) {
  return Math.round((new Date(b + 'T12:00:00Z') - new Date(a + 'T12:00:00Z')) / 86400000);
}
function idade(nascimento) {
  if (!nascimento) return null;
  const h = hojeSP();
  let anos = Number(h.slice(0, 4)) - Number(nascimento.slice(0, 4));
  if (h.slice(5) < nascimento.slice(5)) anos--;
  return anos;
}
function num(v) { return v == null ? null : Number(v); }

async function dados(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

function profissionalPublico(p) {
  return { nome: p.nome, profissao: p.profissao, profissaoNome: PROFISSOES[p.profissao] || 'Profissional', registro: p.registro, empresa: p.empresa };
}

function compartilhaDe(v) {
  const c = {};
  CAMPOS_COMPARTILHA.forEach(function (k) { c[k] = !!v['compartilha_' + k]; });
  return c;
}

/** Lê { peso, agua, ... } do corpo e devolve as colunas compartilha_*. */
function colunasCompartilha(obj) {
  const linha = {};
  CAMPOS_COMPARTILHA.forEach(function (k) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) linha['compartilha_' + k] = !!obj[k];
  });
  return linha;
}

/** → { usuario, prof } ou ErroUsuario (401 sem sessão, 403 sem perfil profissional). */
async function exigirProfissional(req) {
  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) throw new ErroUsuario(401, 'Sua sessão expirou. Entre novamente.');
  const prof = await dados(supabaseAdmin().from('profissionais').select('*').eq('usuario_id', usuario.id).maybeSingle());
  if (!prof) throw new ErroUsuario(403, 'Esta conta ainda não tem painel profissional.');
  return { usuario, prof };
}

/* ---------- Cálculos (iguais aos do app) ---------- */
function resumoPeso(ficha, pesos) {
  const serie = (pesos || []).map(function (p) { return { data: p.data, pesoKg: num(p.peso_kg) }; });
  if (ficha && ficha.peso_inicial_kg) serie.unshift({ data: ficha.data_peso_inicial || (serie[0] && serie[0].data) || hojeSP(), pesoKg: num(ficha.peso_inicial_kg) });
  serie.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
  if (!serie.length) return null;
  const inicial = serie[0];
  const atual = serie[serie.length - 1];
  const meta = ficha ? num(ficha.meta_peso_kg) : null;
  const r = { inicial, atual, diferenca: Math.round((atual.pesoKg - inicial.pesoKg) * 10) / 10, meta, ultimaPesagemDias: diasEntre(atual.data, hojeSP()) };
  if (meta != null && meta !== inicial.pesoKg) {
    const caminho = inicial.pesoKg - meta;
    r.progresso = Math.max(0, Math.min(100, Math.round(((inicial.pesoKg - atual.pesoKg) / caminho) * 100)));
    r.falta = Math.round((atual.pesoKg - meta) * 10) / 10;
  }
  if (ficha && ficha.altura_cm) {
    const m = Number(ficha.altura_cm) / 100;
    r.imc = Math.round((atual.pesoKg / (m * m)) * 10) / 10;
  }
  return r;
}

function proximasDoses(meds, aplicacoes) {
  const hoje = hojeSP();
  return (meds || []).map(function (m) {
    let ultima = m.data_ultima_aplicacao;
    (aplicacoes || []).forEach(function (a) { if (a.medicamento_id === m.id && (!ultima || a.data > ultima)) ultima = a.data; });
    if (!m.intervalo_dias || !ultima) return { nome: m.nome, doseMl: num(m.dose_ml), doseMg: num(m.dose_mg), intervaloDias: m.intervalo_dias, semData: true };
    const proxima = somarDias(ultima, m.intervalo_dias);
    return { nome: m.nome, doseMl: num(m.dose_ml), doseMg: num(m.dose_mg), intervaloDias: m.intervalo_dias, ultima, proxima, dias: diasEntre(hoje, proxima) };
  }).sort(function (a, b) { return (a.dias == null ? 9999 : a.dias) - (b.dias == null ? 9999 : b.dias); });
}

function resumoGestacao(ficha) {
  if (!ficha || !ficha.gestante) return null;
  const dum = ficha.gestacao_dum || (ficha.gestacao_dpp ? somarDias(ficha.gestacao_dpp, -280) : null);
  if (!dum) return null;
  const dias = diasEntre(dum, hojeSP());
  if (dias < 0 || dias > 300) return null;
  return { semana: Math.floor(dias / 7), diasExtra: dias % 7, dpp: ficha.gestacao_dpp || somarDias(dum, 280), pesoPreKg: num(ficha.peso_pre_gestacional_kg) };
}

module.exports = {
  PROFISSOES, CODIGO, UUID, CAMPOS_COMPARTILHA, ErroUsuario,
  hojeSP, somarDias, diasEntre, idade, dados,
  profissionalPublico, compartilhaDe, colunasCompartilha, exigirProfissional,
  resumoPeso, proximasDoses, resumoGestacao
};
