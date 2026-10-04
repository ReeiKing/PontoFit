/* ==========================================================================
   PontoFit — receitas.js
   Livro de receitas (tela inicial do app):
   - capas das categorias, que filtram o índice;
   - busca por nome ou ingrediente (ignora acentos);
   - leitor em <dialog>, folheado com botões ou com as setas do teclado.
   Conteúdo em js/receitas-dados.js.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var raiz = document.querySelector('[data-receitas]');
  var leitor = document.querySelector('[data-leitor]');
  if (!raiz || !leitor || !PF.receitas) return;

  var $ = function (sel, base) { return (base || raiz).querySelector(sel); };
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ICONES = {
    todas: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    salgadas: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    doces: '<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
    sucos: '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>',
    vitaminas: '<path d="M8 2h8"/><path d="M9 2v2.79a4 4 0 0 1-.67 2.22l-.66.98A4 4 0 0 0 7 10.21V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.79a4 4 0 0 0-.67-2.22l-.66-.98A4 4 0 0 1 15 4.79V2"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>'
  };

  function icone(id) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONES[id] + '</svg>';
  }

  var categorias = PF.receitasCategorias;
  var nomeCategoria = {};
  categorias.forEach(function (c) { nomeCategoria[c.id] = c.nome; });

  var estado = { categoria: 'todas', busca: '', lista: PF.receitas, aberta: -1 };

  /* ---------- Busca sem acento e sem diferença de maiúsculas ---------- */
  function normalizar(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  var indiceBusca = PF.receitas.map(function (r) {
    return normalizar([r.titulo, r.ingredientes.join(' '), nomeCategoria[r.categoria]].join(' '));
  });

  function filtrar() {
    var termos = normalizar(estado.busca).split(/\s+/).filter(Boolean);
    return PF.receitas.filter(function (r, i) {
      if (estado.categoria !== 'todas' && r.categoria !== estado.categoria) return false;
      return termos.every(function (t) { return indiceBusca[i].indexOf(t) >= 0; });
    });
  }

  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  /* ---------- Capas ---------- */
  function renderCapas() {
    var caixa = $('[data-capas]');
    caixa.textContent = '';
    var todas = [{ id: 'todas', nome: 'Todas', descricao: 'O livro inteiro, do salgado à vitamina.' }].concat(categorias);
    todas.forEach(function (c) {
      var total = c.id === 'todas' ? PF.receitas.length : PF.receitas.filter(function (r) { return r.categoria === c.id; }).length;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'capa capa--' + c.id;
      b.dataset.categoria = c.id;
      b.setAttribute('aria-pressed', String(estado.categoria === c.id));
      b.innerHTML = '<span class="capa__icone">' + icone(c.id) + '</span>';
      var texto = document.createElement('span');
      texto.className = 'capa__texto';
      var nome = document.createElement('span');
      nome.className = 'capa__nome';
      nome.textContent = c.nome;
      var qtd = document.createElement('span');
      qtd.className = 'capa__qtd';
      qtd.textContent = plural(total, 'receita', 'receitas');
      texto.appendChild(nome);
      texto.appendChild(qtd);
      b.appendChild(texto);
      b.title = c.descricao;
      caixa.appendChild(b);
    });
  }

  /* ---------- Índice ---------- */
  function renderIndice() {
    estado.lista = filtrar();
    var ul = $('[data-indice]');
    ul.textContent = '';
    estado.lista.forEach(function (r, i) {
      var li = document.createElement('li');
      li.className = 'receita-card receita-card--' + r.categoria;
      var botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'receita-card__botao';
      botao.dataset.abrir = String(i);
      botao.innerHTML = '<span class="receita-card__icone">' + icone(r.categoria) + '</span>';
      var cat = document.createElement('span');
      cat.className = 'receita-card__categoria';
      cat.textContent = nomeCategoria[r.categoria];
      var titulo = document.createElement('span');
      titulo.className = 'receita-card__titulo';
      titulo.textContent = r.titulo;
      var meta = document.createElement('span');
      meta.className = 'receita-card__meta';
      meta.textContent = r.tempo + ' · ' + r.porcoes;
      botao.appendChild(cat);
      botao.appendChild(titulo);
      botao.appendChild(meta);
      li.appendChild(botao);
      ul.appendChild(li);
    });

    var n = estado.lista.length;
    $('[data-indice-vazio]').hidden = n > 0;
    ul.hidden = n === 0;
    var onde = estado.categoria === 'todas' ? '' : ' em ' + nomeCategoria[estado.categoria];
    $('[data-busca-resultado]').textContent = estado.busca
      ? plural(n, 'receita encontrada', 'receitas encontradas') + onde + '.'
      : '';
  }

  raiz.addEventListener('click', function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    var capa = alvo.closest('[data-categoria]');
    if (capa) {
      estado.categoria = capa.dataset.categoria;
      raiz.querySelectorAll('[data-categoria]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === capa));
      });
      renderIndice();
      return;
    }
    var abrir = alvo.closest('[data-abrir]');
    if (abrir) { abrirReceita(Number(abrir.dataset.abrir), abrir); return; }
    if (alvo.closest('[data-limpar-busca]')) {
      estado.busca = '';
      estado.categoria = 'todas';
      $('#busca-receita').value = '';
      renderCapas();
      renderIndice();
      $('#busca-receita').focus();
    }
  });

  var esperaBusca = null;
  $('#busca-receita').addEventListener('input', function (e) {
    clearTimeout(esperaBusca);
    esperaBusca = setTimeout(function () {
      estado.busca = e.target.value;
      renderIndice();
    }, 120);
  });

  /* ---------- Leitor (página do livro) ---------- */
  var origemFoco = null;

  function preencherPagina(i) {
    var r = estado.lista[i];
    estado.aberta = i;
    leitor.className = 'leitor leitor--' + r.categoria;
    $('[data-leitor-categoria]', leitor).textContent = nomeCategoria[r.categoria];
    $('[data-leitor-titulo]', leitor).textContent = r.titulo;
    $('[data-leitor-meta]', leitor).textContent = 'Tempo: ' + r.tempo + ' · Rende ' + r.porcoes;

    var lista = $('[data-leitor-ingredientes]', leitor);
    lista.textContent = '';
    r.ingredientes.forEach(function (ing, n) {
      var li = document.createElement('li');
      var label = document.createElement('label');
      label.className = 'check leitor__ingrediente';
      var chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = 'ing-' + r.id + '-' + n;
      var span = document.createElement('span');
      span.textContent = ing;
      label.appendChild(chk);
      label.appendChild(span);
      li.appendChild(label);
      lista.appendChild(li);
    });

    atualizarBotaoCesta();

    var passos = $('[data-leitor-passos]', leitor);
    passos.textContent = '';
    r.preparo.forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = p;
      passos.appendChild(li);
    });

    var dica = $('[data-leitor-dica]', leitor);
    dica.textContent = '';
    if (r.dica) {
      var forte = document.createElement('strong');
      forte.textContent = 'Dica: ';
      dica.appendChild(forte);
      dica.appendChild(document.createTextNode(r.dica));
    }
    dica.hidden = !r.dica;

    var total = estado.lista.length;
    $('[data-leitor-numero]', leitor).textContent = 'Receita ' + (i + 1) + ' de ' + total;
    $('[data-leitor-anterior]', leitor).disabled = i === 0;
    $('[data-leitor-proxima]', leitor).disabled = i === total - 1;
    $('[data-leitor-pagina]', leitor).scrollTop = 0;
    leitor.scrollTop = 0;
  }

  function virarPagina(direcao) {
    var destino = estado.aberta + direcao;
    if (destino < 0 || destino >= estado.lista.length) return;
    var pagina = $('[data-leitor-pagina]', leitor);
    preencherPagina(destino);
    if (!movimentoReduzido.matches) {
      pagina.classList.remove('vira-direita', 'vira-esquerda');
      void pagina.offsetWidth;
      pagina.classList.add(direcao > 0 ? 'vira-direita' : 'vira-esquerda');
    }
    $('[data-leitor-titulo]', leitor).focus({ preventScroll: true });
  }

  function abrirReceita(i, origem) {
    origemFoco = origem || null;
    preencherPagina(i);
    if (typeof leitor.showModal === 'function') leitor.showModal();
    else leitor.setAttribute('open', '');
    document.documentElement.classList.add('leitor-aberto');
    $('[data-leitor-titulo]', leitor).focus({ preventScroll: true });
  }

  function fecharLeitor() {
    if (!leitor.open || leitor.classList.contains('is-fechando')) return;
    if (movimentoReduzido.matches) { fecharDeVez(); return; }
    // Anima a saída e só então fecha de verdade.
    leitor.classList.add('is-fechando');
    leitor.addEventListener('animationend', fecharDeVez, { once: true });
  }

  function fecharDeVez() {
    leitor.classList.remove('is-fechando');
    if (typeof leitor.close === 'function') leitor.close();
    else leitor.removeAttribute('open');
  }

  // Esc também passa pela animação de saída.
  leitor.addEventListener('cancel', function (e) {
    e.preventDefault();
    fecharLeitor();
  });

  /* ---------- Cesta: o que ficou sem marcar vai para a lista de compras ---------- */
  var botaoCesta = $('[data-leitor-cesta]', leitor);
  var textoCesta = $('[data-leitor-cesta-texto]', leitor);

  function faltando() {
    return Array.prototype.filter.call(
      leitor.querySelectorAll('[data-leitor-ingredientes] input'),
      function (c) { return !c.checked; }
    ).map(function (c) { return c.nextElementSibling.textContent; });
  }

  function atualizarBotaoCesta() {
    var n = faltando().length;
    botaoCesta.disabled = n === 0;
    botaoCesta.classList.remove('is-adicionado');
    textoCesta.textContent = n === 0
      ? 'Você já tem tudo para esta receita'
      : n === 1 ? 'Adicionar à cesta o item que falta' : 'Adicionar à cesta os ' + n + ' itens que faltam';
  }

  leitor.addEventListener('change', function (e) {
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') atualizarBotaoCesta();
  });

  botaoCesta.addEventListener('click', async function () {
    var r = estado.lista[estado.aberta];
    var itens = faltando();
    if (!itens.length || !PF.cesta) return;
    var novos = await PF.cesta.adicionar(itens.map(function (t) {
      return { texto: t, receitaId: r.id, receitaTitulo: r.titulo };
    }));
    botaoCesta.classList.add('is-adicionado');
    textoCesta.textContent = novos ? 'Pronto, está na cesta' : 'Esses itens já estavam na cesta';
    PF.toast(novos
      ? (novos === 1 ? '1 item de “' + r.titulo + '” foi' : novos + ' itens de “' + r.titulo + '” foram') + ' para a cesta de compras.'
      : 'Os itens que faltam para “' + r.titulo + '” já estavam na cesta.', {
      titulo: 'Cesta de compras',
      acao: { texto: 'Ver cesta', href: '#cesta' }
    });
  });

  leitor.addEventListener('close', function () {
    document.documentElement.classList.remove('leitor-aberto');
    // Volta o foco para o card da receita que estava aberta.
    var card = raiz.querySelector('[data-abrir="' + estado.aberta + '"]') || origemFoco;
    if (card) card.focus();
  });

  $('[data-leitor-fechar]', leitor).addEventListener('click', fecharLeitor);
  $('[data-leitor-anterior]', leitor).addEventListener('click', function () { virarPagina(-1); });
  $('[data-leitor-proxima]', leitor).addEventListener('click', function () { virarPagina(1); });

  // Clique fora da página (no fundo escurecido) fecha.
  leitor.addEventListener('click', function (e) {
    if (e.target === leitor) fecharLeitor();
  });

  // Setas do teclado folheiam (menos quando o foco está numa caixa de marcar).
  leitor.addEventListener('keydown', function (e) {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); virarPagina(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); virarPagina(-1); }
  });

  /* ---------- Início ---------- */
  renderCapas();
  renderIndice();

  /** Abre uma receita pelo id (usado pelo painel na "receita do dia"). */
  function abrirPorId(id) {
    var r = PF.receitas.find(function (x) { return x.id === id; });
    if (!r) return;
    var i = estado.lista.indexOf(r);
    if (i < 0) { estado.lista = PF.receitas; i = PF.receitas.indexOf(r); }
    abrirReceita(i);
  }
  PF.livroReceitas = { abrirPorId: abrirPorId };

  // Saiu da seção com o leitor aberto (ex.: botão voltar) → fecha.
  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao !== 'receitas') fecharLeitor();
  });
})();
