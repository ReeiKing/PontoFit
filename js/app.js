/* ==========================================================================
   PontoFit — app.js
   Layout da área do paciente (app.html):
   - navegação por hash (#inicio, #receitas, #cesta, #ficha, #evolucao, #medicamentos, #mensagens, #plano)
     sem recarregar, com transição entre as seções;
   - menu lateral fixo no desktop / gaveta no celular e tablet;
   - nome, e-mail e iniciais do usuário no menu.

   As seções (receitas.js, cesta.js, ficha.js, evolucao.js, medicamentos.js,
   plano.js) ouvem o evento
   'pf:secao' (detail.secao = id) para renderizar ao serem abertas, e
   podem usar PF.app.usuario / PF.app.atualizarUsuario().
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});
  // Na ordem do menu (define a direção da animação ao trocar de seção)
  var SECOES = {
    inicio: 'Início',
    receitas: 'Receitas',
    nutrientes: 'Vitaminas',
    cesta: 'Cesta de compras',
    ficha: 'Minha ficha',
    evolucao: 'Minha evolução',
    medicamentos: 'Medicamentos',
    gestacao: 'Gestação',
    mensagens: 'Mensagens',
    plano: 'Assinaturas'
  };
  var ORDEM = Object.keys(SECOES);
  var APELIDOS = { produtos: 'medicamentos' }; // links antigos de "Meus produtos"
  var PADRAO = 'inicio'; // depois do login, o app abre no painel (painel.js)

  var raiz = document.documentElement;
  var menu = document.getElementById('menu-app');
  var botaoAbrir = document.querySelector('[data-abrir-menu]');
  var escurecer = document.querySelector('.app__escurecer');
  var desktop = window.matchMedia('(min-width: 1024px)');
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  PF.app = { secaoAtual: null, usuario: null };

  /* ---------- Usuário no menu ---------- */
  function iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    var primeira = partes[0].charAt(0);
    var ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primeira + ultima).toUpperCase();
  }

  function mostrarUsuario(usuario) {
    PF.app.usuario = usuario;
    document.querySelectorAll('[data-nome-usuario]').forEach(function (el) { el.textContent = usuario.nome; });
    document.querySelectorAll('[data-email-usuario]').forEach(function (el) { el.textContent = usuario.email; });
    document.querySelectorAll('[data-iniciais]').forEach(function (el) { el.textContent = iniciais(usuario.nome); });
  }

  /** Relê o usuário (ex.: depois de mudar o nome na ficha). */
  PF.app.atualizarUsuario = async function () {
    var u = await PF.storage.getUser();
    if (u) mostrarUsuario(u);
    return u;
  };

  /* ---------- Gaveta (celular/tablet) ---------- */
  var elementosInertes = document.querySelectorAll('[data-inerte-com-gaveta]');

  function gavetaAberta() { return menu.classList.contains('is-aberto'); }

  function abrirGaveta() {
    if (desktop.matches) return;
    menu.classList.add('is-aberto');
    escurecer.classList.add('is-visivel');
    raiz.classList.add('gaveta-aberta');
    botaoAbrir.setAttribute('aria-expanded', 'true');
    // Enquanto a gaveta está aberta, o resto da página não recebe foco nem clique.
    elementosInertes.forEach(function (el) { el.inert = true; });
    var ativo = menu.querySelector('[aria-current="page"]') || menu.querySelector('a, button');
    if (ativo) ativo.focus();
  }

  function fecharGaveta(devolverFoco) {
    if (!gavetaAberta()) return;
    menu.classList.remove('is-aberto');
    escurecer.classList.remove('is-visivel');
    raiz.classList.remove('gaveta-aberta');
    botaoAbrir.setAttribute('aria-expanded', 'false');
    elementosInertes.forEach(function (el) { el.inert = false; });
    if (devolverFoco) botaoAbrir.focus();
  }

  botaoAbrir.addEventListener('click', abrirGaveta);
  document.querySelectorAll('[data-fechar-menu]').forEach(function (el) {
    el.addEventListener('click', function () { fecharGaveta(true); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && gavetaAberta()) fecharGaveta(true);
  });
  // Ao passar para o desktop, a gaveta deixa de existir.
  desktop.addEventListener('change', function (e) { if (e.matches) fecharGaveta(false); });

  /* ---------- Navegação por hash ---------- */
  function secaoDoHash() {
    var id = location.hash.replace('#', '');
    id = APELIDOS[id] || id;
    return Object.prototype.hasOwnProperty.call(SECOES, id) ? id : PADRAO;
  }

  function mostrarSecao(id, focar, comTransicao) {
    var anterior = PF.app.secaoAtual;
    PF.app.secaoAtual = id;

    document.querySelectorAll('[data-secao]').forEach(function (s) {
      var ativa = s.dataset.secao === id;
      s.hidden = !ativa;
      // Sem View Transitions, a seção nova entra com uma animação CSS simples.
      if (ativa && anterior && anterior !== id && !comTransicao && !movimentoReduzido.matches) {
        s.classList.remove('is-entrando');
        void s.offsetWidth; // reinicia a animação
        s.classList.add('is-entrando');
      }
    });

    document.querySelectorAll('[data-link-secao]').forEach(function (a) {
      if (a.dataset.linkSecao === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.title = SECOES[id] + ' | PontoFit';
    window.scrollTo(0, 0);

    // Leitores de tela e teclado vão para o título da seção aberta.
    if (focar) {
      var titulo = document.getElementById('titulo-' + id);
      if (titulo) titulo.focus({ preventScroll: true });
    }

    document.dispatchEvent(new CustomEvent('pf:secao', { detail: { secao: id, anterior: anterior } }));
  }

  /* ---------- Acesso bloqueado (sem plano pago) ----------
     Quem bloqueia de verdade é o banco (RLS exige acesso ativo); aqui o menu
     só deixa "Assinaturas" aberta. O plano.js dispara 'pf:acesso' quando um
     pagamento é aprovado. Acesso vale até acesso_ate, inclusive, sem
     tolerância (igual a private.acesso_ativo()). */
  var bloqueado = false;
  function definirBloqueio(acessoAte) {
    bloqueado = !acessoAte || PF.fmt.hojeISO() > acessoAte;
    if (bloqueado) document.documentElement.setAttribute('data-acesso-bloqueado', '');
    else document.documentElement.removeAttribute('data-acesso-bloqueado');
    document.querySelectorAll('[data-link-secao]').forEach(function (a) {
      if (a.dataset.linkSecao === 'plano') return;
      if (bloqueado) { a.setAttribute('aria-disabled', 'true'); a.setAttribute('tabindex', '-1'); }
      else { a.removeAttribute('aria-disabled'); a.removeAttribute('tabindex'); }
    });
  }

  document.addEventListener('pf:acesso', function (e) {
    var estava = bloqueado;
    definirBloqueio(e.detail.acessoAte);
    if (estava && !bloqueado) PF.toast('Receitas, ficha, evolução e medicamentos já estão liberados.', { titulo: 'Tudo liberado' });
  });

  // Hash inválido ou vazio → corrige a URL sem criar entrada no histórico.
  function secaoNormalizada() {
    var id = bloqueado ? 'plano' : secaoDoHash();
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    return id;
  }

  /* Transição entre seções: o conteúdo desliza para cima quando a seção nova
     está mais abaixo no menu, e para baixo quando está mais acima.
     Usa a View Transitions API onde existe (Chrome, Edge, Safari 18+). */
  function trocarSecao(id) {
    var anterior = PF.app.secaoAtual;
    if (anterior === id) return mostrarSecao(id, true);
    raiz.dataset.direcao = ORDEM.indexOf(id) >= ORDEM.indexOf(anterior) ? 'avanca' : 'volta';
    if (document.startViewTransition && !movimentoReduzido.matches) {
      var transicao = document.startViewTransition(function () { mostrarSecao(id, true, true); });
      // A transição pode ser interrompida (outra navegação, tela redimensionada).
      // A seção já foi trocada; só a animação é descartada, sem erro no console.
      var ignorar = function () {};
      transicao.ready.catch(ignorar);
      transicao.finished.catch(ignorar);
      transicao.updateCallbackDone.catch(ignorar);
    } else {
      mostrarSecao(id, true);
    }
  }

  window.addEventListener('hashchange', function () {
    fecharGaveta(false);
    trocarSecao(secaoNormalizada());
  });

  // Clicar no item já ativo só fecha a gaveta.
  document.querySelectorAll('[data-link-secao]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (a.dataset.linkSecao === PF.app.secaoAtual) fecharGaveta(false);
    });
  });

  /* ---------- Início ---------- */
  // Espera a sessão E todos os scripts da página (ficha.js, evolucao.js…)
  // estarem carregados; senão eles perderiam o primeiro evento 'pf:secao'.
  var paginaPronta = document.readyState === 'loading'
    ? new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })
    : Promise.resolve();

  Promise.all([PF.auth.pronto, paginaPronta]).then(function (resultado) {
    var usuario = resultado[0];
    if (!usuario) return; // redirecionando para o login
    // Convite de profissional aberto antes do login/cadastro: volta para ele.
    var convite = null;
    try { convite = localStorage.getItem('pf-convite-pendente'); } catch (e) { convite = null; }
    if (convite && /^[A-Z0-9-]{4,24}$/.test(convite)) {
      location.replace('convite.html?c=' + encodeURIComponent(convite));
      return;
    }
    mostrarUsuario(usuario);
    // Link para o painel do profissional (contas com perfil profissional).
    var profissional = PF.storage.getProfissional().then(function (r) { return r.profissional; }, function () { return null; });
    profissional.then(function (prof) {
      var item = document.querySelector('[data-menu-prof]');
      if (item) item.hidden = !prof;
    });
    // Link para a administração: só aparece se o servidor confirmar (api/admin/eu).
    PF.storage.souAdmin().then(function (admin) {
      var item = document.querySelector('[data-menu-admin]');
      if (item) item.hidden = !admin;
    });
    return PF.storage.getAcessoAte().then(definirBloqueio, function () { /* sem rede: o banco decide */ })
      .then(function () {
        mostrarSecao(secaoNormalizada(), false);
        if (!bloqueado) return;
        return profissional.then(function (prof) {
          if (prof) {
            PF.toast('O painel do profissional é gratuito. O app pessoal (receitas, evolução…) precisa de um plano.', {
              titulo: 'Conta profissional', tipo: 'info', duracao: 10000,
              acao: { texto: 'Abrir painel do profissional', href: 'profissional.html' }
            });
            return;
          }
          PF.toast('Escolha um plano e pague com Pix ou cartão para liberar o app na hora.', {
            titulo: 'Sem acesso ativo', tipo: 'aviso', duracao: 8000
          });
        });
      });
  });
})();
