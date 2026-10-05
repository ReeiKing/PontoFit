/* ==========================================================================
   PontoFit — convite.js
   Página do convite (convite.html?c=CODIGO): mostra o profissional e, com a
   pessoa logada, pede a autorização e o que compartilhar (/api/vinculos).
   Sem login: guarda o código (para quem confirma o e-mail e volta pelo app)
   e leva ao cadastro/login, que retorna para cá.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var raiz = document.querySelector('[data-convite]');
  if (!raiz) return;
  var $ = function (sel) { return raiz.querySelector(sel); };
  var CHAVE = 'pf-convite-pendente';

  var codigo = String(new URLSearchParams(location.search).get('c') || '').trim().toUpperCase();
  var profissional = null;

  function mostrar(sel) {
    ['[data-convite-carregando]', '[data-convite-erro]', '[data-convite-ok]'].forEach(function (s) { $(s).hidden = s !== sel; });
    raiz.setAttribute('aria-busy', 'false');
  }

  function guardarPendente() { try { localStorage.setItem(CHAVE, codigo); } catch (e) { /* sem armazenamento: segue */ } }
  function limparPendente() { try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ } }

  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '').toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase();
  }

  async function iniciar() {
    if (!S) return; // storage.js mostra a faixa de erro de configuração
    if (!/^[A-Z0-9-]{4,24}$/.test(codigo)) { limparPendente(); mostrar('[data-convite-erro]'); return; }
    try {
      profissional = await S.getConvite(codigo);
    } catch (err) {
      limparPendente();
      $('[data-convite-erro-texto]').textContent = err.message || 'Peça um link novo ao seu profissional.';
      mostrar('[data-convite-erro]');
      return;
    }
    $('[data-prof-nome]').textContent = profissional.nome;
    $('[data-prof-iniciais]').textContent = iniciais(profissional.nome);
    $('[data-prof-info]').textContent = [profissional.profissaoNome, profissional.registro, profissional.empresa].filter(Boolean).join(' · ');
    document.title = profissional.nome + ' convida você | PontoFit';
    mostrar('[data-convite-ok]');

    var usuario = null;
    try { usuario = await S.getUser(); } catch (e) { usuario = null; }
    if (!usuario) {
      guardarPendente();
      var voltar = encodeURIComponent('convite.html?c=' + codigo);
      $('[data-link-cadastro]').href = 'login.html?voltar=' + voltar + '#cadastro';
      $('[data-link-entrar]').href = 'login.html?voltar=' + voltar;
      $('[data-convite-sem-login]').hidden = false;
      return;
    }
    $('[data-convite-form]').hidden = false;
  }

  $('[data-convite-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var form = e.target;
    var erro = $('[data-convite-form-erro]');
    erro.textContent = '';
    var compartilha = {};
    ['peso', 'agua', 'medicamentos', 'ficha', 'gestacao'].forEach(function (k) { compartilha[k] = form[k].checked; });
    if (!Object.keys(compartilha).some(function (k) { return compartilha[k]; })) {
      erro.textContent = 'Marque pelo menos uma informação para compartilhar.';
      return;
    }
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Autorizando…');
    try {
      var r = await S.aceitarConvite(codigo, compartilha);
      limparPendente();
      form.hidden = true;
      $('[data-pronto-nome]').textContent = r.profissional || profissional.nome;
      $('[data-convite-pronto]').hidden = false;
    } catch (err) {
      erro.textContent = err.message || 'Não foi possível autorizar agora. Tente de novo.';
    } finally {
      PF.setLoading(botao, false);
    }
  });

  $('.convite__recusar').addEventListener('click', limparPendente);

  iniciar();
})();
