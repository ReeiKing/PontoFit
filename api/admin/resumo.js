// GET /api/admin/resumo — painel de administração (só administradores).
// Assinantes com a situação do acesso, números do negócio, pagamentos
// recentes e liberações manuais de dias. Contas de administrador ficam fora
// das contagens.
// CPF sai mascarado (***.456.789-**).
'use strict';

const { PLANOS, supabaseAdmin, responder } = require('../_lib/pix');
const { exigirAdmin, ehAdmin } = require('../_lib/admin');

const A_VENCER_DIAS = 7;

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
function mascararCpf(cpf) {
  return cpf && cpf.length === 11 ? '***.' + cpf.slice(3, 6) + '.' + cpf.slice(6, 9) + '-**' : null;
}
function dataSP(ts) {
  return ts ? new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) : null;
}

async function todos(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data || [];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return responder(res, 405, { erro: 'Use GET.' });

  try {
    const admin = await exigirAdmin(req);
    if (!admin) return responder(res, 403, { erro: 'Acesso restrito à administração.' });

    const db = supabaseAdmin();
    const [usuariosAuth, perfis, pix, cartao, liberacoes] = await Promise.all([
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }).then(function (r) {
        if (r.error) throw r.error;
        return r.data.users;
      }),
      todos(db.from('perfis').select('id, nome, email, cpf, plano, acesso_ate, criado_em')),
      todos(db.from('pagamentos_pix').select('id, usuario_id, plano, valor, status, com_desconto, criado_em, aprovado_em')),
      todos(db.from('pagamentos_cartao').select('id, usuario_id, plano, valor, status, com_desconto, criado_em, aprovado_em')),
      todos(db.from('admin_liberacoes').select('admin_id, usuario_id, dias, motivo, acesso_antes, acesso_depois, criado_em').order('criado_em', { ascending: false }))
    ]);

    const admins = new Set(usuariosAuth.filter(ehAdmin).map(function (u) { return u.id; }));
    const confirmado = {};
    usuariosAuth.forEach(function (u) { confirmado[u.id] = !!u.email_confirmed_at; });

    // Pagamentos (cartão "pending" sem pagamento = checkout abandonado; fica fora)
    const pagamentos = pix.map(function (p) { return Object.assign({ meio: 'pix' }, p); })
      .concat(cartao.filter(function (c) { return c.status !== 'pending' || c.aprovado_em; })
        .map(function (c) { return Object.assign({ meio: 'cartao' }, c); }));
    const aprovados = pagamentos.filter(function (p) { return p.aprovado_em; });

    const hoje = hojeSP();
    const limiteAVencer = somarDias(hoje, A_VENCER_DIAS);
    const porUsuario = {};
    aprovados.forEach(function (p) {
      const u = (porUsuario[p.usuario_id] = porUsuario[p.usuario_id] || { total: 0, qtd: 0, ultimo: null });
      u.total += Number(p.valor);
      u.qtd += 1;
      if (!u.ultimo || p.aprovado_em > u.ultimo.aprovado_em) u.ultimo = p;
    });

    const liberadosPor = {};
    liberacoes.forEach(function (l) {
      const u = (liberadosPor[l.usuario_id] = liberadosPor[l.usuario_id] || { dias: 0, vezes: 0 });
      u.dias += l.dias;
      u.vezes += 1;
    });

    const nomes = {};
    const assinantes = perfis.filter(function (p) { return !admins.has(p.id); }).map(function (p) {
      nomes[p.id] = p.nome || p.email;
      const pagou = porUsuario[p.id];
      const ativo = p.acesso_ate && p.acesso_ate >= hoje;
      let situacao;
      if (ativo && !pagou) situacao = liberadosPor[p.id] ? 'cortesia' : 'teste';
      else if (ativo && p.acesso_ate <= limiteAVencer) situacao = 'a-vencer';
      else if (ativo) situacao = 'ativo';
      else if (pagou) situacao = 'vencido';
      else situacao = 'sem-pagamento';
      return {
        id: p.id,
        nome: p.nome || '',
        email: p.email,
        cpf: mascararCpf(p.cpf),
        emailConfirmado: !!confirmado[p.id],
        plano: p.plano,
        acessoAte: p.acesso_ate,
        diasRestantes: p.acesso_ate ? diasEntre(hoje, p.acesso_ate) : null,
        situacao: situacao,
        bloqueado: !ativo,
        diasLiberados: liberadosPor[p.id] ? liberadosPor[p.id].dias : 0,
        totalPago: pagou ? Math.round(pagou.total * 100) / 100 : 0,
        pagamentos: pagou ? pagou.qtd : 0,
        ultimoPagamento: pagou ? { data: dataSP(pagou.ultimo.aprovado_em), valor: Number(pagou.ultimo.valor), meio: pagou.ultimo.meio, plano: pagou.ultimo.plano } : null,
        criadoEm: dataSP(p.criado_em)
      };
    });
    perfis.forEach(function (p) { if (!nomes[p.id]) nomes[p.id] = p.nome || p.email; });

    // Números do negócio
    const contar = function (s) { return assinantes.filter(function (a) { return a.situacao === s; }).length; };
    const mesAtual = hoje.slice(0, 7);
    const desde30 = somarDias(hoje, -30);
    const aprovadosClientes = aprovados.filter(function (p) { return !admins.has(p.usuario_id); });
    const soma = function (lista) { return Math.round(lista.reduce(function (t, p) { return t + Number(p.valor); }, 0) * 100) / 100; };
    const porPlano = {};
    Object.keys(PLANOS).forEach(function (k) { porPlano[k] = { qtd: 0, valor: 0 }; });
    aprovadosClientes.forEach(function (p) {
      if (!porPlano[p.plano]) porPlano[p.plano] = { qtd: 0, valor: 0 };
      porPlano[p.plano].qtd += 1;
      porPlano[p.plano].valor = Math.round((porPlano[p.plano].valor + Number(p.valor)) * 100) / 100;
    });

    const numeros = {
      contas: assinantes.length,
      ativos: contar('ativo') + contar('a-vencer'),
      aVencer: contar('a-vencer'),
      vencidos: contar('vencido'),
      semPagamento: contar('sem-pagamento'),
      emTeste: contar('teste'),
      cortesia: contar('cortesia'),
      bloqueados: assinantes.filter(function (a) { return a.bloqueado; }).length,
      receitaTotal: soma(aprovadosClientes),
      receitaMes: soma(aprovadosClientes.filter(function (p) { return dataSP(p.aprovado_em).slice(0, 7) === mesAtual; })),
      receita30Dias: soma(aprovadosClientes.filter(function (p) { return dataSP(p.aprovado_em) >= desde30; })),
      pagamentosAprovados: aprovadosClientes.length,
      descontosUsados: aprovadosClientes.filter(function (p) { return p.com_desconto; }).length,
      porPlano: porPlano,
      aVencerDias: A_VENCER_DIAS
    };

    const recentes = pagamentos
      .filter(function (p) { return !admins.has(p.usuario_id); })
      .sort(function (a, b) { return (b.aprovado_em || b.criado_em) < (a.aprovado_em || a.criado_em) ? -1 : 1; })
      .slice(0, 30)
      .map(function (p) {
        return {
          data: dataSP(p.aprovado_em || p.criado_em),
          cliente: nomes[p.usuario_id] || '—',
          plano: p.plano,
          meio: p.meio,
          valor: Number(p.valor),
          status: p.aprovado_em ? 'approved' : p.status,
          comDesconto: !!p.com_desconto
        };
      });

    assinantes.sort(function (a, b) {
      const ordem = { 'a-vencer': 0, vencido: 1, ativo: 2, cortesia: 3, teste: 4, 'sem-pagamento': 5 };
      return ordem[a.situacao] - ordem[b.situacao] || String(a.acessoAte || '').localeCompare(String(b.acessoAte || ''));
    });

    const historicoLiberacoes = liberacoes.slice(0, 30).map(function (l) {
      return {
        data: dataSP(l.criado_em),
        cliente: nomes[l.usuario_id] || '—',
        admin: nomes[l.admin_id] || 'Administração',
        dias: l.dias,
        motivo: l.motivo,
        acessoAntes: l.acesso_antes,
        acessoDepois: l.acesso_depois
      };
    });

    return responder(res, 200, {
      geradoEm: new Date().toISOString(), hoje: hoje, numeros: numeros,
      assinantes: assinantes, pagamentos: recentes, liberacoes: historicoLiberacoes
    });
  } catch (err) {
    console.error('[admin/resumo]', err.message || err);
    return responder(res, 500, { erro: 'Não foi possível carregar o painel agora.' });
  }
};
