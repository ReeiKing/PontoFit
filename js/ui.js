/* ==========================================================================
   PontoFit — ui.js
   Comportamentos de interface compartilhados por todas as páginas:
   - ripple nos botões .btn
   - PF.toast(mensagem, opcoes)
   - PF.setLoading(botao, carregando)
   Script clássico (sem módulos) para funcionar abrindo o HTML com duplo clique.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');


  /* ---------- Ripple ---------- */
  function criarRipple(botao, x, y) {
    if (movimentoReduzido.matches) return;
    var r = botao.getBoundingClientRect();
    var tamanho = Math.max(r.width, r.height) * 2.2;
    var onda = document.createElement('span');
    onda.className = 'btn__ripple';
    onda.setAttribute('aria-hidden', 'true');
    onda.style.width = onda.style.height = tamanho + 'px';
    onda.style.left = x - r.left - tamanho / 2 + 'px';
    onda.style.top = y - r.top - tamanho / 2 + 'px';
    onda.addEventListener('animationend', function () { onda.remove(); });
    botao.appendChild(onda);
  }

  function botaoAtivo(alvo) {
    var botao = alvo instanceof Element ? alvo.closest('.btn') : null;
    if (!botao || botao.disabled || botao.classList.contains('is-loading')) return null;
    if (botao.getAttribute('aria-disabled') === 'true') return null;
    return botao;
  }

  // Delegação: funciona também para botões criados depois do carregamento.
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    var botao = botaoAtivo(e.target);
    if (botao) criarRipple(botao, e.clientX, e.clientY);
  });

  // Teclado (Enter/Espaço): onda a partir do centro do botão.
  document.addEventListener('keydown', function (e) {
    if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
    var botao = botaoAtivo(e.target);
    if (!botao || botao !== e.target) return;
    var r = botao.getBoundingClientRect();
    criarRipple(botao, r.left + r.width / 2, r.top + r.height / 2);
  });

  /* ---------- Números, datas e saúde (PF.fmt) ----------
     Datas sempre como texto 'AAAA-MM-DD' no fuso local (nunca toISOString,
     que usa UTC e pode "voltar" um dia à noite). */
  function doisDigitos(n) { return String(n).padStart(2, '0'); }

  PF.fmt = {
    /** '72,5' | '72.5' | '1.072,5' → número; vazio/inválido → null */
    decimal: function (texto) {
      var t = String(texto == null ? '' : texto).trim().replace(/\s/g, '');
      if (!t) return null;
      if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
      var n = Number(t);
      return isFinite(n) ? n : null;
    },

    /** 72.5 → '72,5' (casas fixas opcionais) */
    numero: function (n, casas) {
      if (n == null || !isFinite(n)) return '';
      var o = casas == null ? { maximumFractionDigits: 1 } : { minimumFractionDigits: casas, maximumFractionDigits: casas };
      return Number(n).toLocaleString('pt-BR', o);
    },

    /** Número para preencher um input (sem separador de milhar). */
    paraInput: function (n) {
      return n == null || n === '' ? '' : String(n).replace('.', ',');
    },

    hojeISO: function () {
      var d = new Date();
      return d.getFullYear() + '-' + doisDigitos(d.getMonth() + 1) + '-' + doisDigitos(d.getDate());
    },

    /** 'AAAA-MM-DD' → Date à meia-noite local */
    dataDe: function (iso) {
      var p = String(iso || '').split('-').map(Number);
      return p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]) : null;
    },

    paraISO: function (d) {
      return d.getFullYear() + '-' + doisDigitos(d.getMonth() + 1) + '-' + doisDigitos(d.getDate());
    },

    /** Dias de a até b, comparando só as datas (sem horário). */
    diasEntre: function (isoA, isoB) {
      var a = String(isoA).split('-').map(Number);
      var b = String(isoB).split('-').map(Number);
      return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
    },

    somarDias: function (iso, dias) {
      var d = PF.fmt.dataDe(iso);
      d.setDate(d.getDate() + dias);
      return PF.fmt.paraISO(d);
    },

    /** '2026-10-03' → '03/10/2026' */
    dataCurta: function (iso) {
      var d = PF.fmt.dataDe(iso);
      return d ? d.toLocaleDateString('pt-BR') : 'Sem data';
    },

    /** '2026-10-10' → 'sábado, 10 de outubro' */
    dataExtenso: function (iso, comAno) {
      var d = PF.fmt.dataDe(iso);
      if (!d) return 'Sem data';
      var o = { weekday: 'long', day: 'numeric', month: 'long' };
      if (comAno) o.year = 'numeric';
      return d.toLocaleDateString('pt-BR', o);
    },

    idade: function (isoNascimento, isoHoje) {
      var n = PF.fmt.dataDe(isoNascimento);
      var h = PF.fmt.dataDe(isoHoje || PF.fmt.hojeISO());
      if (!n || !h || n > h) return null;
      var anos = h.getFullYear() - n.getFullYear();
      if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) anos--;
      return anos;
    },

    imc: function (pesoKg, alturaCm) {
      if (!pesoKg || !alturaCm) return null;
      var m = alturaCm / 100;
      return pesoKg / (m * m);
    },

    /** Faixas de IMC (OMS) */
    faixaImc: function (imc) {
      if (imc == null) return null;
      if (imc < 18.5) return { chave: 'abaixo', rotulo: 'Abaixo do peso' };
      if (imc < 25) return { chave: 'normal', rotulo: 'Peso normal' };
      if (imc < 30) return { chave: 'sobrepeso', rotulo: 'Sobrepeso' };
      return { chave: 'obesidade', rotulo: 'Obesidade' };
    },

    plural: function (n, singular, plural) {
      return Math.abs(n) === 1 ? singular : plural;
    }
  };

  /* ---------- Carregando ---------- */
  PF.setLoading = function (botao, carregando, textoLeitor) {
    if (!botao) return;
    botao.classList.toggle('is-loading', !!carregando);
    botao.setAttribute('aria-busy', carregando ? 'true' : 'false');
    if ('disabled' in botao) botao.disabled = !!carregando;

    var aviso = botao.querySelector('.btn__status');
    if (carregando && !aviso) {
      aviso = document.createElement('span');
      aviso.className = 'btn__status sr-only';
      aviso.textContent = textoLeitor || 'Carregando…';
      botao.appendChild(aviso);
    } else if (!carregando && aviso) {
      aviso.remove();
    }
  };

  /* ---------- Menu móvel (hambúrguer) ----------
     <button data-menu-toggle aria-controls="id-do-menu" aria-expanded="false">
     Alterna a classe .is-aberto no menu; fecha com Esc, clique fora ou ao escolher um link. */
  document.querySelectorAll('[data-menu-toggle]').forEach(function (botao) {
    var menu = document.getElementById(botao.getAttribute('aria-controls'));
    if (!menu) return;
    var rotulo = botao.querySelector('.sr-only');

    function definir(aberto) {
      botao.setAttribute('aria-expanded', String(aberto));
      menu.classList.toggle('is-aberto', aberto);
      if (rotulo) rotulo.textContent = aberto ? 'Fechar menu' : 'Abrir menu';
    }
    function aberto() { return botao.getAttribute('aria-expanded') === 'true'; }

    botao.addEventListener('click', function () { definir(!aberto()); });
    menu.addEventListener('click', function (e) {
      if (e.target instanceof Element && e.target.closest('a')) definir(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && aberto()) { definir(false); botao.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (aberto() && !menu.contains(e.target) && !botao.contains(e.target)) definir(false);
    });
  });

  /* ---------- Toast ---------- */
  var ICONES = {
    sucesso: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    aviso: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    erro: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'
  };
  var ICONE_FECHAR = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
  var MAX_TOASTS = 3;

  function svg(conteudo, classe) {
    return '<svg class="' + classe + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + conteudo + '</svg>';
  }

  function obterContainer() {
    var c = document.querySelector('.toasts');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toasts';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(c);
    }
    return c;
  }

  function fechar(el) {
    if (!el || el.classList.contains('is-saindo')) return;
    if (movimentoReduzido.matches) { el.remove(); return; }
    el.classList.add('is-saindo');
    el.addEventListener('animationend', function () { el.remove(); }, { once: true });
  }

  /**
   * Mostra uma notificação.
   * @param {string} mensagem
   * @param {object} [opcoes]
   * @param {'sucesso'|'info'|'aviso'|'erro'} [opcoes.tipo='sucesso']
   * @param {string} [opcoes.titulo]
   * @param {number} [opcoes.duracao=4000]  ms; 0 = fica até ser fechado
   * @param {{texto:string, href?:string, onClick?:Function}} [opcoes.acao]
   * @returns {{fechar:Function, elemento:HTMLElement}}
   */
  PF.toast = function (mensagem, opcoes) {
    opcoes = opcoes || {};
    var tipo = ICONES[opcoes.tipo] ? opcoes.tipo : 'sucesso';
    var duracao = opcoes.duracao == null ? 4000 : opcoes.duracao;
    var container = obterContainer();

    var el = document.createElement('div');
    el.className = 'toast toast--' + tipo;
    if (tipo === 'erro') el.setAttribute('role', 'alert');
    el.insertAdjacentHTML('afterbegin', svg(ICONES[tipo], 'toast__icone'));

    // Texto vindo de fora sempre via textContent (nunca innerHTML).
    var corpo = document.createElement('div');
    corpo.className = 'toast__corpo';
    if (opcoes.titulo) {
      var titulo = document.createElement('strong');
      titulo.className = 'toast__titulo';
      titulo.textContent = opcoes.titulo;
      corpo.appendChild(titulo);
      corpo.appendChild(document.createTextNode(' ')); // leitores de tela não juntam título e texto
    }
    corpo.appendChild(document.createTextNode(mensagem));

    if (opcoes.acao && opcoes.acao.texto) {
      var acao = document.createElement(opcoes.acao.href ? 'a' : 'button');
      acao.className = 'toast__acao';
      acao.textContent = opcoes.acao.texto;
      if (opcoes.acao.href) acao.href = opcoes.acao.href;
      else acao.type = 'button';
      acao.addEventListener('click', function (e) {
        if (typeof opcoes.acao.onClick === 'function') opcoes.acao.onClick(e);
        fechar(el);
      });
      corpo.appendChild(document.createElement('br'));
      corpo.appendChild(acao);
    }
    el.appendChild(corpo);

    var btnFechar = document.createElement('button');
    btnFechar.type = 'button';
    btnFechar.className = 'toast__fechar';
    btnFechar.setAttribute('aria-label', 'Fechar notificação');
    btnFechar.innerHTML = svg(ICONE_FECHAR, '');
    btnFechar.addEventListener('click', function () { fechar(el); });
    el.appendChild(btnFechar);

    if (duracao > 0) {
      // A barra de tempo controla o fechamento: pausa junto com ela no hover/foco.
      var barra = document.createElement('span');
      barra.className = 'toast__tempo';
      barra.setAttribute('aria-hidden', 'true');
      el.style.setProperty('--toast-duracao', duracao + 'ms');
      barra.addEventListener('animationend', function () { fechar(el); });
      el.appendChild(barra);
    }

    container.appendChild(el);
    while (container.children.length > MAX_TOASTS) container.firstElementChild.remove();

    return { fechar: function () { fechar(el); }, elemento: el };
  };
})();
