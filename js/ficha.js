/* ==========================================================================
   PontoFit — ficha.js
   Seção "Minha ficha": modo ver/editar, validação, idade e IMC automáticos.
   Dados via PF.storage.getFicha / saveFicha.
   Ao salvar, dispara 'pf:ficha-salva' (detail.ficha) — produtos e evolução
   usam o sexo, a altura e o peso inicial daqui.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;

  var form = document.getElementById('form-ficha');
  if (!form) return;

  var campos = form.querySelector('.ficha__campos');
  var btnEditar = form.querySelector('[data-ficha-editar]');
  var acoes = form.querySelector('[data-ficha-acoes]');
  var textoAtualizado = form.querySelector('[data-ficha-atualizado]');

  var NUMERICOS = ['alturaCm', 'cinturaCm', 'pesoInicialKg'];
  var TEXTOS = ['nome', 'email', 'dataNascimento', 'telefone', 'cidade', 'estado', 'dataPesoInicial',
    'objetivo', 'nivelAtividade', 'condicoesOutras', 'alergias', 'medicamentos',
    'profissionalNome', 'profissionalContato', 'observacoes'];

  var fichaAtual = {};

  /* ---------- Validação ---------- */
  function faixa(v, min, max, nome, unidade) {
    if (!v.trim()) return '';
    var n = F.decimal(v);
    if (n == null) return 'Use só números, como 72,5.';
    if (n < min || n > max) return 'Confira ' + nome + ': deve ficar entre ' + min + ' e ' + max + ' ' + unidade + '.';
    return '';
  }

  var REGRAS = {
    nome: function (v) {
      v = v.trim();
      if (!v) return 'Digite seu nome completo.';
      if (v.length < 3) return 'O nome precisa ter pelo menos 3 letras.';
      return '';
    },
    nascimento: function (v) {
      if (!v) return '';
      if (v > F.hojeISO()) return 'A data de nascimento não pode ser no futuro.';
      if (F.idade(v) > 120) return 'Confira o ano de nascimento.';
      return '';
    },
    telefone: function (v) {
      var d = v.replace(/\D/g, '');
      if (!d) return '';
      return d.length < 10 || d.length > 11 ? 'Digite o telefone com DDD, como (11) 98765-4321.' : '';
    },
    altura: function (v) { return faixa(v, 50, 250, 'a altura', 'cm'); },
    cintura: function (v) { return faixa(v, 30, 250, 'a cintura', 'cm'); },
    peso: function (v) { return faixa(v, 20, 400, 'o peso', 'kg'); },
    dataPeso: function (v) {
      return v && v > F.hojeISO() ? 'A data da medição não pode ser no futuro.' : '';
    }
  };

  function validar(input) {
    var regra = REGRAS[input.dataset.validar];
    if (!regra) return true;
    var msg = regra(input.value);
    var caixa = document.getElementById(input.id + '-erro');
    if (caixa) caixa.textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function limparErros() {
    form.querySelectorAll('[data-validar]').forEach(function (input) {
      input.removeAttribute('aria-invalid');
      delete input.dataset.tocado;
      var caixa = document.getElementById(input.id + '-erro');
      if (caixa) caixa.textContent = '';
    });
  }

  function validarTudo() {
    var primeiro = null;
    form.querySelectorAll('[data-validar]').forEach(function (input) {
      input.dataset.tocado = '1';
      if (!validar(input) && !primeiro) primeiro = input;
    });
    if (primeiro) primeiro.focus();
    return !primeiro;
  }

  form.querySelectorAll('[data-validar]').forEach(function (input) {
    input.addEventListener('blur', function () {
      if (input.value || input.dataset.tocado) { input.dataset.tocado = '1'; validar(input); }
    });
    input.addEventListener('input', function () {
      if (input.dataset.tocado) validar(input);
    });
  });

  /* ---------- Máscara de telefone: (11) 98765-4321 ---------- */
  function mascaraTelefone(v) {
    var d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  form.telefone.addEventListener('input', function () {
    var antes = form.telefone.value;
    var depois = mascaraTelefone(antes);
    if (antes !== depois) form.telefone.value = depois;
  });

  /* ---------- Idade e IMC automáticos ---------- */
  function atualizarIdade() {
    var saida = form.querySelector('[data-idade]');
    var idade = REGRAS.nascimento(form.dataNascimento.value) ? null : F.idade(form.dataNascimento.value);
    saida.textContent = idade == null ? '' : idade + ' ' + F.plural(idade, 'ano', 'anos');
  }

  var CLASSES_FAIXA = { abaixo: 'badge--agua', normal: '', sobrepeso: 'badge--laranja', obesidade: 'badge--vermelho' };

  function atualizarImc() {
    var caixa = form.querySelector('[data-imc]');
    var valor = caixa.querySelector('[data-imc-valor]');
    var badge = caixa.querySelector('[data-imc-faixa]');
    var marcador = caixa.querySelector('[data-imc-marcador]');
    var ajuda = caixa.querySelector('[data-imc-ajuda]');

    var altura = REGRAS.altura(form.alturaCm.value) ? null : F.decimal(form.alturaCm.value);
    var peso = REGRAS.peso(form.pesoInicialKg.value) ? null : F.decimal(form.pesoInicialKg.value);
    var imc = F.imc(peso, altura);
    var faixa = F.faixaImc(imc);

    caixa.dataset.faixa = faixa ? faixa.chave : '';
    valor.textContent = imc == null ? 'Sem dados' : F.numero(imc, 1);
    badge.hidden = marcador.hidden = !faixa;
    ajuda.hidden = !!faixa;
    if (!faixa) return;

    badge.className = 'badge imc__faixa ' + CLASSES_FAIXA[faixa.chave];
    badge.textContent = faixa.rotulo;
    // Escala de 15 a 40 de IMC
    var pos = Math.min(100, Math.max(0, ((imc - 15) / 25) * 100));
    marcador.style.left = pos + '%';
  }

  form.dataNascimento.addEventListener('input', atualizarIdade);
  form.alturaCm.addEventListener('input', atualizarImc);
  form.pesoInicialKg.addEventListener('input', atualizarImc);

  /* ---------- "Outras" condições ---------- */
  var chkOutras = form.querySelector('[data-condicao-outras]');
  var campoOutras = form.querySelector('[data-campo-outras]');
  function atualizarOutras() { campoOutras.hidden = !chkOutras.checked; }
  chkOutras.addEventListener('change', function () {
    atualizarOutras();
    if (chkOutras.checked) form.condicoesOutras.focus();
  });

  /* ---------- Preencher / coletar ---------- */
  function preencher(ficha) {
    TEXTOS.forEach(function (nome) {
      if (form[nome]) form[nome].value = ficha[nome] || '';
    });
    NUMERICOS.forEach(function (nome) { form[nome].value = F.paraInput(ficha[nome]); });
    form.querySelectorAll('[name="sexo"]').forEach(function (r) { r.checked = r.value === ficha.sexo; });
    var condicoes = ficha.condicoesSaude || [];
    form.querySelectorAll('[name="condicoesSaude"]').forEach(function (c) { c.checked = condicoes.indexOf(c.value) >= 0; });
    atualizarOutras();
    atualizarIdade();
    atualizarImc();

    if (ficha.atualizadoEm) {
      var d = new Date(ficha.atualizadoEm);
      textoAtualizado.textContent = 'Atualizada em ' + d.toLocaleDateString('pt-BR') + ' às ' +
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  }

  function coletar() {
    var dados = {};
    TEXTOS.forEach(function (nome) {
      if (nome !== 'email') dados[nome] = form[nome].value.trim();
    });
    NUMERICOS.forEach(function (nome) { dados[nome] = F.decimal(form[nome].value); });
    var sexo = form.querySelector('[name="sexo"]:checked');
    dados.sexo = sexo ? sexo.value : '';
    dados.condicoesSaude = Array.prototype.filter.call(form.querySelectorAll('[name="condicoesSaude"]'), function (c) {
      return c.checked;
    }).map(function (c) { return c.value; });
    if (dados.condicoesSaude.indexOf('outras') < 0) dados.condicoesOutras = '';
    // Peso informado sem data → considera a medição de hoje.
    if (dados.pesoInicialKg != null && !dados.dataPesoInicial) dados.dataPesoInicial = F.hojeISO();
    return dados;
  }

  /* ---------- Modo ver / editar ---------- */
  function definirModo(modo) {
    var ver = modo === 'ver';
    form.dataset.modo = modo;
    campos.disabled = ver;
    btnEditar.hidden = !ver;
    acoes.hidden = ver;
    // No modo ver, campos vazios aparecem como "Não informado".
    campos.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(function (el) {
      el.placeholder = ver ? 'Não informado' : (el.dataset.placeholder || '');
    });
    campos.querySelectorAll('select option[value=""]').forEach(function (op) {
      op.textContent = ver ? 'Não informado' : 'Selecione';
    });
    // Datas vazias: no modo ver viram texto "Não informado" (em vez de dd/mm/aaaa).
    campos.querySelectorAll('[data-campo-data]').forEach(function (el) {
      el.type = ver && !el.value ? 'text' : 'date';
      el.placeholder = ver ? 'Não informado' : '';
    });
  }

  function fichaIncompleta(f) {
    return !f.sexo && !f.alturaCm && !f.dataNascimento;
  }

  btnEditar.addEventListener('click', function () {
    definirModo('editar');
    form.nome.focus();
  });

  form.querySelector('[data-ficha-cancelar]').addEventListener('click', function () {
    preencher(fichaAtual);
    limparErros();
    definirModo('ver');
    btnEditar.focus();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (form.dataset.modo === 'ver' || !validarTudo()) return;
    var botao = form.querySelector('[type="submit"]');
    var nomeAntes = fichaAtual.nome;
    PF.setLoading(botao, true, 'Salvando…');
    try {
      fichaAtual = await S.saveFicha(coletar());
      preencher(fichaAtual);
      limparErros();
      definirModo('ver');
      PF.toast('Seus dados foram salvos.', { titulo: 'Ficha atualizada' });
      if (fichaAtual.nome !== nomeAntes && PF.app) PF.app.atualizarUsuario();
      document.dispatchEvent(new CustomEvent('pf:ficha-salva', { detail: { ficha: fichaAtual } }));
      btnEditar.focus();
    } catch (err) {
      PF.toast(err.message || 'Não foi possível salvar. Tente novamente.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  // Outras seções (ex.: meta em "Minha evolução") também salvam na ficha.
  document.addEventListener('pf:ficha-salva', function (e) {
    if (e.detail && e.detail.ficha) fichaAtual = e.detail.ficha;
  });

  /* ---------- API para outras seções ---------- */
  PF.ficha = {
    obter: function () { return fichaAtual; },
    /** Abre a ficha em modo edição e foca um campo (ex.: 'sexo'). */
    editar: function (campo) {
      if (location.hash !== '#ficha') location.hash = '#ficha';
      setTimeout(function () {
        definirModo('editar');
        var alvo = campo === 'sexo' ? form.querySelector('[name="sexo"]') : form[campo];
        if (alvo) {
          alvo.focus();
          alvo.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 50);
    }
  };

  /* ---------- Início ---------- */
  PF.auth.pronto.then(async function (usuario) {
    if (!usuario) return;
    fichaAtual = await S.getFicha();
    if (!fichaAtual.nome) fichaAtual.nome = usuario.nome;
    fichaAtual.email = usuario.email;
    preencher(fichaAtual);
    if (fichaIncompleta(fichaAtual)) {
      definirModo('editar');
      textoAtualizado.textContent = 'Complete sua ficha para calcular sua idade e seu IMC.';
    } else {
      definirModo('ver');
    }
  });
})();
