/* ==========================================================================
   PontoFit — cesta.js
   Cesta de compras: ingredientes que faltaram nas receitas (vindos do
   leitor) e itens adicionados à mão. Marcar como comprado, remover,
   copiar a lista e esvaziar (com desfazer).
   Dados via PF.storage.getCesta / saveCesta.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var raiz = document.querySelector('[data-cesta]');
  if (!raiz) return;
  var $ = function (sel) { return raiz.querySelector(sel); };
  var form = document.getElementById('form-cesta');
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  var itens = [];
  var carregado = null;

  function gerarId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function carregar() {
    if (!carregado) carregado = S.getCesta().then(function (lista) { itens = lista; });
    return carregado;
  }
  function salvar() { return S.saveCesta(itens); }
  function pendentes() { return itens.filter(function (i) { return !i.comprado; }).length; }

  /* ---------- Badge do menu ---------- */
  function renderBadge(pular) {
    var badge = document.querySelector('[data-badge-cesta]');
    var leitor = document.querySelector('[data-badge-cesta-leitor]');
    if (!badge) return;
    var n = pendentes();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    leitor.textContent = n ? ', ' + n + (n === 1 ? ' item para comprar' : ' itens para comprar') : '';
    if (pular && n && !movimentoReduzido.matches) {
      badge.classList.remove('is-pulando');
      void badge.offsetWidth;
      badge.classList.add('is-pulando');
    }
  }

  /* ---------- Lista agrupada por receita ---------- */
  function render() {
    var grupos = $('[data-cesta-grupos]');
    grupos.textContent = '';
    $('[data-cesta-vazia]').hidden = itens.length > 0;
    $('[data-cesta-barra]').hidden = itens.length === 0;

    var ordem = [];
    var porGrupo = {};
    itens.forEach(function (i) {
      var chave = i.receitaId || '_avulso';
      if (!porGrupo[chave]) { porGrupo[chave] = []; ordem.push(chave); }
      porGrupo[chave].push(i);
    });

    ordem.forEach(function (chave) {
      var lista = porGrupo[chave];
      var card = document.createElement('section');
      card.className = 'card cesta__grupo';
      var h = document.createElement('h2');
      h.className = 'cesta__titulo';
      h.textContent = chave === '_avulso' ? 'Outros itens' : lista[0].receitaTitulo;
      card.appendChild(h);

      var ul = document.createElement('ul');
      ul.className = 'cesta__itens';
      ul.setAttribute('role', 'list');
      lista.forEach(function (i) {
        var li = document.createElement('li');
        li.className = 'cesta__item' + (i.comprado ? ' is-comprado' : '');
        li.dataset.id = i.id;

        var label = document.createElement('label');
        label.className = 'check cesta__marcar';
        var chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = !!i.comprado;
        chk.dataset.comprar = i.id;
        var span = document.createElement('span');
        span.textContent = i.texto;
        label.appendChild(chk);
        label.appendChild(span);

        var remover = document.createElement('button');
        remover.type = 'button';
        remover.className = 'cesta__remover';
        remover.dataset.remover = i.id;
        remover.setAttribute('aria-label', 'Remover ' + i.texto + ' da cesta');
        remover.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M18 6 6 18M6 6l12 12"/></svg>';

        li.appendChild(label);
        li.appendChild(remover);
        ul.appendChild(li);
      });
      card.appendChild(ul);
      grupos.appendChild(card);
    });

    var n = pendentes();
    var comprados = itens.length - n;
    $('[data-cesta-resumo]').textContent = (n === 1 ? '1 item para comprar' : n + ' itens para comprar') +
      (comprados ? ' · ' + comprados + (comprados === 1 ? ' já comprado' : ' já comprados') : '');
    $('[data-cesta-limpar-comprados]').disabled = comprados === 0;
    renderBadge(false);
  }

  /* ---------- API usada pelo leitor de receitas ---------- */
  PF.cesta = {
    /** Adiciona itens que ainda não estão pendentes na cesta. → quantos entraram */
    adicionar: async function (novos) {
      await carregar();
      var entraram = 0;
      novos.forEach(function (n) {
        var repetido = itens.some(function (i) {
          return !i.comprado && i.receitaId === n.receitaId && i.texto.toLowerCase() === n.texto.toLowerCase();
        });
        if (repetido) return;
        itens.push({ id: gerarId(), texto: n.texto, receitaId: n.receitaId || null, receitaTitulo: n.receitaTitulo || '', comprado: false, criadoEm: new Date().toISOString() });
        entraram++;
      });
      if (entraram) {
        await salvar();
        render();
        renderBadge(true);
      }
      return entraram;
    }
  };

  /* ---------- Ações na seção ---------- */
  raiz.addEventListener('change', async function (e) {
    var chk = e.target;
    if (!(chk instanceof HTMLInputElement) || !chk.dataset.comprar) return;
    var item = itens.find(function (i) { return i.id === chk.dataset.comprar; });
    if (!item) return;
    item.comprado = chk.checked;
    chk.closest('.cesta__item').classList.toggle('is-comprado', chk.checked);
    await salvar();
    var foco = chk.dataset.comprar;
    render();
    var volta = raiz.querySelector('[data-comprar="' + foco + '"]');
    if (volta) volta.focus();
  });

  raiz.addEventListener('click', async function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;

    var remover = alvo.closest('[data-remover]');
    if (remover) {
      var idx = itens.findIndex(function (i) { return i.id === remover.dataset.remover; });
      var item = itens.splice(idx, 1)[0];
      await salvar();
      render();
      $('#cesta-item').focus();
      PF.toast('“' + item.texto + '” saiu da cesta.', {
        tipo: 'info',
        acao: { texto: 'Desfazer', onClick: async function () { itens.splice(idx, 0, item); await salvar(); render(); } }
      });
      return;
    }

    if (alvo.closest('[data-cesta-limpar-comprados]')) {
      var antes = itens.slice();
      itens = itens.filter(function (i) { return !i.comprado; });
      await salvar();
      render();
      PF.toast('Os itens comprados saíram da lista.', {
        tipo: 'info',
        acao: { texto: 'Desfazer', onClick: async function () { itens = antes; await salvar(); render(); } }
      });
      return;
    }

    if (alvo.closest('[data-cesta-esvaziar]')) {
      var copia = itens.slice();
      itens = [];
      await salvar();
      render();
      PF.toast('A cesta foi esvaziada.', {
        tipo: 'info',
        duracao: 7000,
        acao: { texto: 'Desfazer', onClick: async function () { itens = copia; await salvar(); render(); } }
      });
      return;
    }

    if (alvo.closest('[data-cesta-copiar]')) {
      var linhas = ['Lista de compras (PontoFit)'];
      itens.filter(function (i) { return !i.comprado; }).forEach(function (i) { linhas.push('[ ] ' + i.texto); });
      try {
        await navigator.clipboard.writeText(linhas.join('\n'));
        PF.toast('A lista foi copiada. É só colar no WhatsApp ou no bloco de notas.', { titulo: 'Lista copiada' });
      } catch (err) {
        PF.toast('Não consegui copiar a lista neste navegador.', { tipo: 'erro' });
      }
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var campo = form.item;
    var texto = campo.value.trim();
    var erro = document.getElementById('cesta-item-erro');
    if (!texto) {
      erro.textContent = 'Escreva o que você quer comprar.';
      campo.setAttribute('aria-invalid', 'true');
      campo.focus();
      return;
    }
    erro.textContent = '';
    campo.setAttribute('aria-invalid', 'false');
    await carregar();
    itens.push({ id: gerarId(), texto: texto, receitaId: null, receitaTitulo: '', comprado: false, criadoEm: new Date().toISOString() });
    await salvar();
    campo.value = '';
    render();
    renderBadge(true);
    campo.focus();
  });

  /* ---------- Início ---------- */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'cesta') return;
    await carregar();
    render();
  });

  PF.auth.pronto.then(async function (usuario) {
    if (!usuario) return;
    await carregar();
    render();
  });
})();
