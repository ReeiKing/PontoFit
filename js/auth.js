/* ==========================================================================
   PontoFit — auth.js
   - Proteção de rota: páginas com <html data-protegida> só aparecem com
     sessão; sem sessão → login.html.
   - Botões [data-sair] encerram a sessão.
   - Página de login (body[data-pagina-login]): abas, validação em tempo
     real, mostrar/ocultar senha, cadastro com confirmação por e-mail,
     recuperação de senha.
   Depende de js/storage.js (Supabase Auth) e de js/ui.js (toast/carregando).
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
      if (!S) { raiz.classList.remove('verificando-sessao'); return null; } // sem configuração: faixa de erro do storage.js
      var usuario = null;
      try { usuario = await S.getUser(); } catch (e) { usuario = null; }
      if (!usuario) {
        location.replace('login.html');
        return null;
      }
      raiz.classList.remove('verificando-sessao');
      // Saiu em outra aba (ou a sessão expirou de vez): volta para o login.
      S.aoMudarSessao(function (evento) {
        if (evento === 'SIGNED_OUT') location.replace('login.html');
      });
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
    if (!S) return; // sem configuração: o storage.js já mostra a faixa de erro

    iniciarAbas();
    iniciarMostrarSenha();
    iniciarFormEntrar();
    iniciarFormCadastro();
    iniciarEsqueciSenha();
    iniciarNovaSenha();

    if (PF.recuperacaoDeSenha) {
      // Veio do link "esqueci minha senha": mostra o formulário de nova senha.
      mostrarSo('painel-nova-senha');
      return;
    }
    // Já está logado? Vai direto para a área do paciente.
    S.getUser().then(function (u) { if (u) location.replace('app.html'); });
  }

  /** Mostra só um dos painéis (entrar, cadastro, confirmação ou nova senha). */
  function mostrarSo(idPainel) {
    var abas = document.querySelector('[role="tablist"]');
    var titulo = document.querySelector('[data-auth-titulo]');
    var sub = document.querySelector('.auth__sub');
    var extra = idPainel === 'painel-confirmar' || idPainel === 'painel-nova-senha';
    abas.hidden = extra;
    document.querySelectorAll('.painel').forEach(function (p) { p.hidden = p.id !== idPainel; });
    if (extra) {
      var painel = document.getElementById(idPainel);
      titulo.textContent = painel.dataset.titulo;
      sub.hidden = true;
      var foco = painel.querySelector('[data-foco-inicial]');
      if (foco) foco.focus();
    } else {
      sub.hidden = false;
    }
  }

  /* ---------- Esqueci minha senha ---------- */
  function iniciarEsqueciSenha() {
    var botao = document.querySelector('[data-esqueci-senha]');
    if (!botao) return;
    var form = document.getElementById('form-entrar');
    botao.addEventListener('click', async function () {
      var email = form.email;
      email.dataset.tocado = '1';
      if (!validar(email)) {
        caixaErro(email).textContent = 'Digite seu e-mail acima para receber o link de nova senha.';
        email.focus();
        return;
      }
      PF.setLoading(botao, true, 'Enviando…');
      try {
        await S.recuperarSenha(email.value);
        PF.toast('Se existir uma conta com ' + email.value.trim() + ', enviamos um link para criar uma nova senha. Confira também a caixa de spam.', {
          tipo: 'info', titulo: 'Confira seu e-mail', duracao: 9000
        });
      } catch (err) {
        PF.toast(err.message, { tipo: 'erro' });
      } finally {
        PF.setLoading(botao, false);
      }
    });
  }

  /* ---------- Nova senha (depois do link do e-mail) ---------- */
  function iniciarNovaSenha() {
    var form = document.getElementById('form-nova-senha');
    if (!form) return;
    var validarTudo = ligarValidacao(form);
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validarTudo()) return;
      var botao = form.querySelector('[type="submit"]');
      PF.setLoading(botao, true, 'Salvando…');
      try {
        await S.definirNovaSenha(form.senha.value);
        PF.toast('Senha alterada. Entrando na sua conta…', { titulo: 'Tudo certo' });
        setTimeout(function () { location.replace('app.html'); }, 1200);
      } catch (err) {
        PF.setLoading(botao, false);
        PF.toast(err.codigo === 'SEM_SESSAO' || err.codigo === 'AUTH'
          ? 'O link expirou ou já foi usado. Peça um novo em “Esqueci minha senha”.'
          : err.message, { tipo: 'erro' });
      }
    });
  }

  /* ---------- Cadastro feito: falta confirmar o e-mail ---------- */
  function mostrarConfirmacao(email) {
    var painel = document.getElementById('painel-confirmar');
    painel.querySelector('[data-email-confirmar]').textContent = email;
    mostrarSo('painel-confirmar');
    var reenviar = painel.querySelector('[data-reenviar]');
    reenviar.onclick = async function () {
      PF.setLoading(reenviar, true, 'Reenviando…');
      try {
        await S.reenviarConfirmacao(email);
        PF.toast('Enviamos o link de novo para ' + email + '.', { titulo: 'E-mail reenviado' });
      } catch (err) {
        PF.toast(err.message, { tipo: 'erro' });
      } finally {
        PF.setLoading(reenviar, false);
      }
    };
    painel.querySelector('[data-voltar-entrar]').onclick = function () {
      mostrarSo('painel-entrar');
      document.querySelector('[role="tablist"] [data-aba="entrar"]').click();
      document.getElementById('entrar-email').value = email;
    };
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

    // Plano vindo da landing (login.html?plano=semestral#cadastro)
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
        if (err && err.codigo === 'EMAIL_NAO_CONFIRMADO') {
          var email = form.email.value;
          PF.toast(err.message, {
            tipo: 'aviso', titulo: 'Falta confirmar o e-mail', duracao: 0,
            acao: { texto: 'Reenviar e-mail', onClick: function () {
              S.reenviarConfirmacao(email)
                .then(function () { PF.toast('Enviamos o link de novo para ' + email + '.', { titulo: 'E-mail reenviado' }); })
                .catch(function (e2) { PF.toast(e2.message, { tipo: 'erro' }); });
            } }
          });
          return;
        }
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
        var resultado = await S.cadastrar({
          nome: form.nome.value,
          email: form.email.value,
          senha: form.senha.value,
          aceiteAvisoSaude: form.aceite.checked,
          plano: form.plano.value
        });
        if (resultado.precisaConfirmar) {
          PF.setLoading(botao, false);
          mostrarConfirmacao(form.email.value.trim().toLowerCase());
          return;
        }
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
