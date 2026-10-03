/* ==========================================================================
   PontoFit — scroll-animations.js
   Animações ligadas ao scroll da landing page.
   - IntersectionObserver decide QUAIS seções estão na tela;
   - um único loop com requestAnimationFrame calcula o progresso (0 a 1)
     de cada seção visível e escreve em variáveis CSS / atributos SVG.
   Com prefers-reduced-motion: reduce, nada se move: tudo já aparece no
   estado final (a classe .anima não é aplicada no <html>).
   ========================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduzido) raiz.classList.add('anima');

  /* ---------- Utilitários ---------- */
  function limitar(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /**
   * Progresso de um elemento: 0 quando o topo dele chega a `inicio` da
   * altura da tela; 1 quando a base dele chega a `fim` da altura da tela.
   * Funciona nos dois sentidos (é só a posição atual).
   */
  function progresso(el, inicio, fim) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var distancia = r.height + vh * (inicio - fim);
    return limitar((vh * inicio - r.top) / distancia, 0, 1);
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* Seções visíveis (para não calcular o que está fora da tela) */
  var visiveis = new Set();
  var observadorVisiveis = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (e.isIntersecting) visiveis.add(e.target); else visiveis.delete(e.target);
    });
    agendar();
  }, { rootMargin: '10% 0px' });

  /* ---------- 1. Header, barra de leitura e "voltar ao topo" ---------- */
  var topo = document.querySelector('[data-topo]');
  var barraLeitura = document.querySelector('[data-progresso-leitura]');
  var voltarTopo = document.querySelector('[data-voltar-topo]');
  var anelTopo = voltarTopo && voltarTopo.querySelector('.voltar-topo__progresso');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  var mobile = window.matchMedia('(max-width: 1023px)');
  var ultimoY = window.scrollY;

  function atualizarTopo() {
    var y = window.scrollY;
    var max = raiz.scrollHeight - window.innerHeight;
    var p = max > 0 ? limitar(y / max, 0, 1) : 0;

    if (topo) {
      topo.classList.toggle('is-rolado', y > 50);
      // No celular/tablet: esconde ao descer, reaparece ao subir.
      var menuAberto = menuBtn && menuBtn.getAttribute('aria-expanded') === 'true';
      var delta = y - ultimoY;
      if (reduzido || !mobile.matches || menuAberto || y < 120) {
        topo.classList.remove('is-escondido');
      } else if (Math.abs(delta) > 6) {
        topo.classList.toggle('is-escondido', delta > 0);
      }
    }
    if (barraLeitura) barraLeitura.style.transform = 'scaleX(' + p + ')';
    if (voltarTopo) {
      voltarTopo.classList.toggle('is-visivel', p > 0.6);
      if (anelTopo) anelTopo.style.strokeDashoffset = String(100 - p * 100);
    }
    ultimoY = y;
  }

  if (voltarTopo) {
    voltarTopo.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
      // Leva o foco do teclado de volta ao início sem pular a página.
      var logo = document.querySelector('.topo .logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  /* ---------- 2. Copo d'água (enche ao descer, esvazia ao subir) ---------- */
  var secaoCopo = document.querySelector('[data-secao-copo]');
  var copo = secaoCopo && secaoCopo.querySelector('.hidratacao__copo');
  var textoNivel = secaoCopo && secaoCopo.querySelector('[data-copo-nivel]');
  var nivelAtual = -1;

  function definirNivel(n) {
    if (!copo) return;
    var pct = Math.round(n * 100);
    if (pct === nivelAtual) return;
    nivelAtual = pct;
    copo.style.setProperty('--nivel', n.toFixed(3));
    copo.classList.toggle('com-bolhas', n > 0.3);
    if (textoNivel) textoNivel.textContent = pct + '%';
  }

  function atualizarCopo() {
    // 0 quando o topo da seção está a 90% da tela; 100% quando ela começa a sair.
    definirNivel(progresso(secaoCopo, 0.9, 0.9));
  }

  /* ---------- 3. Hero: parallax do fundo ---------- */
  var hero = document.querySelector('.hero');
  var heroFundo = document.querySelector('[data-parallax]');

  function atualizarHero() {
    var y = Math.max(0, window.scrollY);
    heroFundo.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0)';
  }

  /* ---------- 4. Prato: fatias se desenham uma a uma ---------- */
  var pratoVisual = document.querySelector('.prato__visual');
  var fatias = pratoVisual ? Array.prototype.slice.call(pratoVisual.querySelectorAll('.fatia')) : [];
  var dadosFatias = fatias.map(function (f) {
    var cs = getComputedStyle(f);
    return { el: f, tam: parseFloat(cs.getPropertyValue('--tam')), inicio: parseFloat(cs.getPropertyValue('--inicio')) };
  });

  function atualizarPrato() {
    // Prato completo quando ele estiver inteiro na tela.
    var p = progresso(pratoVisual, 0.95, 0.85) * 100; // 0–100, em % do prato
    dadosFatias.forEach(function (f) {
      var desenhado = limitar(p - f.inicio, 0, f.tam);
      f.el.style.strokeDasharray = desenhado.toFixed(2) + ' 100';
    });
  }

  /* ---------- 5. Balança: ponteiro gira com o scroll (suavizado) ---------- */
  var secaoBalanca = document.querySelector('[data-secao-balanca]');
  var balanca = secaoBalanca && secaoBalanca.querySelector('.balanca');
  var giroAtual = -70, giroAlvo = -70;

  function atualizarBalanca() {
    // De quando a seção entra pela base da tela até o fim da página
    // (o rodapé impede a seção de sair totalmente).
    var inicio = secaoBalanca.getBoundingClientRect().top + window.scrollY - window.innerHeight;
    var fim = raiz.scrollHeight - window.innerHeight;
    var p = fim > inicio ? limitar((window.scrollY - inicio) / (fim - inicio), 0, 1) : 1;
    giroAlvo = -70 + p * 110; // de -70° até +40°
  }
  function suavizarBalanca() {
    var diff = giroAlvo - giroAtual;
    if (Math.abs(diff) < 0.05) return false;
    giroAtual += diff * 0.12;
    balanca.style.setProperty('--giro', giroAtual.toFixed(2) + 'deg');
    return true;
  }

  /* ---------- Loop principal ---------- */
  var agendado = false;
  function agendar() {
    if (!agendado) { agendado = true; requestAnimationFrame(quadro); }
  }
  function quadro() {
    agendado = false;
    atualizarTopo();
    if (reduzido) return;
    if (secaoCopo && visiveis.has(secaoCopo)) atualizarCopo();
    if (heroFundo && visiveis.has(hero)) atualizarHero();
    if (pratoVisual && visiveis.has(pratoVisual)) atualizarPrato();
    if (balanca && visiveis.has(secaoBalanca)) atualizarBalanca();
    // A balança continua por alguns quadros até alcançar o alvo (inércia).
    if (balanca && suavizarBalanca()) agendar();
  }

  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar, { passive: true });

  if (reduzido) {
    // Estados finais e estáticos
    if (textoNivel) textoNivel.textContent = '55%';
    agendar();
    return;
  }

  [secaoCopo, hero, pratoVisual, secaoBalanca].forEach(function (el) {
    if (el) observadorVisiveis.observe(el);
  });
  definirNivel(0);
  if (pratoVisual) atualizarPrato();
  if (balanca) balanca.style.setProperty('--giro', giroAtual + 'deg');

  /* ---------- 6. Cards que entram em cascata (fade + slide-up) ---------- */
  var observadorRevelar = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      var irmaos = Array.prototype.filter.call(el.parentElement.children, function (c) {
        return c.hasAttribute('data-revelar');
      });
      el.style.transitionDelay = irmaos.indexOf(el) * 100 + 'ms';
      el.classList.add('is-visivel');
      // Remove o atraso depois de entrar, para o hover não ficar "lento".
      el.addEventListener('transitionend', function limpar(ev) {
        if (ev.propertyName !== 'opacity') return;
        el.style.transitionDelay = '';
        el.removeEventListener('transitionend', limpar);
      });
      observadorRevelar.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-revelar]').forEach(function (el) { observadorRevelar.observe(el); });

  /* ---------- 7. Legumes caindo no prato (repete a cada entrada) ---------- */
  if (pratoVisual) {
    new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) pratoVisual.classList.add('is-pousado');
        else if (e.boundingClientRect.top > 0) pratoVisual.classList.remove('is-pousado'); // saiu por baixo
      });
    }, { threshold: 0.45 }).observe(pratoVisual);
  }

  /* ---------- 8. Contadores (0 → valor) ---------- */
  var valores = document.querySelectorAll('.habito__valor');
  valores.forEach(function (v) {
    // Leitor de tela lê o texto final; os números animados ficam ocultos para ele.
    var final = document.createElement('span');
    final.className = 'sr-only';
    final.textContent = v.textContent.replace(/\s+/g, ' ').trim();
    v.parentNode.insertBefore(final, v);
    v.setAttribute('aria-hidden', 'true');
  });

  function contar(span) {
    var alvo = parseInt(span.getAttribute('data-contar'), 10);
    var duracao = 1400;
    var t0 = null;
    function passo(t) {
      if (t0 === null) t0 = t;
      var k = limitar((t - t0) / duracao, 0, 1);
      span.textContent = String(Math.round(alvo * easeOutCubic(k)));
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  var observadorContadores = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('[data-contar]').forEach(contar);
      observadorContadores.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  valores.forEach(function (v) {
    v.querySelectorAll('[data-contar]').forEach(function (s) { s.textContent = '0'; });
    observadorContadores.observe(v);
  });

  agendar();
})();
