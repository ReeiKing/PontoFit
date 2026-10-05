/* ==========================================================================
   PontoFit — admin.js
   Página de administração (admin.html): visão geral do negócio, lista de
   assinantes com a situação do acesso (ativo, a vencer, vencido, nunca pagou,
   cortesia, em teste), pagamentos recentes, painel "Gerenciar cliente"
   (dados, senha, cortesia, acesso, plano; /api/admin/cliente) e exportação
   em planilha (CSV para Excel/Sheets).
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
    cortesia: { nome: 'Cortesia', classe: 'badge--agua' },
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
      { nome: 'Cortesia', valor: n.cortesia || 0, texto: String(n.cortesia || 0), cor: 'agua' },
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
      if (a.profissional) contagem.profissionais = (contagem.profissionais || 0) + 1;
    });
    [['todos', 'Todos'], ['ativo', 'Ativos'], ['a-vencer', 'A vencer'], ['vencido', 'Vencidos'], ['bloqueados', 'Bloqueados'], ['sem-pagamento', 'Nunca pagaram'], ['cortesia', 'Cortesia'], ['teste', 'Em teste'], ['profissionais', 'Profissionais']]
      .forEach(function (f) {
        var b = el('button', 'filtro', f[1] + ' (' + (contagem[f[0]] || 0) + ')');
        b.type = 'button';
        b.dataset.filtro = f[0];
        b.setAttribute('aria-pressed', String(filtro.situacao === f[0]));
        caixa.appendChild(b);
      });
  }

  /** Assinantes com o filtro e a busca da tela (também usado na planilha). */
  function assinantesFiltrados() {
    var termo = normalizar(filtro.busca);
    return dados.assinantes.filter(function (a) {
      if (filtro.situacao === 'bloqueados' && !a.bloqueado) return false;
      if (filtro.situacao === 'profissionais' && !a.profissional) return false;
      if (['todos', 'bloqueados', 'profissionais'].indexOf(filtro.situacao) < 0 && a.situacao !== filtro.situacao) return false;
      return !termo || normalizar([a.nome, a.email, a.cpf].join(' ')).indexOf(termo) >= 0;
    });
  }

  function renderAssinantes() {
    var lista = assinantesFiltrados();
    var corpo = $('[data-admin-assinantes] tbody');
    corpo.textContent = '';
    lista.forEach(function (a) {
      var tr = el('tr');
      var quem = el('div', 'admin-quem');
      quem.appendChild(el('strong', null, a.nome || '(sem nome)'));
      quem.appendChild(el('span', 'texto-sm texto-sec', a.email + (a.emailConfirmado ? '' : ' · e-mail não confirmado')));
      if (a.cpf) quem.appendChild(el('span', 'texto-xs texto-sec', 'CPF ' + a.cpf));
      if (a.profissional) {
        quem.appendChild(el('span', 'badge badge--agua', a.profissional.profissao + ' · ' + a.profissional.pacientes +
          (a.profissional.pacientes === 1 ? ' paciente' : ' pacientes')));
      }
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
      var acao = el('td', 'tabela__acao');
      var botao = el('button', 'btn btn--sm btn--secundario', 'Gerenciar');
      botao.type = 'button';
      botao.dataset.gerenciarId = a.id;
      botao.setAttribute('aria-label', 'Gerenciar ' + (a.nome || a.email));
      acao.appendChild(botao);
      tr.appendChild(acao);
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

  /* ---------- Liberações manuais (histórico) ---------- */
  function renderLiberacoes() {
    var lista = dados.liberacoes || [];
    var corpo = $('[data-admin-liberacoes] tbody');
    corpo.textContent = '';
    lista.forEach(function (l) {
      var tr = el('tr');
      tr.appendChild(celula('Data', data(l.data)));
      tr.appendChild(celula('Cliente', l.cliente));
      tr.appendChild(celula('Dias', '+' + l.dias));
      tr.appendChild(celula('Acesso', (l.acessoAntes ? data(l.acessoAntes) : '—') + ' → ' + data(l.acessoDepois)));
      tr.appendChild(celula('Motivo', l.motivo));
      tr.appendChild(celula('Por', l.admin));
      corpo.appendChild(tr);
    });
    $('[data-admin-liberacoes-vazio]').hidden = lista.length > 0;
    $('[data-admin-liberacoes]').hidden = lista.length === 0;
  }

  /* ---------- Gerenciar cliente (painel lateral) ---------- */
  var ger = $('[data-gerenciar]');
  var gerCorpo = $('[data-ger-corpo]');
  var cliente = null;      // dados vindos de /api/admin/cliente
  var alterouAlgo = false; // recarrega a lista ao fechar

  var NOMES_ACAO = {
    nome: 'Nome alterado', email: 'E-mail alterado', cpf: 'CPF alterado', senha: 'Senha trocada pela administração',
    acesso: 'Data de acesso definida', plano: 'Plano preferido alterado', 'confirmar-email': 'E-mail confirmado pela administração',
    sessoes: 'Desconectado de todos os aparelhos'
  };

  function gerErro(msg) { $('[data-ger-erro]').textContent = msg || ''; }

  function textoHistorico(h) {
    if (h.tipo === 'pagamento') {
      return (h.status === 'approved' ? 'Pagou ' : 'Pagamento ' + ((STATUS[h.status] || { nome: h.status }).nome).toLowerCase() + ': ') +
        (PLANOS[h.plano] || h.plano) + ' · ' + reais(h.valor) + ' · ' + (h.meio === 'pix' ? 'Pix' : 'Cartão') + (h.comDesconto ? ' (50%)' : '');
    }
    if (h.tipo === 'liberacao') return 'Cortesia de ' + h.dias + ' ' + F.plural(h.dias, 'dia', 'dias') + ' (' + h.motivo + ') · acesso até ' + data(h.depois);
    var d = h.detalhes || {};
    var extra = '';
    if (h.acao === 'acesso') extra = ': ' + (d.antes ? data(d.antes) : '—') + ' → ' + data(d.depois) + (d.motivo ? ' (' + d.motivo + ')' : '');
    else if (h.acao === 'email' || h.acao === 'nome' || h.acao === 'cpf') extra = ': ' + (d.antes || '—') + ' → ' + d.depois;
    else if (h.acao === 'plano') extra = ': ' + (PLANOS[d.antes] || d.antes || '—') + ' → ' + (PLANOS[d.depois] || d.depois);
    else if (h.acao === 'senha' && d.desconectou) extra = ' e cliente desconectado dos aparelhos';
    return (NOMES_ACAO[h.acao] || h.acao) + extra;
  }

  function quando(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  }

  function renderCliente() {
    var c = cliente;
    $('[data-ger-nome]').textContent = c.nome || '(sem nome)';
    $('[data-ger-email]').textContent = c.email;
    var ativo = c.acessoAte && c.acessoAte >= dados.hoje;
    $('[data-ger-acesso]').textContent = c.acessoAte ? data(c.acessoAte) + (ativo ? '' : ' (bloqueado)') : '—';
    $('[data-ger-login]').textContent = c.ultimoLogin ? quando(c.ultimoLogin) : 'nunca entrou';
    $('[data-ger-criada]').textContent = c.criadoEm ? quando(c.criadoEm) : '—';
    $('[data-ger-confirmado]').textContent = c.emailConfirmado ? 'confirmado' : 'não confirmado';
    $('[data-ger-confirmar]').hidden = c.emailConfirmado;

    var fDados = gerCorpo.querySelector('[data-ger-form="dados"]');
    fDados.nome.value = c.nome;
    fDados.email.value = c.email;
    fDados.cpf.value = '';
    fDados.cpf.placeholder = c.cpf ? 'Deixe em branco para manter' : 'Digite o CPF';
    $('[data-ger-cpf-atual]').textContent = c.cpf ? 'CPF atual: ' + c.cpf + '. Preencha só para trocar.' : 'Conta sem CPF cadastrado.';

    var fAcesso = gerCorpo.querySelector('[data-ger-form="acesso"]');
    fAcesso.data.value = c.acessoAte && c.acessoAte < '2099-01-01' ? c.acessoAte : '';
    gerCorpo.querySelector('[data-ger-form="plano"]').plano.value = c.plano;

    var ul = $('[data-ger-historico]');
    ul.textContent = '';
    if (!c.historico.length) ul.appendChild(el('li', 'texto-sec', 'Nada registrado ainda.'));
    c.historico.forEach(function (h) {
      var li = el('li', 'ger-historico__item ger-historico__item--' + h.tipo);
      li.appendChild(el('span', 'ger-historico__quando', quando(h.quando)));
      li.appendChild(el('span', null, textoHistorico(h)));
      ul.appendChild(li);
    });
    previaCortesia();
    gerCorpo.setAttribute('aria-busy', 'false');
  }

  async function abrirGerenciar(id) {
    cliente = null;
    alterouAlgo = false;
    gerErro('');
    gerCorpo.setAttribute('aria-busy', 'true');
    gerCorpo.querySelectorAll('form').forEach(function (f) { f.reset(); });
    $('[data-ger-nome]').textContent = 'Carregando…';
    $('[data-ger-email]').textContent = '';
    if (typeof ger.showModal === 'function') ger.showModal();
    try {
      cliente = await S.getClienteAdmin(id);
      renderCliente();
    } catch (err) {
      gerErro(err.message || 'Não foi possível carregar o cliente.');
    }
  }

  /** Envia uma ação; atualiza o painel com a resposta. */
  async function executar(acao, campos, botao, mensagem) {
    if (!cliente) return false;
    gerErro('');
    PF.setLoading(botao, true, 'Salvando…');
    try {
      var r = await S.alterarClienteAdmin(cliente.id, acao, campos);
      cliente = r;
      alterouAlgo = true;
      renderCliente();
      if (r.alterado && !r.alterado.length) PF.toast('Nada foi alterado.', { tipo: 'info' });
      else PF.toast(mensagem, { titulo: cliente.nome || cliente.email });
      return true;
    } catch (err) {
      gerErro(err.message || 'Não foi possível salvar.');
      return false;
    } finally {
      PF.setLoading(botao, false);
    }
  }

  // Dados
  gerCorpo.querySelector('[data-ger-form="dados"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var cpf = f.cpf.value.replace(/\D/g, '');
    if (cpf && cpf.length !== 11) { gerErro('O CPF tem 11 números.'); f.cpf.focus(); return; }
    executar('dados', { nome: f.nome.value, email: f.email.value, cpf: cpf || null }, f.querySelector('[type="submit"]'), 'Dados atualizados.');
  });
  gerCorpo.querySelector('[name="cpf"]').addEventListener('input', function (e) {
    var d = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  });

  // Senha
  function senhaForte() {
    var letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';
    var numeros = '23456789';
    var todos = letras + numeros;
    var n = new Uint32Array(12);
    crypto.getRandomValues(n);
    var s = Array.prototype.map.call(n, function (x) { return todos[x % todos.length]; });
    s[3] = numeros[n[3] % numeros.length];   // garante número
    s[7] = letras[n[7] % letras.length];     // garante letra
    return s.join('');
  }
  $('[data-ger-gerar]').addEventListener('click', function () {
    var campo = gerCorpo.querySelector('[name="senha"]');
    campo.value = senhaForte();
    campo.focus();
    campo.select();
  });
  $('[data-ger-copiar]').addEventListener('click', async function () {
    var campo = gerCorpo.querySelector('[name="senha"]');
    if (!campo.value) return;
    try { await navigator.clipboard.writeText(campo.value); } catch (e) { campo.select(); document.execCommand('copy'); }
    PF.toast('Senha copiada.', { tipo: 'info', duracao: 2500 });
  });
  gerCorpo.querySelector('[data-ger-form="senha"]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = e.target;
    var senha = f.senha.value;
    if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { gerErro('A senha precisa ter pelo menos 8 caracteres, com letras e números.'); f.senha.focus(); return; }
    if (!window.confirm('Trocar a senha de ' + (cliente.nome || cliente.email) + '? A senha antiga deixa de funcionar.')) return;
    var ok = await executar('senha', { senha: senha, desconectar: f.desconectar.checked }, f.querySelector('[type="submit"]'),
      'Senha trocada' + (f.desconectar.checked ? ' e cliente desconectado dos aparelhos.' : '.'));
    if (ok) f.senha.value = '';
  });

  // Cortesia por plano
  function diasCortesia() {
    var f = gerCorpo.querySelector('[data-ger-form="cortesia"]');
    var opcao = f.querySelector('[name="opcao"]:checked').value;
    return opcao === 'outro' ? Number(f.dias.value) : Number(opcao);
  }
  var NOME_CORTESIA = { 7: 'Plano 7 dias', 30: 'Plano 30 dias', 180: 'Plano 6 meses' };
  function previaCortesia() {
    var f = gerCorpo.querySelector('[data-ger-form="cortesia"]');
    var opcao = f.querySelector('[name="opcao"]:checked').value;
    $('[data-ger-outro]').hidden = opcao !== 'outro';
    if (!f.motivo.dataset.editado) f.motivo.value = 'Cortesia: ' + (NOME_CORTESIA[opcao] || 'dias extras');
    var dias = diasCortesia();
    var previa = $('[data-ger-previa]');
    if (!cliente || !Number.isInteger(dias) || dias < 1 || dias > 365) { previa.textContent = ''; return; }
    var base = cliente.acessoAte && cliente.acessoAte >= dados.hoje ? cliente.acessoAte : F.somarDias(dados.hoje, -1);
    previa.textContent = 'O acesso passa a valer até ' + F.dataExtenso(F.somarDias(base, dias), true) + '.';
  }
  var fCortesia = gerCorpo.querySelector('[data-ger-form="cortesia"]');
  fCortesia.addEventListener('change', previaCortesia);
  fCortesia.addEventListener('input', function (e) {
    if (e.target.name === 'motivo') e.target.dataset.editado = '1';
    previaCortesia();
  });
  fCortesia.addEventListener('reset', function () { delete fCortesia.motivo.dataset.editado; setTimeout(previaCortesia, 0); });
  fCortesia.addEventListener('submit', function (e) {
    e.preventDefault();
    var dias = diasCortesia();
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) { gerErro('Escolha de 1 a 365 dias.'); return; }
    executar('cortesia', { dias: dias, motivo: fCortesia.motivo.value }, fCortesia.querySelector('[type="submit"]'),
      'Cortesia de ' + dias + ' ' + F.plural(dias, 'dia', 'dias') + ' concedida.');
  });

  // Data exata do acesso / encerrar
  var fAcesso = gerCorpo.querySelector('[data-ger-form="acesso"]');
  fAcesso.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!fAcesso.data.value) { gerErro('Escolha a data.'); fAcesso.data.focus(); return; }
    executar('acesso', { data: fAcesso.data.value, motivo: fAcesso.motivo.value || 'Ajuste pela administração' }, fAcesso.querySelector('[type="submit"]'),
      'Acesso definido até ' + data(fAcesso.data.value) + '.');
  });
  $('[data-ger-encerrar]').addEventListener('click', function () {
    if (!cliente || !window.confirm('Encerrar o acesso de ' + (cliente.nome || cliente.email) + ' agora? O app fica bloqueado até um novo pagamento ou cortesia.')) return;
    executar('acesso', { data: F.somarDias(dados.hoje, -1), motivo: fAcesso.motivo.value || 'Acesso encerrado pela administração' }, this, 'Acesso encerrado.');
  });

  // Plano preferido, confirmar e-mail e desconectar
  gerCorpo.querySelector('[data-ger-form="plano"]').addEventListener('submit', function (e) {
    e.preventDefault();
    executar('plano', { plano: e.target.plano.value }, e.target.querySelector('[type="submit"]'), 'Plano preferido atualizado.');
  });
  $('[data-ger-confirmar]').addEventListener('click', function () { executar('confirmar-email', {}, this, 'E-mail confirmado.'); });
  $('[data-ger-desconectar]').addEventListener('click', function () {
    if (!cliente || !window.confirm('Desconectar ' + (cliente.nome || cliente.email) + ' de todos os aparelhos?')) return;
    executar('desconectar', {}, this, 'Cliente desconectado de todos os aparelhos.');
  });

  /* ---------- Excluir conta (confirmação em dois passos) ---------- */
  var dExcluir = $('[data-excluir]');
  var passo1 = dExcluir.querySelector('[data-excluir-passo="1"]');
  var passo2 = dExcluir.querySelector('[data-excluir-passo="2"]');

  function mostrarPasso(n) {
    passo1.hidden = n !== 1;
    passo2.hidden = n !== 2;
    (n === 1 ? passo1.motivo : passo2.confirmacao).focus();
  }

  $('[data-ger-excluir]').addEventListener('click', function () {
    if (!cliente) return;
    passo1.reset();
    passo2.reset();
    passo2.querySelector('[type="submit"]').disabled = true;
    $('[data-excluir-erro-1]').textContent = '';
    $('[data-excluir-erro-2]').textContent = '';
    $('[data-excluir-nome]').textContent = cliente.nome || cliente.email;
    $('[data-excluir-email]').textContent = cliente.email;
    if (typeof dExcluir.showModal === 'function') dExcluir.showModal();
    mostrarPasso(1);
  });

  passo1.addEventListener('submit', function (e) {
    e.preventDefault();
    var erro = $('[data-excluir-erro-1]');
    if (passo1.motivo.value.trim().length < 3) { erro.textContent = 'Escreva o motivo da exclusão.'; passo1.motivo.focus(); return; }
    if (!passo1.entendo.checked) { erro.textContent = 'Marque que você entende que a exclusão não pode ser desfeita.'; return; }
    erro.textContent = '';
    mostrarPasso(2);
  });

  passo2.confirmacao.addEventListener('input', function () {
    var ok = passo2.confirmacao.value.trim().toLowerCase() === String(cliente.email).toLowerCase();
    passo2.querySelector('[type="submit"]').disabled = !ok;
  });
  dExcluir.querySelector('[data-excluir-voltar]').addEventListener('click', function () { mostrarPasso(1); });
  dExcluir.querySelectorAll('[data-excluir-fechar]').forEach(function (b) { b.addEventListener('click', function () { dExcluir.close(); }); });

  passo2.addEventListener('submit', async function (e) {
    e.preventDefault();
    var botao = passo2.querySelector('[type="submit"]');
    var erro = $('[data-excluir-erro-2]');
    erro.textContent = '';
    PF.setLoading(botao, true, 'Excluindo…');
    try {
      var r = await S.alterarClienteAdmin(cliente.id, 'excluir', { motivo: passo1.motivo.value.trim(), confirmacao: passo2.confirmacao.value.trim() });
      dExcluir.close();
      alterouAlgo = true;
      ger.close();
      PF.toast('A conta de ' + r.email + ' foi excluída. Pagamentos e registros continuam no painel.', { titulo: 'Conta excluída', duracao: 6000 });
    } catch (err) {
      erro.textContent = err.message || 'Não foi possível excluir agora.';
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Contas excluídas (registro) ---------- */
  function renderExcluidas() {
    var lista = dados.excluidas || [];
    var corpo = $('[data-admin-excluidas] tbody');
    corpo.textContent = '';
    lista.forEach(function (x) {
      var tr = el('tr');
      tr.appendChild(celula('Data', data(x.data)));
      var quem = el('div', 'admin-quem');
      quem.appendChild(el('strong', null, x.nome || '(sem nome)'));
      quem.appendChild(el('span', 'texto-sm texto-sec', x.email + (x.cpf ? ' · CPF ' + x.cpf : '')));
      tr.appendChild(celula('Cliente', quem));
      tr.appendChild(celula('Pagou', reais(x.totalPago) + (x.pagamentos ? ' (' + x.pagamentos + 'x)' : '')));
      tr.appendChild(celula('Motivo', x.motivo));
      tr.appendChild(celula('Por', x.admin));
      corpo.appendChild(tr);
    });
    $('[data-admin-excluidas-vazio]').hidden = lista.length > 0;
    $('[data-admin-excluidas]').hidden = lista.length === 0;
  }

  $('[data-ger-fechar]').addEventListener('click', function () { ger.close(); });
  ger.addEventListener('close', function () { if (alterouAlgo) carregar(); });

  /* ---------- Exportar planilha (CSV com ; e BOM, abre direto no Excel) ---------- */
  function csv(linhas) {
    return '\uFEFF' + linhas.map(function (l) {
      return l.map(function (v) {
        var t = v == null ? '' : String(v);
        return /[";\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
      }).join(';');
    }).join('\r\n');
  }
  function decimalBR(v) { return Number(v || 0).toFixed(2).replace('.', ','); }

  function baixar(nome, conteudo) {
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function exportar(tipo) {
    if (!dados) return;
    var linhas;
    if (tipo === 'assinantes') {
      linhas = [['Nome', 'E-mail', 'CPF', 'E-mail confirmado', 'Situação', 'Bloqueado', 'Acesso até', 'Plano preferido',
        'Último pagamento', 'Valor do último pagamento', 'Forma', 'Total pago (R$)', 'Nº de pagamentos', 'Dias liberados manualmente', 'Conta criada', 'Profissional', 'Pacientes vinculados']];
      assinantesFiltrados().forEach(function (a) {
        var u = a.ultimoPagamento;
        linhas.push([a.nome, a.email, a.cpf || '', a.emailConfirmado ? 'sim' : 'não', SITUACOES[a.situacao].nome, a.bloqueado ? 'sim' : 'não',
          a.acessoAte ? data(a.acessoAte) : '', PLANOS[a.plano] || a.plano, u ? data(u.data) : '', u ? decimalBR(u.valor) : '',
          u ? (u.meio === 'pix' ? 'Pix' : 'Cartão') : '', decimalBR(a.totalPago), a.pagamentos, a.diasLiberados || 0, data(a.criadoEm),
          a.profissional ? a.profissional.profissao : '', a.profissional ? a.profissional.pacientes : '']);
      });
    } else {
      linhas = [['Data', 'Cliente', 'Plano', 'Desconto 50%', 'Forma', 'Valor (R$)', 'Situação']];
      dados.pagamentos.forEach(function (p) {
        linhas.push([data(p.data), p.cliente, PLANOS[p.plano] || p.plano, p.comDesconto ? 'sim' : 'não', p.meio === 'pix' ? 'Pix' : 'Cartão',
          decimalBR(p.valor), (STATUS[p.status] || { nome: p.status }).nome]);
      });
    }
    baixar('pontofit-' + tipo + '-' + dados.hoje + '.csv', csv(linhas));
    PF.toast('Planilha com ' + (linhas.length - 1) + ' ' + F.plural(linhas.length - 1, 'linha', 'linhas') + ' baixada.', { tipo: 'info' });
  }

  document.querySelectorAll('[data-exportar]').forEach(function (b) {
    b.addEventListener('click', function () { exportar(b.dataset.exportar); });
  });

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
      renderLiberacoes();
      renderExcluidas();
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

  $('[data-admin-assinantes]').addEventListener('click', function (e) {
    var b = e.target instanceof Element ? e.target.closest('[data-gerenciar-id]') : null;
    if (b) abrirGerenciar(b.dataset.gerenciarId);
  });

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
