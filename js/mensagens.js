/* ==========================================================================
   PontoFit — mensagens.js
   Seção Mensagens do app (#mensagens): conversa com cada profissional que
   acompanha o paciente. O item do menu só aparece para quem tem vínculo, e
   mostra quantas mensagens novas chegaram (também em tempo real).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var raiz = document.querySelector('[data-mensagens]');
  if (!raiz || !S || !PF.conversa) return;
  var $ = function (sel) { return document.querySelector(sel); };

  var profissionais = [];
  var naoLidas = {};
  var atual = null;   // vínculo aberto
  var conversa = null;

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function totalNovas() {
    return Object.keys(naoLidas).reduce(function (t, k) { return t + naoLidas[k]; }, 0);
  }

  function atualizarBadge() {
    var n = totalNovas();
    var b = $('[data-badge-mensagens]');
    b.hidden = !n;
    b.textContent = n > 9 ? '9+' : String(n);
    $('[data-badge-mensagens-leitor]').textContent = n ? '(' + n + (n === 1 ? ' mensagem nova)' : ' mensagens novas)') : '';
    renderContatos();
  }

  function renderContatos() {
    var caixa = $('[data-mensagens-contatos]');
    caixa.hidden = profissionais.length < 2;
    caixa.textContent = '';
    profissionais.forEach(function (p) {
      var b = el('button', 'mensagens__contato');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(atual === p.id));
      b.dataset.vinculo = p.id;
      b.appendChild(el('strong', null, p.nome));
      b.appendChild(el('span', 'texto-xs texto-sec', p.profissaoNome));
      var n = naoLidas[p.id] || 0;
      if (n) b.appendChild(el('span', 'badge badge--laranja', String(n)));
      caixa.appendChild(b);
    });
  }

  function abrir(id) {
    var p = profissionais.find(function (x) { return x.id === id; });
    if (!p) return;
    if (conversa) conversa.destruir();
    atual = id;
    var quem = $('[data-mensagens-quem]');
    quem.textContent = '';
    quem.appendChild(el('strong', 'mensagens__nome', p.nome));
    quem.appendChild(el('span', 'texto-sm texto-sec', [p.profissaoNome, p.registro, p.empresa].filter(Boolean).join(' · ')));
    conversa = PF.conversa.montar($('[data-mensagens-caixa]'), { vinculoId: p.id, nomeOutro: p.nome });
    renderContatos();
  }

  function semProfissional() {
    var caixa = $('[data-mensagens-caixa]');
    $('[data-mensagens-quem]').textContent = '';
    caixa.textContent = '';
    caixa.appendChild(el('p', 'texto-sec', 'Nenhum profissional acompanha você ainda. Quando você aceitar o convite de um nutricionista ou da sua academia, a conversa aparece aqui.'));
  }

  $('[data-mensagens-contatos]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-vinculo]');
    if (b && b.dataset.vinculo !== atual) abrir(b.dataset.vinculo);
  });

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao === 'mensagens') {
      if (!profissionais.length) semProfissional();
      else if (!atual) {
        // Abre primeiro quem mandou mensagem nova.
        var comNovas = profissionais.find(function (p) { return naoLidas[p.id]; });
        abrir((comNovas || profissionais[0]).id);
      }
    } else if (e.detail.anterior === 'mensagens' && conversa) {
      conversa.destruir();
      conversa = null;
      atual = null;
    }
  });

  document.addEventListener('pf:mensagem', function (e) {
    var m = e.detail.mensagem;
    if (m.minha) return;
    var p = profissionais.find(function (x) { return x.id === e.detail.vinculoId; });
    if (!p) return;
    if (PF.app.secaoAtual === 'mensagens' && atual === p.id) return; // a conversa aberta marca como lida
    naoLidas[p.id] = (naoLidas[p.id] || 0) + 1;
    atualizarBadge();
    PF.toast(m.texto.slice(0, 120), { titulo: p.nome, tipo: 'info', acao: { texto: 'Responder', href: '#mensagens' } });
  });

  document.addEventListener('pf:mensagens-lidas', function (e) {
    if (!naoLidas[e.detail.vinculoId]) return;
    delete naoLidas[e.detail.vinculoId];
    atualizarBadge();
  });

  PF.auth.pronto.then(async function (u) {
    if (!u) return;
    try {
      var r = await S.getVinculos();
      profissionais = r.profissionais || [];
    } catch (e) { return; }
    if (!profissionais.length) return;
    $('[data-menu-mensagens]').hidden = false;
    PF.conversa.ouvir();
    naoLidas = await S.getNaoLidas().catch(function () { return {}; });
    atualizarBadge();
    if (PF.app.secaoAtual === 'mensagens' && !atual) abrir(profissionais[0].id);
  });
})();
