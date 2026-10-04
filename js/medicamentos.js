/* ==========================================================================
   PontoFit — medicamentos.js
   Seção "Medicamentos" (antes "Meus produtos"):
   - vários medicamentos, cada um com dose, intervalo, contagem e histórico;
   - nome escolhido entre Mounjaro, Testosterona, os que a pessoa já criou
     ou um novo, digitado na hora;
   - contagem regressiva com anel e estados (normal, amanhã, hoje, atrasada);
   - badge no menu e aviso ao abrir o app, sempre pela dose mais próxima.

   Cálculo (seção 8.4): próxima dose = última aplicação + intervalo;
   dias restantes = próxima dose menos hoje, comparando só as datas.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;

  var raiz = document.querySelector('[data-medicamentos]');
  if (!raiz) return;
  var $ = function (sel) { return raiz.querySelector(sel); };
  var form = document.getElementById('form-medicamento');
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
  var OUTRO = '__outro';

  var estado = { meds: [], aplicacoes: [], nomes: [], ficha: {}, selecionado: null, novo: false };

  /* ======================================================================
     Cálculo da dose (card, abas, badge e aviso)
     ====================================================================== */
  function aplicacoesDe(med) {
    return estado.aplicacoes.filter(function (a) { return a.medicamentoId === med.id; });
  }

  function ultimaAplicacao(med) {
    if (med.dataUltimaAplicacao) return med.dataUltimaAplicacao;
    var datas = aplicacoesDe(med).map(function (a) { return a.data; }).sort();
    return datas.length ? datas[datas.length - 1] : null;
  }

  /** → null ou { estado: 'ok'|'amanha'|'hoje'|'atrasada', dias, proxima, ultima, intervalo, passados } */
  function calcularDose(med) {
    if (!med || !med.intervaloDias) return null;
    var ultima = ultimaAplicacao(med);
    if (!ultima) return null;
    var proxima = F.somarDias(ultima, med.intervaloDias);
    var dias = F.diasEntre(F.hojeISO(), proxima);
    return {
      estado: dias >= 2 ? 'ok' : dias === 1 ? 'amanha' : dias === 0 ? 'hoje' : 'atrasada',
      dias: dias,
      proxima: proxima,
      ultima: ultima,
      intervalo: med.intervaloDias,
      passados: Math.max(0, Math.min(med.intervaloDias, med.intervaloDias - dias))
    };
  }

  function rotuloCurto(dose) {
    if (!dose) return '';
    if (dose.estado === 'hoje') return 'Hoje';
    if (dose.estado === 'atrasada') return 'Atraso';
    return dose.dias + 'd';
  }

  function textoLeitor(med, dose) {
    if (dose.estado === 'atrasada') return 'dose de ' + med.nome + ' atrasada há ' + -dose.dias + ' ' + F.plural(dose.dias, 'dia', 'dias');
    if (dose.estado === 'hoje') return 'dose de ' + med.nome + ' hoje';
    if (dose.estado === 'amanha') return 'próxima dose de ' + med.nome + ' amanhã';
    return 'próxima dose de ' + med.nome + ' em ' + dose.dias + ' dias';
  }

  /** O medicamento com a dose mais próxima (ou mais atrasada). */
  function maisUrgente() {
    var melhor = null;
    estado.meds.forEach(function (m) {
      var d = calcularDose(m);
      if (d && (!melhor || d.dias < melhor.dose.dias)) melhor = { med: m, dose: d };
    });
    return melhor;
  }

  /* ======================================================================
     Badge do menu e aviso ao abrir o app
     ====================================================================== */
  function renderBadge() {
    var badge = document.querySelector('[data-badge-medicamentos]');
    var leitor = document.querySelector('[data-badge-medicamentos-leitor]');
    if (!badge) return;
    var u = maisUrgente();
    badge.hidden = !u;
    leitor.textContent = u ? ', ' + textoLeitor(u.med, u.dose) : '';
    if (!u) return;
    badge.className = 'badge menu__badge' + (u.dose.dias <= 1 ? ' badge--laranja' : '');
    badge.textContent = rotuloCurto(u.dose);
  }

  function avisarAoAbrir() {
    var urgentes = estado.meds.map(function (m) { return { med: m, dose: calcularDose(m) }; })
      .filter(function (x) { return x.dose && x.dose.dias <= 1; })
      .sort(function (a, b) { return a.dose.dias - b.dose.dias; });
    if (!urgentes.length) return;
    var frases = urgentes.map(function (x) {
      var d = x.dose;
      if (d.estado === 'amanha') return 'Sua próxima dose de ' + x.med.nome + ' é amanhã.';
      if (d.estado === 'hoje') return 'Hoje é dia da sua dose de ' + x.med.nome + '.';
      return 'Sua dose de ' + x.med.nome + ' está atrasada há ' + -d.dias + ' ' + F.plural(d.dias, 'dia', 'dias') + '.';
    });
    PF.toast(frases.join(' '), {
      tipo: urgentes[0].dose.estado === 'atrasada' ? 'erro' : 'aviso',
      titulo: 'Lembrete de dose',
      duracao: 0,
      acao: { texto: 'Ver medicamentos', href: '#medicamentos' }
    });
  }

  /* ======================================================================
     Renderização
     ====================================================================== */
  function medSelecionado() {
    return estado.meds.find(function (m) { return m.id === estado.selecionado; }) || null;
  }

  function renderAbas() {
    var caixa = $('[data-meds-abas]');
    caixa.textContent = '';
    estado.meds.forEach(function (m) {
      var aba = document.createElement('button');
      aba.type = 'button';
      aba.className = 'meds__aba';
      aba.setAttribute('role', 'tab');
      aba.id = 'aba-med-' + m.id;
      aba.dataset.med = m.id;
      var ativa = !estado.novo && m.id === estado.selecionado;
      aba.setAttribute('aria-selected', String(ativa));
      aba.tabIndex = ativa ? 0 : -1;
      var nome = document.createElement('span');
      nome.textContent = m.nome;
      aba.appendChild(nome);
      var dose = calcularDose(m);
      if (dose) {
        var b = document.createElement('span');
        b.className = 'badge meds__aba-badge' + (dose.dias <= 1 ? ' badge--laranja' : '');
        b.textContent = rotuloCurto(dose);
        b.setAttribute('aria-hidden', 'true');
        aba.appendChild(b);
        var sr = document.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = ', ' + textoLeitor(m, dose);
        aba.appendChild(sr);
      }
      caixa.appendChild(aba);
    });
    if (estado.meds.length) {
      var novo = document.createElement('button');
      novo.type = 'button';
      novo.className = 'meds__adicionar' + (estado.novo ? ' is-ativo' : '');
      novo.dataset.medsNovo = '';
      novo.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg><span>Adicionar outro medicamento</span>';
      caixa.appendChild(novo);
    }
    caixa.hidden = estado.meds.length === 0;
  }

  var TITULOS = {
    ok: function (d) { return 'Faltam ' + d.dias + ' dias para sua próxima dose'; },
    amanha: function () { return 'Sua próxima dose é amanhã'; },
    hoje: function () { return 'Hoje é dia da sua dose'; },
    atrasada: function (d) { return 'Sua dose está atrasada há ' + -d.dias + ' ' + F.plural(d.dias, 'dia', 'dias'); }
  };

  function ml(v) { return F.numero(v, 2).replace(/,?0+$/, '') + ' mL'; }

  function animar(el) {
    if (movimentoReduzido.matches) return;
    el.classList.remove('is-entrando');
    void el.offsetWidth;
    el.classList.add('is-entrando');
  }

  function renderDose(med, animarEntrada) {
    var card = $('[data-dose]');
    var anel = $('[data-dose-anel]');
    var botao = $('[data-registrar-aplicacao]');
    card.hidden = !med;
    if (!med) return;
    var dose = calcularDose(med);
    card.dataset.estado = dose ? dose.estado : 'configurar';
    $('[data-dose-produto]').textContent = med.nome + (med.doseMl ? ' · ' + ml(med.doseMl) : '');

    if (!dose) {
      $('[data-dose-numero]').textContent = '';
      $('[data-dose-unidade]').textContent = 'configure abaixo';
      $('[data-dose-titulo]').textContent = 'Configure sua dose';
      $('[data-dose-data]').textContent = 'Preencha a dose, o intervalo e a data da última aplicação para começar a contagem.';
      $('[data-dose-anel-rotulo]').setAttribute('aria-label', 'Contagem ainda não configurada');
      anel.style.strokeDashoffset = '100';
      botao.hidden = true;
      return;
    }

    var numero = dose.estado === 'hoje' ? 'Hoje' : String(Math.abs(dose.dias));
    var unidade = dose.estado === 'hoje' ? ''
      : dose.estado === 'atrasada' ? F.plural(dose.dias, 'dia de atraso', 'dias de atraso')
      : F.plural(dose.dias, 'dia', 'dias');
    $('[data-dose-numero]').textContent = numero;
    $('[data-dose-unidade]').textContent = unidade;
    $('[data-dose-titulo]').textContent = TITULOS[dose.estado](dose);
    $('[data-dose-data]').textContent = (dose.estado === 'atrasada' ? 'Data prevista: ' : 'Próxima dose: ') +
      F.dataExtenso(dose.proxima) + ' · última em ' + F.dataCurta(dose.ultima);
    $('[data-dose-anel-rotulo]').setAttribute('aria-label', dose.passados + ' de ' + dose.intervalo + ' dias do intervalo já passaram');
    botao.hidden = !(dose.estado === 'hoje' || dose.estado === 'atrasada');

    var fracao = dose.estado === 'atrasada' ? 1 : dose.passados / dose.intervalo;
    if (animarEntrada && !movimentoReduzido.matches) {
      anel.style.transition = 'none';
      anel.style.strokeDashoffset = '100';
      void anel.getBoundingClientRect();
      anel.style.transition = '';
      animar(card);
    }
    requestAnimationFrame(function () { anel.style.strokeDashoffset = String(100 - fracao * 100); });
  }

  function preencherSelect(nomeAtual) {
    var select = form.nomeEscolhido;
    select.textContent = '';
    var nomes = estado.nomes.slice();
    if (nomeAtual && nomes.indexOf(nomeAtual) < 0) nomes.push(nomeAtual);
    nomes.forEach(function (n) {
      var op = document.createElement('option');
      op.value = n;
      op.textContent = n;
      select.appendChild(op);
    });
    var outro = document.createElement('option');
    outro.value = OUTRO;
    outro.textContent = 'Outro medicamento (digitar o nome)';
    select.appendChild(outro);
  }

  function sugestaoPorSexo() {
    var sugestao = estado.ficha.sexo === 'M' ? 'Testosterona' : 'Mounjaro';
    // Não sugere um que já está cadastrado.
    var usados = estado.meds.map(function (m) { return m.nome; });
    if (usados.indexOf(sugestao) < 0) return sugestao;
    var livre = estado.nomes.find(function (n) { return usados.indexOf(n) < 0; });
    return livre || OUTRO;
  }

  function limparErros() {
    form.querySelectorAll('.campo__erro').forEach(function (e) { e.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (e) { e.setAttribute('aria-invalid', 'false'); });
  }

  function renderForm() {
    var med = estado.novo ? null : medSelecionado();
    limparErros();
    preencherSelect(med && med.nome);
    form.nomeEscolhido.value = med ? med.nome : sugestaoPorSexo();
    form.nomeOutro.value = '';
    atualizarOutro();
    form.doseMl.value = med ? F.paraInput(med.doseMl) : '';
    form.intervaloValor.value = med ? (med.intervaloValor || '') : '';
    form.intervaloUnidade.value = med ? (med.intervaloUnidade || 'dias') : 'dias';
    form.dataUltimaAplicacao.value = med ? (ultimaAplicacao(med) || '') : '';
    form.dataUltimaAplicacao.max = F.hojeISO();
    form.doseMg.value = med ? F.paraInput(med.doseMg) : '';
    form.observacoes.value = med ? (med.observacoes || '') : '';

    raiz.querySelector('[data-med-form-titulo]').textContent = med ? 'Dados do medicamento' : 'Novo medicamento';
    raiz.querySelector('[data-med-salvar-texto]').textContent = med ? 'Salvar alterações' : 'Cadastrar medicamento';
    raiz.querySelector('[data-med-cancelar]').hidden = !(estado.novo && estado.meds.length);
    raiz.querySelector('[data-med-excluir]').hidden = !med;
  }

  function renderHistorico() {
    var med = medSelecionado();
    var historico = raiz.querySelector('.prod__historico');
    historico.hidden = estado.novo || !med;
    if (historico.hidden) return;
    var lista = $('[data-aplicacoes]');
    lista.textContent = '';
    var apl = aplicacoesDe(med).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    $('[data-aplicacoes-vazio]').hidden = apl.length > 0;
    apl.forEach(function (a) {
      var li = document.createElement('li');
      li.className = 'aplicacoes__item';
      var d = document.createElement('span');
      d.textContent = F.dataCurta(a.data);
      var v = document.createElement('span');
      v.className = 'aplicacoes__ml';
      v.textContent = ml(a.doseMl);
      li.appendChild(d);
      li.appendChild(v);
      lista.appendChild(li);
    });
  }

  function renderTudo(animarEntrada) {
    var temMeds = estado.meds.length > 0;
    if (!estado.novo && !medSelecionado()) estado.selecionado = temMeds ? estado.meds[0].id : null;
    $('[data-meds-vazio]').hidden = temMeds || estado.novo;
    var conteudo = $('[data-meds-conteudo]');
    conteudo.hidden = !temMeds && !estado.novo;
    if (!estado.novo && estado.selecionado) conteudo.setAttribute('aria-labelledby', 'aba-med-' + estado.selecionado);
    else conteudo.removeAttribute('aria-labelledby');

    var mais = $('[data-meds-mais]');
    if (mais) mais.hidden = !temMeds || estado.novo;

    renderAbas();
    renderDose(estado.novo ? null : medSelecionado(), animarEntrada);
    renderForm();
    renderHistorico();
    renderBadge();
  }

  async function carregar() {
    var dados = await Promise.all([S.getMedicamentos(), S.getAplicacoes(), S.getNomesMedicamentos(), S.getFicha()]);
    estado.meds = dados[0];
    estado.aplicacoes = dados[1];
    estado.nomes = dados[2];
    estado.ficha = dados[3];
  }

  /* ======================================================================
     Formulário
     ====================================================================== */
  function atualizarOutro() {
    var outro = form.nomeEscolhido.value === OUTRO;
    raiz.querySelector('[data-med-outro]').hidden = !outro;
  }
  form.nomeEscolhido.addEventListener('change', function () {
    atualizarOutro();
    if (form.nomeEscolhido.value === OUTRO) form.nomeOutro.focus();
  });

  function mostrarErro(input, msg) {
    document.getElementById(input.id + '-erro').textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function nomeDigitado() {
    return form.nomeEscolhido.value === OUTRO ? form.nomeOutro.value.trim().replace(/\s+/g, ' ') : form.nomeEscolhido.value;
  }

  function validar() {
    var nome = nomeDigitado();
    var atual = estado.novo ? null : medSelecionado();
    var repetido = estado.meds.some(function (m) {
      return m.nome.toLowerCase() === nome.toLowerCase() && (!atual || m.id !== atual.id);
    });
    var campoNome = form.nomeEscolhido.value === OUTRO ? form.nomeOutro : form.nomeEscolhido;
    var okNome = mostrarErro(campoNome,
      !nome ? 'Escreva o nome do medicamento.'
        : nome.length < 2 ? 'O nome precisa ter pelo menos 2 letras.'
        : repetido ? 'Você já tem ' + nome + ' cadastrado. Escolha esse medicamento nas abas acima.' : '');
    if (campoNome === form.nomeOutro) mostrarErro(form.nomeEscolhido, '');

    var mlv = F.decimal(form.doseMl.value);
    var okMl = mostrarErro(form.doseMl,
      !form.doseMl.value.trim() ? 'Informe quantos mL por aplicação.'
        : mlv == null ? 'Use só números, como 0,5.'
        : mlv <= 0 || mlv > 10 ? 'Confira a dose: ela deve ficar entre 0,01 e 10 mL.' : '');

    var valor = Number(form.intervaloValor.value.trim());
    var semanas = form.intervaloUnidade.value === 'semanas';
    var max = semanas ? 52 : 365;
    var okIntervalo = mostrarErro(form.intervaloValor,
      !form.intervaloValor.value.trim() ? 'Informe o intervalo entre as aplicações.'
        : !Number.isInteger(valor) || valor < 1 || valor > max ? 'Use um número inteiro de 1 a ' + max + ' ' + (semanas ? 'semanas' : 'dias') + '.' : '');

    var data = form.dataUltimaAplicacao.value;
    var okData = mostrarErro(form.dataUltimaAplicacao,
      !data ? 'Informe a data da última aplicação.' : data > F.hojeISO() ? 'A data não pode ser no futuro.' : '');

    var mg = F.decimal(form.doseMg.value);
    var okMg = mostrarErro(form.doseMg,
      form.doseMg.value.trim() && (mg == null || mg <= 0 || mg > 1000) ? 'Confira a dose em mg (ex.: 2,5).' : '');

    var primeiro = !okNome ? campoNome : !okMl ? form.doseMl : !okIntervalo ? form.intervaloValor : !okData ? form.dataUltimaAplicacao : !okMg ? form.doseMg : null;
    if (primeiro) primeiro.focus();
    return !primeiro;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validar()) return;
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Salvando…');
    try {
      var valor = Number(form.intervaloValor.value.trim());
      var unidade = form.intervaloUnidade.value;
      var dataUltima = form.dataUltimaAplicacao.value;
      var doseMl = F.decimal(form.doseMl.value);
      var novo = estado.novo;
      var dados = {
        nome: nomeDigitado(),
        doseMl: doseMl,
        doseMg: F.decimal(form.doseMg.value),
        intervaloValor: valor,
        intervaloUnidade: unidade,
        intervaloDias: unidade === 'semanas' ? valor * 7 : valor,
        dataUltimaAplicacao: dataUltima,
        observacoes: form.observacoes.value.trim()
      };
      if (!novo) dados.id = estado.selecionado;
      var salvo = await S.saveMedicamento(dados);

      // Histórico coerente com "esta foi a última aplicação": entra a data
      // informada e saem registros posteriores a ela (correção de data).
      var apl = await S.getAplicacoes(salvo.id);
      for (var i = 0; i < apl.length; i++) if (apl[i].data > dataUltima) await S.removeAplicacao(apl[i].id);
      if (!apl.some(function (a) { return a.data === dataUltima; })) {
        await S.addAplicacao({ medicamentoId: salvo.id, data: dataUltima, doseMl: doseMl });
      }

      await carregar();
      estado.novo = false;
      estado.selecionado = salvo.id;
      renderTudo(true);
      var dose = calcularDose(salvo);
      PF.toast(salvo.nome + (dose ? '. Próxima dose: ' + F.dataExtenso(dose.proxima) + '.' : '.'), {
        titulo: novo ? 'Medicamento cadastrado' : 'Medicamento atualizado'
      });
      document.getElementById('aba-med-' + salvo.id).focus();
    } catch (err) {
      PF.toast(err.message || 'Não foi possível salvar. Tente novamente.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ======================================================================
     Ações: abas, novo, cancelar, excluir, registrar aplicação
     ====================================================================== */
  function selecionar(id, focar) {
    estado.novo = false;
    estado.selecionado = id;
    renderTudo(true);
    animar($('.prod__colunas'));
    if (focar) document.getElementById('aba-med-' + id).focus();
  }

  function abrirNovo() {
    estado.novo = true;
    renderTudo(false);
    animar($('.prod__colunas'));
    var titulo = raiz.querySelector('[data-med-form-titulo]');
    titulo.focus();
  }

  raiz.addEventListener('click', async function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;

    var aba = alvo.closest('[data-med]');
    if (aba) { selecionar(aba.dataset.med, false); return; }

    if (alvo.closest('[data-meds-novo]')) { abrirNovo(); return; }

    if (alvo.closest('[data-med-cancelar]')) {
      estado.novo = false;
      renderTudo(false);
      var abaAtual = document.getElementById('aba-med-' + estado.selecionado);
      if (abaAtual) abaAtual.focus();
      return;
    }

    if (alvo.closest('[data-med-excluir]')) {
      var med = medSelecionado();
      if (!med) return;
      var removido = await S.removeMedicamento(med.id);
      await carregar();
      estado.selecionado = estado.meds.length ? estado.meds[0].id : null;
      renderTudo(true);
      (raiz.querySelector('[data-med]') || raiz.querySelector('[data-meds-novo]')).focus();
      PF.toast('O medicamento ' + med.nome + ' e o histórico de aplicações foram excluídos.', {
        tipo: 'info',
        duracao: 7000,
        acao: {
          texto: 'Desfazer',
          onClick: async function () {
            await S.restaurarMedicamento(removido);
            await carregar();
            selecionar(med.id, true);
          }
        }
      });
      return;
    }

    if (alvo.closest('[data-registrar-hoje], [data-registrar-aplicacao]')) {
      await registrarHoje(alvo.closest('button'));
    }
  });

  // Setas do teclado entre as abas
  raiz.addEventListener('keydown', function (e) {
    var aba = e.target instanceof Element && e.target.closest('[role="tab"]');
    if (!aba) return;
    var abas = Array.prototype.slice.call(raiz.querySelectorAll('[role="tab"]'));
    var i = abas.indexOf(aba);
    var destino = e.key === 'ArrowRight' ? abas[(i + 1) % abas.length]
      : e.key === 'ArrowLeft' ? abas[(i - 1 + abas.length) % abas.length] : null;
    if (destino) { e.preventDefault(); selecionar(destino.dataset.med, true); }
  });

  async function registrarHoje(botao) {
    var med = medSelecionado();
    if (!med) return;
    var hoje = F.hojeISO();
    if (aplicacoesDe(med).some(function (a) { return a.data === hoje; })) {
      PF.toast('A aplicação de hoje de ' + med.nome + ' já está registrada.', { tipo: 'info' });
      return;
    }
    PF.setLoading(botao, true, 'Registrando…');
    try {
      await S.addAplicacao({ medicamentoId: med.id, data: hoje, doseMl: med.doseMl });
      await S.saveMedicamento({ id: med.id, dataUltimaAplicacao: hoje });
      await carregar();
      renderTudo(true);
      var dose = calcularDose(medSelecionado());
      PF.toast('Próxima dose: ' + F.dataExtenso(dose.proxima) + '.', { titulo: 'Aplicação de ' + med.nome + ' registrada' });
      var t = $('#dose-titulo');
      t.setAttribute('tabindex', '-1');
      t.focus();
    } catch (err) {
      PF.toast(err.message || 'Não foi possível registrar. Tente novamente.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  }

  /* ======================================================================
     Eventos e início
     ====================================================================== */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'medicamentos') return;
    // Ao abrir "Medicamentos", o aviso de dose já não é necessário.
    document.querySelectorAll('.toast').forEach(function (t) {
      if (/Lembrete de dose/.test(t.textContent)) t.querySelector('.toast__fechar').click();
    });
    await carregar();
    estado.novo = false;
    renderTudo(true);
  });

  document.addEventListener('pf:ficha-salva', function (e) {
    if (e.detail && e.detail.ficha) estado.ficha = e.detail.ficha;
  });

  var primeiraSecao = new Promise(function (r) {
    document.addEventListener('pf:secao', function (e) { r(e.detail.secao); }, { once: true });
  });

  PF.auth.pronto.then(async function (usuario) {
    if (!usuario) return;
    await carregar();
    renderBadge();
    if ((await primeiraSecao) !== 'medicamentos') avisarAoAbrir();
  });

  // abrirNovo: o painel (Início) abre direto o cadastro de outro medicamento.
  PF.medicamentos = { calcularDose: calcularDose, abrirNovo: function () { abrirNovo(); } };
})();
