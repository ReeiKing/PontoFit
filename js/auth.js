/* ==========================================================================
   PontoFit — auth.js
   - Proteção de rota: páginas com <html data-protegida> só aparecem com
     sessão; sem sessão → login.html.
   - Botões [data-sair] encerram a sessão.
   - Página de login (body[data-pagina-login]): abas, validação em tempo
     real, mostrar/ocultar senha, envio.
   Depende de js/storage.js (e js/ui.js para toast/carregando).

   ⚠️ PROTÓTIPO: ver aviso em js/storage.js — este login NÃO é seguro.
   Na Fase 11 (Vercel), a verificação passa a ser feita no servidor
   (Auth.js, Supabase Auth ou Clerk) e este arquivo só chama a API.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});
  var S = PF.storage;
  var raiz = document.documentElement;

  PF.auth = {
    /**
     * Esconde a página até confirmar a sessão. → Promise<usuário|null>
     * (null = redirecionando para o login)
     */
    protegerPagina: async function () {
      raiz.classList.add('verificando-sessao');
      var usuario = null;
      try { usuario = await S.getUser(); } catch (e) { usuario = null; }
      if (!usuario) {
        location.replace('login.html');
        return null;
      }
      raiz.classList.remove('verificando-sessao');
      return usuario;
    },

    sair: async function () {
      await S.sair();
      location.replace('login.html');
    }
  };

  // Páginas protegidas verificam a sessão assim que o script carrega.
  // Os scripts da página aguardam: PF.auth.pronto.then(function (usuario) {...})
  if (raiz.hasAttribute('data-protegida')) {
    PF.auth.pronto = PF.auth.protegerPagina();
  }

  document.addEventListener('click', function (e) {
    var botao = e.target instanceof Element && e.target.closest('[data-sair]');
    if (!botao) return;
    e.preventDefault();
    if (PF.setLoading) PF.setLoading(botao, true, 'Saindo…');
    PF.auth.sair();
  });

  /* ======================================================================
     Página de login / cadastro
     ====================================================================== */
  function iniciarLogin() {
    // Já está logado? Vai direto para a área do paciente.
    S.getUser().then(function (u) { if (u) location.replace('app.html'); });

    iniciarAbas();
    iniciarMostrarSenha();
    iniciarFormEntrar();
    iniciarFormCadastro();

    var esqueci = document.querySelector('[data-esqueci-senha]');
    if (esqueci) {
      esqueci.addEventListener('click', function () {
        PF.toast('A recuperação de senha ainda não está disponível nesta versão do PontoFit.', {
          tipo: 'info',
          titulo: 'Esqueceu sua senha?',
          duracao: 7000
        });
      });
    }
  }

  /* ---------- Abas: Entrar | Criar conta ---------- */
  function iniciarAbas() {
    var lista = document.querySelector('[role="tablist"]');
    var abas = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    var titulo = document.querySelector('[data-auth-titulo]');

    function ativar(aba, focar) {
      abas.forEach(function (a) {
        var ativa = a === aba;
        a.setAttribute('aria-selected', String(ativa));
        a.tabIndex = ativa ? 0 : -1;
        var painel = document.getElementById(a.getAttribute('aria-controls'));
        painel.hidden = !ativa;
        if (ativa) {
          painel.classList.remove('is-entrando');
          void painel.offsetWidth; // reinicia a animação de entrada
          painel.classList.add('is-entrando');
        }
      });
      lista.setAttribute('data-ativa', aba.dataset.aba);
      if (titulo) titulo.textContent = aba.dataset.titulo;
      history.replaceState(null, '', aba.dataset.aba === 'cadastro' ? '#cadastro' : location.pathname + location.search);
      if (focar) aba.focus();
    }

    abas.forEach(function (aba, i) {
      aba.addEventListener('click', function () { ativar(aba); });
      aba.addEventListener('keydown', function (e) {
        var alvo = null;
        if (e.key === 'ArrowRight') alvo = abas[(i + 1) % abas.length];
        else if (e.key === 'ArrowLeft') alvo = abas[(i - 1 + abas.length) % abas.length];
        else if (e.key === 'Home') alvo = abas[0];
        else if (e.key === 'End') alvo = abas[abas.length - 1];
        if (alvo) { e.preventDefault(); ativar(alvo, true); }
      });
    });

    // Plano vindo da landing (login.html?plano=anual#cadastro)
    var plano = new URLSearchParams(location.search).get('plano');
    var radioPlano = document.getElementById('cad-plano-' + plano);
    if (radioPlano) radioPlano.checked = true;

    var inicial = location.hash === '#cadastro' ? abas[1] : abas[0];
    ativar(inicial);
    document.getElementById(inicial.getAttribute('aria-controls')).classList.remove('is-entrando');
  }

  /* ---------- Mostrar / ocultar senha ---------- */
  function iniciarMostrarSenha() {
    document.querySelectorAll('[data-mostrar-senha]').forEach(function (botao) {
      var input = document.getElementById(botao.getAttribute('aria-controls'));
      botao.addEventListener('click', function () {
        var mostrar = input.type === 'password';
        input.type = mostrar ? 'text' : 'password';
        botao.setAttribute('aria-pressed', String(mostrar));
        botao.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      });
    });
  }

  /* ---------- Validação ---------- */
  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var REGRAS = {
    nome: function (v) {
      v = v.trim();
      if (!v) return 'Digite seu nome.';
      if (v.length < 3) return 'O nome precisa ter pelo menos 3 letras.';
      return '';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Digite seu e-mail.';
      if (!REGEX_EMAIL.test(v)) return 'Digite um e-mail válido, como nome@exemplo.com.';
      return '';
    },
    senhaLogin: function (v) {
      return v ? '' : 'Digite sua senha.';
    },
    senhaNova: function (v) {
      if (!v) return 'Crie uma senha.';
      if (v.length < 8 || !/[a-zA-Z]/.test(v) || !/\d/.test(v)) {
        return 'A senha precisa ter pelo menos 8 caracteres, com letras e números.';
      }
      return '';
    },
    confirmar: function (v, form) {
      if (!v) return 'Repita a senha.';
      if (v !== form.querySelector('[data-regra="senhaNova"]').value) return 'As senhas não coincidem.';
      return '';
    },
    aceite: function (v, form, input) {
      return input.checked ? '' : 'Para continuar, confirme que leu o aviso de saúde.';
    }
  };

  function caixaErro(input) {
    return document.getElementById(input.id + '-erro');
  }

  /** Valida um campo, mostra/limpa a mensagem e devolve true se ok. */
  function validar(input) {
    var regra = REGRAS[input.dataset.regra];
    if (!regra) return true;
    var msg = regra(input.value, input.form, input);
    var caixa = caixaErro(input);
    if (caixa) caixa.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    input.classList.toggle('is-valido', !msg && input.type !== 'checkbox');
    return !msg;
  }

  function ligarValidacao(form) {
    var campos = Array.prototype.slice.call(form.querySelectorAll('[data-regra]'));
    campos.forEach(function (input) {
      // Valida ao sair do campo (se já tem algo digitado) e, depois do
      // primeiro erro ou da primeira saída, a cada tecla.
      input.addEventListener('blur', function () {
        if (input.value || input.dataset.tocado) { input.dataset.tocado = '1'; validar(input); }
      });
      input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', function () {
        if (input.dataset.tocado || input.type === 'checkbox') validar(input);
        if (input.dataset.regra === 'senhaNova') {
          atualizarRequisitos(input);
          var conf = form.querySelector('[data-regra="confirmar"]');
          if (conf && conf.dataset.tocado) validar(conf);
        }
      });
    });
    return function validarTudo() {
      var primeiroInvalido = null;
      campos.forEach(function (input) {
        input.dataset.tocado = '1';
        if (!validar(input) && !primeiroInvalido) primeiroInvalido = input;
      });
      if (primeiroInvalido) primeiroInvalido.focus();
      return !primeiroInvalido;
    };
  }

  // Lista "8 caracteres ou mais / letras e números" que vai se marcando.
  function atualizarRequisitos(input) {
    var v = input.value;
    var ok = {
      tamanho: v.length >= 8,
      misto: /[a-zA-Z]/.test(v) && /\d/.test(v)
    };
    document.querySelectorAll('[data-requisito]').forEach(function (li) {
      li.classList.toggle('is-ok', ok[li.dataset.requisito]);
    });
  }

  function mostrarErroServidor(form, err) {
    if (err && err.codigo === 'EMAIL_EM_USO') {
      var email = form.querySelector('[data-regra="email"]');
      caixaErro(email).textContent = err.message;
      email.setAttribute('aria-invalid', 'true');
      email.classList.remove('is-valido');
      email.focus();
      return;
    }
    PF.toast((err && err.message) || 'Algo deu errado. Tente novamente.', { tipo: 'erro' });
  }

  /* ---------- Formulário: Entrar ---------- */
  function iniciarFormEntrar() {
    var form = document.getElementById('form-entrar');
    var validarTudo = ligarValidacao(form);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validarTudo()) return;
      var botao = form.querySelector('[type="submit"]');
      PF.setLoading(botao, true, 'Entrando…');
      try {
        await S.entrar(form.email.value, form.senha.value, form.lembrar.checked);
        location.replace('app.html');
      } catch (err) {
        PF.setLoading(botao, false);
        mostrarErroServidor(form, err);
        if (err && err.codigo === 'CREDENCIAIS') form.senha.select();
      }
    });
  }

  /* ---------- Formulário: Criar conta ---------- */
  function iniciarFormCadastro() {
    var form = document.getElementById('form-cadastro');
    var validarTudo = ligarValidacao(form);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validarTudo()) return;
      var botao = form.querySelector('[type="submit"]');
      PF.setLoading(botao, true, 'Criando sua conta…');
      try {
        await S.cadastrar({
          nome: form.nome.value,
          email: form.email.value,
          senha: form.senha.value,
          aceiteAvisoSaude: form.aceite.checked,
          plano: form.plano.value
        });
        location.replace('app.html');
      } catch (err) {
        PF.setLoading(botao, false);
        mostrarErroServidor(form, err);
      }
    });
  }

  if (document.body && document.body.hasAttribute('data-pagina-login')) iniciarLogin();
  else document.addEventListener('DOMContentLoaded', function () {
    if (document.body.hasAttribute('data-pagina-login')) iniciarLogin();
  });
})();
