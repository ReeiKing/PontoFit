/* ==========================================================================
   PontoFit — admin.js
   Página de administração (admin.html): visão geral do negócio, lista de
   assinantes com a situação do acesso (ativo, a vencer, vencido, nunca pagou,
   em teste) e pagamentos recentes.
   Os dados vêm de /api/admin/resumo, que só responde para contas com
   app_metadata.role = 'admin'. Aqui não há nenhuma decisão de permissão.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;
  var raiz = document.querySelector('[data-admin]');
  if (!raiz || !S) return;
  var $ = function (sel) { return document.querySelector(sel); };

  var dados = null;
  var filtro = { situacao: 'todos', busca: '' };

  var SITUACOES = {
    'a-vencer': { nome: 'A vencer', classe: 'badge--laranja' },
    vencido: { nome: 'Vencido', classe: 'badge--vermelho' },
    ativo: { nome: 'Ativo', classe: '' },
    teste: { nome: 'Em teste', classe: 'badge--agua' },
    'sem-pagamento': { nome: 'Nunca pagou', classe: 'badge--vermelho' }
  };
  var PLANOS = { semanal: '7 dias', mensal: '30 dias', semestral: '6 meses' };
  var STATUS = {
    approved: { nome: 'Aprovado', classe: '' },
    pending: { nome: 'Aguardando', classe: 'badge--agua' },
    in_process: { nome: 'Em análise', classe: 'badge--agua' },
    rejected: { nome: 'Recusado', classe: 'badge--vermelho' },
    cancelled: { nome: 'Cancelado', classe: 'badge--vermelho' },
    expired: { nome: 'Expirado', classe: 'badge--vermelho' }
  };

  function reais(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function data(iso) { return iso ? F.dataCurta(iso) : '—'; }
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function badge(info) { return el('span', 'badge ' + (info.classe || ''), info.nome); }
  function celula(rotulo, conteudo) {
    var td = el('td');
    td.dataset.rotulo = rotulo;
    if (conteudo instanceof Node) td.appendChild(conteudo); else td.textContent = conteudo;
    return td;
  }
  function definir(chave, texto) {
    var e = document.querySelector('[data-k="' + chave + '"]');
    if (e) e.textContent = texto;
  }
  function normalizar(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  /* ---------- Abas ---------- */
  function abaDoHash() {
    var id = location.hash.replace('#', '');
    return ['visao', 'assinantes', 'pagamentos'].indexOf(id) >= 0 ? id : 'visao';
  }
  function mostrarAba(foco) {
    var id = abaDoHash();
    document.querySelectorAll('[data-admin-secao]').forEach(function (s) { s.hidden = s.dataset.adminSecao !== id; });
    document.querySelectorAll('[data-aba]').forEach(function (a) {
      if (a.dataset.aba === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (foco) { var h = document.querySelector('[data-admin-secao="' + id + '"] h1'); if (h) h.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', function () { mostrarAba(true); window.scrollTo(0, 0); });

  /* ---------- Visão geral ---------- */
  function barras(ul, itens) {
    ul.textContent = '';
    var max = Math.max.apply(null, itens.map(function (i) { return i.valor; }).concat([1]));
    itens.forEach(function (i) {
      var li = el('li', 'admin-barra');
      var topo = el('div', 'admin-barra__topo');
      topo.appendChild(el('span', null, i.nome));
      topo.appendChild(el('strong', null, i.texto));
      li.appendChild(topo);
      var trilho = el('div', 'admin-barra__trilho');
      var barra = el('span', 'admin-barra__valor admin-barra__valor--' + (i.cor || 'verde'));
      trilho.appendChild(barra);
      li.appendChild(trilho);
      ul.appendChild(li);
      requestAnimationFrame(function () { barra.style.width = (i.valor / max * 100).toFixed(1) + '%'; });
    });
  }

  function renderVisao() {
    var n = dados.numeros;
    definir('ativos', String(n.ativos));
    definir('ativos-info', 'de ' + n.contas + ' ' + F.plural(n.contas, 'conta', 'contas') + (n.emTeste ? ' · ' + n.emTeste + ' em teste' : ''));
    definir('aVencer', String(n.aVencer));
    definir('aVencer-info', 'nos próximos ' + n.aVencerDias + ' dias');
    definir('vencidos', String(n.vencidos));
    definir('semPagamento', String(n.semPagamento));
    definir('receitaMes', reais(n.receitaMes));
    definir('receita30', reais(n.receita30Dias) + ' nos últimos 30 dias');
    definir('receitaTotal', reais(n.receitaTotal));
    definir('pagamentos-info', n.pagamentosAprovados + ' ' + F.plural(n.pagamentosAprovados, 'pagamento aprovado', 'pagamentos aprovados') +
      (n.descontosUsados ? ' · ' + n.descontosUsados + ' com desconto' : ''));

    barras($('[data-admin-situacoes]'), [
      { nome: 'Ativos', valor: n.ativos - n.aVencer, texto: String(n.ativos - n.aVencer), cor: 'verde' },
      { nome: 'A vencer', valor: n.aVencer, texto: String(n.aVencer), cor: 'laranja' },
      { nome: 'Vencidos', valor: n.vencidos, texto: String(n.vencidos), cor: 'vermelho' },
      { nome: 'Nunca pagaram', valor: n.semPagamento, texto: String(n.semPagamento), cor: 'cinza' },
      { nome: 'Em teste', valor: n.emTeste, texto: String(n.emTeste), cor: 'agua' }
    ]);
    barras($('[data-admin-planos]'), Object.keys(n.porPlano).map(function (k) {
      var p = n.porPlano[k];
      return { nome: PLANOS[k] || k, valor: p.valor, texto: p.qtd + ' · ' + reais(p.valor), cor: 'verde' };
    }));

    var atencao = dados.assinantes.filter(function (a) { return a.situacao === 'a-vencer' || a.situacao === 'vencido'; }).slice(0, 12);
    var ul = $('[data-admin-atencao]');
    ul.textContent = '';
    if (!atencao.length) {
      ul.appendChild(el('li', 'texto-sec', 'Ninguém vencendo ou vencido agora.'));
    }
    atencao.forEach(function (a) {
      var li = el('li', 'admin-item');
      var txt = el('div');
      txt.appendChild(el('strong', null, a.nome || a.email));
      txt.appendChild(el('span', 'texto-sm texto-sec', a.email));
      li.appendChild(txt);
      var info = el('div', 'admin-item__info');
      info.appendChild(badge(SITUACOES[a.situacao]));
      info.appendChild(el('span', 'texto-sm', a.diasRestantes >= 0
        ? (a.diasRestantes === 0 ? 'vence hoje' : 'vence em ' + a.diasRestantes + ' ' + F.plural(a.diasRestantes, 'dia', 'dias'))
        : 'venceu há ' + Math.abs(a.diasRestantes) + ' ' + F.plural(Math.abs(a.diasRestantes), 'dia', 'dias')));
      li.appendChild(info);
      ul.appendChild(li);
    });

    $('[data-admin-atualizado]').textContent = 'Atualizado às ' + new Date(dados.geradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + F.dataExtenso(dados.hoje, true);
  }

  /* ---------- Assinantes ---------- */
  function renderFiltros() {
    var caixa = $('[data-admin-filtros]');
    caixa.textContent = '';
    var contagem = { todos: dados.assinantes.length, bloqueados: 0 };
    dados.assinantes.forEach(function (a) {
      contagem[a.situacao] = (contagem[a.situacao] || 0) + 1;
      if (a.bloqueado) contagem.bloqueados++;
    });
    [['todos', 'Todos'], ['ativo', 'Ativos'], ['a-vencer', 'A vencer'], ['vencido', 'Vencidos'], ['bloqueados', 'Bloqueados'], ['sem-pagamento', 'Nunca pagaram'], ['teste', 'Em teste']]
      .forEach(function (f) {
        var b = el('button', 'filtro', f[1] + ' (' + (contagem[f[0]] || 0) + ')');
        b.type = 'button';
        b.dataset.filtro = f[0];
        b.setAttribute('aria-pressed', String(filtro.situacao === f[0]));
        caixa.appendChild(b);
      });
  }

  function renderAssinantes() {
    var termo = normalizar(filtro.busca);
    var lista = dados.assinantes.filter(function (a) {
      if (filtro.situacao === 'bloqueados' && !a.bloqueado) return false;
      if (filtro.situacao !== 'todos' && filtro.situacao !== 'bloqueados' && a.situacao !== filtro.situacao) return false;
      return !termo || normalizar([a.nome, a.email, a.cpf].join(' ')).indexOf(termo) >= 0;
    });
    var corpo = $('[data-admin-assinantes] tbody');
    corpo.textContent = '';
    lista.forEach(function (a) {
      var tr = el('tr');
      var quem = el('div', 'admin-quem');
      quem.appendChild(el('strong', null, a.nome || '(sem nome)'));
      quem.appendChild(el('span', 'texto-sm texto-sec', a.email + (a.emailConfirmado ? '' : ' · e-mail não confirmado')));
      if (a.cpf) quem.appendChild(el('span', 'texto-xs texto-sec', 'CPF ' + a.cpf));
      tr.appendChild(celula('Assinante', quem));
      var sit = el('div', 'admin-situacao');
      sit.appendChild(badge(SITUACOES[a.situacao]));
      if (a.bloqueado) sit.appendChild(el('span', 'texto-xs texto-sec', 'bloqueado'));
      tr.appendChild(celula('Situação', sit));
      tr.appendChild(celula('Acesso até', a.acessoAte && a.acessoAte >= dados.hoje ? data(a.acessoAte) : (a.acessoAte && a.pagamentos ? data(a.acessoAte) : '—')));
      tr.appendChild(celula('Último pagamento', a.ultimoPagamento
        ? data(a.ultimoPagamento.data) + ' · ' + (PLANOS[a.ultimoPagamento.plano] || '') + ' · ' + (a.ultimoPagamento.meio === 'pix' ? 'Pix' : 'Cartão')
        : '—'));
      tr.appendChild(celula('Total pago', reais(a.totalPago) + (a.pagamentos > 1 ? ' (' + a.pagamentos + 'x)' : '')));
      tr.appendChild(celula('Conta criada', data(a.criadoEm)));
      corpo.appendChild(tr);
    });
    $('[data-admin-assinantes-vazio]').hidden = lista.length > 0;
    $('[data-admin-assinantes]').hidden = lista.length === 0;
    $('[data-admin-contagem]').textContent = lista.length + ' de ' + dados.assinantes.length + ' ' + F.plural(dados.assinantes.length, 'conta', 'contas') + '. Contas de administrador não aparecem aqui.';
  }

  /* ---------- Pagamentos ---------- */
  function renderPagamentos() {
    var corpo = $('[data-admin-pagamentos] tbody');
    corpo.textContent = '';
    dados.pagamentos.forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(celula('Data', data(p.data)));
      tr.appendChild(celula('Cliente', p.cliente));
      tr.appendChild(celula('Plano', (PLANOS[p.plano] || p.plano) + (p.comDesconto ? ' (50%)' : '')));
      tr.appendChild(celula('Forma', p.meio === 'pix' ? 'Pix' : 'Cartão'));
      tr.appendChild(celula('Valor', reais(p.valor)));
      tr.appendChild(celula('Situação', badge(STATUS[p.status] || { nome: p.status, classe: 'badge--agua' })));
      corpo.appendChild(tr);
    });
    $('[data-admin-pagamentos-vazio]').hidden = dados.pagamentos.length > 0;
    $('[data-admin-pagamentos]').hidden = dados.pagamentos.length === 0;
  }

  /* ---------- Carregar ---------- */
  async function carregar() {
    var botao = $('[data-admin-atualizar]');
    PF.setLoading(botao, true, 'Atualizando…');
    try {
      dados = await S.getPainelAdmin();
      renderVisao();
      renderFiltros();
      renderAssinantes();
      renderPagamentos();
      raiz.setAttribute('aria-busy', 'false');
    } catch (err) {
      raiz.setAttribute('aria-busy', 'false');
      if (/restrito/i.test(err.message || '')) {
        document.querySelectorAll('[data-admin-secao]').forEach(function (s) { s.hidden = true; });
        document.querySelector('.admin-abas').hidden = true;
        $('[data-admin-negado]').hidden = false;
      } else {
        PF.toast(err.message || 'Não foi possível carregar o painel.', { tipo: 'erro' });
      }
    } finally {
      PF.setLoading(botao, false);
    }
  }

  $('[data-admin-filtros]').addEventListener('click', function (e) {
    var b = e.target instanceof Element ? e.target.closest('[data-filtro]') : null;
    if (!b) return;
    filtro.situacao = b.dataset.filtro;
    document.querySelectorAll('[data-filtro]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderAssinantes();
  });
  var espera = null;
  $('#admin-busca').addEventListener('input', function (e) {
    clearTimeout(espera);
    espera = setTimeout(function () { filtro.busca = e.target.value; renderAssinantes(); }, 150);
  });
  $('[data-admin-atualizar]').addEventListener('click', carregar);
  $('[data-sair]').addEventListener('click', function () {
    S.sair().then(function () { location.replace('login.html'); });
  });

  PF.auth.pronto.then(function (u) {
    if (!u) return;
    mostrarAba(false);
    carregar();
  });
})();
