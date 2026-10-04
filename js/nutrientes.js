/* ==========================================================================
   PontoFit — nutrientes.js
   Seção "Vitaminas": guia de vitaminas e minerais com fontes naturais,
   sinais de falta, quando a suplementação costuma ser indicada, cuidados na
   gestação e receitas do livro que levam esses alimentos.
   Conteúdo em js/nutrientes-dados.js (educativo, sem doses de suplementos).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var raiz = document.querySelector('[data-nutrientes]');
  if (!raiz || !PF.nutrientes) return;
  var $ = function (sel, ctx) { return (ctx || raiz).querySelector(sel); };

  var estado = { filtro: 'todos', renderizado: false };

  function normalizar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  /** Receitas do livro com algum dos ingredientes do nutriente (palavra inteira). */
  function receitasCom(nutriente) {
    var termos = nutriente.ingredientes;
    return (PF.receitas || []).filter(function (r) {
      var texto = ' ' + normalizar(r.ingredientes.join(' ')).replace(/[^a-z0-9-]+/g, ' ') + ' ';
      return termos.some(function (t) { return texto.indexOf(' ' + t + ' ') >= 0; });
    });
  }

  function bloco(rotulo, texto, classe) {
    var d = el('div', 'nutriente__bloco' + (classe ? ' ' + classe : ''));
    d.appendChild(el('p', 'nutriente__rotulo', rotulo));
    d.appendChild(el('p', null, texto));
    return d;
  }

  function cartao(n) {
    var li = el('li', 'card nutriente nutriente--' + n.cor);
    li.id = 'nutriente-' + n.id;
    li.dataset.nutriente = n.id;

    var topo = el('div', 'nutriente__topo');
    topo.appendChild(el('h2', 'nutriente__nome', n.nome));
    topo.appendChild(el('p', 'nutriente__resumo', n.resumo));
    li.appendChild(topo);

    li.appendChild(el('p', null, n.paraQue));

    li.appendChild(el('p', 'nutriente__rotulo', 'Onde encontrar'));
    var chips = el('ul', 'nutriente__alimentos');
    chips.setAttribute('role', 'list');
    n.alimentos.forEach(function (a) { chips.appendChild(el('li', null, a)); });
    li.appendChild(chips);
    li.appendChild(el('p', 'nutriente__dica', n.dica));

    var mais = el('details', 'nutriente__mais');
    mais.appendChild(el('summary', null, 'Sinais de falta, suplementação e gestação'));
    mais.appendChild(bloco('Sinais de que pode estar faltando', n.falta));
    mais.appendChild(bloco('Quando a suplementação costuma ser indicada', n.suplementar));
    mais.appendChild(bloco('Na gestação', n.gestacao, 'nutriente__bloco--gestacao'));
    li.appendChild(mais);

    var receitas = receitasCom(n);
    if (receitas.length) {
      li.appendChild(el('p', 'nutriente__rotulo', receitas.length + (receitas.length === 1 ? ' receita do PontoFit com esses alimentos' : ' receitas do PontoFit com esses alimentos')));
      var lista = el('div', 'nutriente__receitas');
      receitas.slice(0, 4).forEach(function (r) {
        var b = el('button', 'nutriente__receita', r.titulo);
        b.type = 'button';
        b.dataset.receita = r.id;
        lista.appendChild(b);
      });
      li.appendChild(lista);
    }
    return li;
  }

  function render() {
    if (!estado.renderizado) {
      var ul = $('[data-nutrientes-lista]');
      PF.nutrientes.forEach(function (n) { ul.appendChild(cartao(n)); });
      var orient = $('[data-nutrientes-orientacoes]');
      (PF.nutrientesOrientacoes || []).forEach(function (o) {
        var li = el('li');
        li.appendChild(el('strong', null, o.titulo));
        li.appendChild(el('p', 'texto-sm', o.texto));
        orient.appendChild(li);
      });
      var nav = $('[data-nutrientes-atalhos]');
      PF.nutrientes.forEach(function (n) {
        var a = el('a', 'filtro', n.nome.replace(/ \(.*\)$/, ''));
        a.href = '#nutriente-' + n.id;
        a.dataset.atalho = n.id;
        nav.appendChild(a);
      });
      estado.renderizado = true;
    }
  }

  raiz.addEventListener('click', function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;
    var atalho = alvo.closest('[data-atalho]');
    if (atalho) {
      // Rola até o cartão sem trocar o hash (o hash é a navegação entre seções).
      e.preventDefault();
      var cartaoEl = document.getElementById('nutriente-' + atalho.dataset.atalho);
      if (cartaoEl) {
        cartaoEl.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        cartaoEl.classList.remove('nutriente--destaque');
        void cartaoEl.offsetWidth;
        cartaoEl.classList.add('nutriente--destaque');
      }
      return;
    }
    var receita = alvo.closest('[data-receita]');
    if (receita) {
      var id = receita.dataset.receita;
      location.hash = '#receitas';
      document.addEventListener('pf:secao', function abrir(ev) {
        if (ev.detail.secao !== 'receitas') return;
        document.removeEventListener('pf:secao', abrir);
        setTimeout(function () { if (PF.livroReceitas) PF.livroReceitas.abrirPorId(id); }, 50);
      });
    }
  });

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao === 'nutrientes') render();
  });
})();
