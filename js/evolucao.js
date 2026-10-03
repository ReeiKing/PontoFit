/* ==========================================================================
   PontoFit — evolucao.js
   Seção "Minha evolução": resumo, progresso até a meta, gráfico (Chart.js),
   registro e histórico de peso, meta, ritmo/estimativa e marcos com confete.

   Série de pesos = peso inicial da ficha (se houver) + registros (PF.storage).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;

  var raiz = document.querySelector('[data-evolucao]');
  if (!raiz) return;

  var $ = function (sel) { return raiz.querySelector(sel); };
  var movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

  var estado = { ficha: {}, registros: [], periodo: 'tudo' };
  var grafico = null;

  /* ======================================================================
     Cálculos
     ====================================================================== */
  function montarSerie(ficha, registros) {
    var serie = registros.map(function (r) {
      return { id: r.id, data: r.data, pesoKg: r.pesoKg, cinturaCm: r.cinturaCm };
    });
    if (ficha.pesoInicialKg) {
      serie.push({
        id: null, // vem da ficha: não pode ser excluído aqui
        data: ficha.dataPesoInicial || (registros[0] && registros[0].data) || F.hojeISO(),
        pesoKg: ficha.pesoInicialKg,
        cinturaCm: ficha.cinturaCm || null,
        daFicha: true
      });
    }
    // Ordem por data; no mesmo dia, o da ficha vem primeiro.
    return serie.sort(function (a, b) {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      return (b.daFicha ? 1 : 0) - (a.daFicha ? 1 : 0);
    });
  }

  /** Tudo o que a tela mostra, calculado a partir da ficha e dos registros. */
  function calcular() {
    var ficha = estado.ficha;
    var serie = montarSerie(ficha, estado.registros);
    var r = { serie: serie, vazio: !serie.length };
    if (r.vazio) return r;

    r.inicial = serie[0];
    r.atual = serie[serie.length - 1];
    r.diferenca = r.atual.pesoKg - r.inicial.pesoKg;
    r.meta = ficha.metaPesoKg || null;
    r.metaData = ficha.metaData || null;

    // Direção desejada: -1 = perder, +1 = ganhar, 0 = indefinida
    if (r.meta != null && r.meta !== r.inicial.pesoKg) r.direcao = r.meta < r.inicial.pesoKg ? -1 : 1;
    else if (ficha.objetivo === 'emagrecer') r.direcao = -1;
    else if (ficha.objetivo === 'ganhar-massa') r.direcao = 1;
    else r.direcao = 0;

    if (r.meta != null) {
      r.falta = r.atual.pesoKg - r.meta; // >0 ainda acima da meta
      var caminho = r.inicial.pesoKg - r.meta;
      r.progresso = caminho === 0 ? 100 : Math.max(0, Math.min(100, ((r.inicial.pesoKg - r.atual.pesoKg) / caminho) * 100));
      r.atingida = r.direcao < 0 ? r.atual.pesoKg <= r.meta : r.direcao > 0 ? r.atual.pesoKg >= r.meta : Math.abs(r.falta) < 0.05;
    }

    // Ritmo médio (kg/semana) entre o primeiro e o último registro
    var dias = F.diasEntre(r.inicial.data, r.atual.data);
    r.dias = dias;
    r.ritmo = serie.length >= 2 && dias >= 1 ? r.diferenca / (dias / 7) : null;

    // Estimativa: só se o ritmo está indo na direção da meta
    if (r.meta != null && !r.atingida && r.ritmo && Math.sign(r.ritmo) === Math.sign(r.meta - r.atual.pesoKg)) {
      var semanas = Math.abs(r.falta) / Math.abs(r.ritmo);
      if (semanas < 520) r.estimativa = F.somarDias(F.hojeISO(), Math.ceil(semanas * 7));
    }

    // IMC
    var altura = ficha.alturaCm;
    r.imcInicial = F.imc(r.inicial.pesoKg, altura);
    r.imcAtual = F.imc(r.atual.pesoKg, altura);
    return r;
  }

  /* ======================================================================
     Renderização
     ====================================================================== */
  function kg(n) {
    if (n == null) return 'Sem registro';
    return F.numero(Math.abs(n)) + ' kg'; // 70 kg, 82,4 kg
  }

  /** Variação escrita por extenso, sem sinal: "1,2 kg a menos". */
  function variacaoKg(n) {
    if (Math.abs(n) < 0.05) return 'sem variação';
    return kg(n) + (n < 0 ? ' a menos' : ' a mais');
  }

  /** Ritmo por extenso: "perdendo 0,5 kg por semana". */
  function ritmoKg(n) {
    if (Math.abs(n) < 0.05) return 'peso estável';
    return (n < 0 ? 'perdendo ' : 'ganhando ') + kg(n) + ' por semana';
  }

  function definir(chave, texto) {
    var el = raiz.querySelector('[data-r="' + chave + '"]');
    if (el) el.textContent = texto;
  }

  function renderResumo(r) {
    $('[data-evo-vazio]').hidden = !r.vazio;

    definir('inicial', kg(r.vazio ? null : r.inicial.pesoKg));
    definir('inicial-info', r.vazio ? '' : F.dataCurta(r.inicial.data));
    definir('atual', kg(r.vazio ? null : r.atual.pesoKg));
    definir('atual-info', r.vazio ? '' : (r.serie.length > 1 ? 'em ' + F.dataCurta(r.atual.data) : 'ainda sem novos registros'));

    // Diferença: verde se foi na direção desejada, laranja se foi contra.
    var card = raiz.querySelector('[data-r-card="diferenca"]');
    card.classList.remove('resumo--bom', 'resumo--atencao');
    if (r.vazio || r.serie.length < 2) {
      definir('diferenca', r.vazio ? 'Sem registro' : '0 kg');
      definir('diferenca-info', r.vazio ? '' : 'registre um novo peso');
    } else {
      definir('diferenca', Math.abs(r.diferenca) < 0.05 ? '0 kg' : kg(r.diferenca));
      var foiBem = r.direcao !== 0 && Math.sign(r.diferenca) === r.direcao;
      var foiMal = r.direcao !== 0 && Math.abs(r.diferenca) >= 0.05 && Math.sign(r.diferenca) === -r.direcao;
      if (foiBem) card.classList.add('resumo--bom');
      if (foiMal) card.classList.add('resumo--atencao');
      definir('diferenca-info', r.diferenca <= -0.05 ? 'a menos que no início' : r.diferenca >= 0.05 ? 'a mais que no início' : 'estável');
    }

    definir('meta', r.meta != null ? kg(r.meta) : 'Sem meta');
    definir('meta-info', r.meta == null ? 'defina abaixo' : r.metaData ? 'até ' + F.dataCurta(r.metaData) : 'sem data definida');

    if (r.meta == null || r.vazio) {
      definir('falta', r.meta == null ? 'Sem meta' : 'Sem registro');
      definir('falta-info', r.meta == null ? 'defina uma meta' : '');
    } else if (r.atingida) {
      definir('falta', 'Atingida!');
      definir('falta-info', 'você chegou lá');
    } else {
      definir('falta', kg(Math.abs(r.falta)));
      definir('falta-info', r.falta > 0 ? 'para perder' : 'para ganhar');
    }
  }

  function renderProgresso(r, animar) {
    var barra = $('[data-progresso-barra]');
    var preenchido = $('[data-progresso-preenchido]');
    var pct = r.progresso == null ? 0 : Math.round(r.progresso);

    $('[data-progresso-texto]').textContent = r.progresso == null ? 'Defina uma meta' : pct + '% do caminho';
    barra.setAttribute('aria-valuenow', String(pct));
    barra.setAttribute('aria-valuetext', r.progresso == null ? 'Sem meta definida' : pct + '% do caminho até a meta');
    barra.classList.toggle('is-completa', !!r.atingida);
    $('[data-progresso-de]').textContent = r.vazio ? '' : 'Início: ' + kg(r.inicial.pesoKg);
    $('[data-progresso-ate]').textContent = r.meta != null ? 'Meta: ' + kg(r.meta) : '';

    // Ao abrir a seção, a barra cresce do zero.
    if (animar && !movimentoReduzido.matches) {
      preenchido.style.transition = 'none';
      preenchido.style.width = '0%';
      void preenchido.offsetWidth;
      preenchido.style.transition = '';
    }
    requestAnimationFrame(function () { preenchido.style.width = pct + '%'; });

    // IMC
    var imc = $('[data-imc-comparacao]');
    var imcExtra = $('[data-imc-extra]');
    if (r.imcInicial == null) {
      imc.textContent = 'Sem dados';
      imcExtra.textContent = r.vazio ? '' : 'informe sua altura na ficha';
    } else {
      imc.textContent = F.numero(r.imcInicial, 1) + ' → ' + F.numero(r.imcAtual, 1);
      imcExtra.textContent = F.faixaImc(r.imcAtual).rotulo;
    }

    // Ritmo
    if (r.ritmo == null) {
      $('[data-ritmo]').textContent = 'Sem dados';
      $('[data-ritmo-extra]').textContent = r.vazio ? '' : 'precisa de pelo menos 2 registros em dias diferentes';
    } else {
      $('[data-ritmo]').textContent = ritmoKg(r.ritmo);
      $('[data-ritmo-extra]').textContent = 'em ' + r.dias + ' ' + F.plural(r.dias, 'dia', 'dias');
    }

    // Estimativa
    var est = $('[data-estimativa]');
    var estExtra = $('[data-estimativa-extra]');
    if (r.atingida) {
      est.textContent = 'Meta atingida!';
      estExtra.textContent = '';
    } else if (r.meta == null) {
      est.textContent = 'Sem meta';
      estExtra.textContent = 'defina uma meta';
    } else if (!r.estimativa) {
      est.textContent = 'Sem estimativa';
      estExtra.textContent = 'ainda não dá para estimar com o ritmo atual';
    } else {
      est.textContent = F.dataCurta(r.estimativa);
      if (r.metaData) {
        if (r.estimativa <= r.metaData) {
          estExtra.textContent = 'antes da data desejada (' + F.dataCurta(r.metaData) + ')';
        } else {
          var diasAteData = F.diasEntre(F.hojeISO(), r.metaData);
          estExtra.textContent = diasAteData > 0
            ? 'para chegar até ' + F.dataCurta(r.metaData) + ', seria preciso ' + (r.falta > 0 ? 'perder ' : 'ganhar ') + kg(r.falta / (diasAteData / 7)) + ' por semana'
            : 'a data desejada já passou; ajuste a meta para ter uma nova estimativa';
        }
      } else {
        estExtra.textContent = 'mantendo o ritmo atual';
      }
    }
  }

  function renderHistorico(r) {
    var corpo = $('[data-historico] tbody');
    var tabela = $('[data-historico]');
    corpo.textContent = '';
    tabela.hidden = r.vazio;
    $('[data-historico-vazio]').hidden = !r.vazio;
    if (r.vazio) return;

    // Mais recente primeiro; variação em relação ao registro anterior.
    for (var i = r.serie.length - 1; i >= 0; i--) {
      var item = r.serie[i];
      var anterior = r.serie[i - 1];
      var tr = document.createElement('tr');

      var tdData = celula('Data', F.dataCurta(item.data));
      if (item.daFicha) {
        var tag = document.createElement('span');
        tag.className = 'badge tabela__tag';
        tag.textContent = 'inicial';
        tdData.appendChild(document.createTextNode(' '));
        tdData.appendChild(tag);
      }
      tr.appendChild(tdData);
      tr.appendChild(celula('Peso', kg(item.pesoKg)));

      var variacao = anterior ? item.pesoKg - anterior.pesoKg : null;
      var tdVar = celula('Variação', variacao == null ? 'Início' : variacaoKg(variacao));
      if (variacao != null && Math.abs(variacao) >= 0.05 && r.direcao !== 0) {
        tdVar.classList.add(Math.sign(variacao) === r.direcao ? 'tabela__bom' : 'tabela__atencao');
      }
      tr.appendChild(tdVar);
      tr.appendChild(celula('Cintura', item.cinturaCm ? F.numero(item.cinturaCm, 1) + ' cm' : 'Não informada'));

      var tdAcao = celula('', '');
      tdAcao.className = 'tabela__acao';
      if (!item.daFicha) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--perigo btn--sm';
        btn.dataset.excluir = item.id;
        btn.setAttribute('aria-label', 'Excluir registro de ' + F.dataCurta(item.data) + ', ' + kg(item.pesoKg));
        btn.textContent = 'Excluir';
        tdAcao.appendChild(btn);
      } else {
        var dica = document.createElement('span');
        dica.className = 'texto-sm texto-sec';
        dica.textContent = 'Editável na ficha';
        tdAcao.appendChild(dica);
      }
      tr.appendChild(tdAcao);
      corpo.appendChild(tr);
    }
  }

  function celula(rotulo, texto) {
    var td = document.createElement('td');
    if (rotulo) td.dataset.rotulo = rotulo; // rótulo nos cards empilhados (celular)
    td.textContent = texto;
    return td;
  }

  /* ---------- Gráfico ---------- */
  function cor(variavel) {
    return getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
  }

  function renderGrafico(r) {
    var canvas = $('[data-grafico]');
    var vazio = $('[data-grafico-vazio]');
    $('[data-legenda-meta]').hidden = r.meta == null;

    if (typeof window.Chart === 'undefined') {
      canvas.hidden = true;
      vazio.hidden = false;
      vazio.textContent = 'Não foi possível carregar o gráfico (verifique sua conexão). Seus registros continuam no histórico abaixo.';
      return;
    }

    var pontos = r.vazio ? [] : r.serie;
    if (estado.periodo !== 'tudo') {
      var desde = F.somarDias(F.hojeISO(), -Number(estado.periodo));
      pontos = pontos.filter(function (p) { return p.data >= desde; });
    }

    canvas.hidden = !pontos.length;
    vazio.hidden = !!pontos.length;
    if (!pontos.length) {
      vazio.textContent = r.vazio ? 'Seu gráfico aparece aqui depois do primeiro registro de peso.' : 'Nenhum registro nesse período.';
      if (grafico) { grafico.destroy(); grafico = null; }
      return;
    }

    var dados = pontos.map(function (p) { return { x: F.dataDe(p.data).getTime(), y: p.pesoKg }; });
    var xs = dados.map(function (d) { return d.x; });
    var minX = Math.min.apply(null, xs);
    var maxX = Math.max.apply(null, xs);
    if (minX === maxX) { minX -= 86400000 * 3; maxX += 86400000 * 3; } // um ponto só: dá respiro

    var conjuntos = [{
      label: 'Peso',
      data: dados,
      borderColor: cor('--verde'),
      backgroundColor: 'rgba(46, 157, 106, .12)',
      pointBackgroundColor: cor('--verde'),
      pointBorderColor: cor('--superficie'),
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      borderWidth: 3,
      cubicInterpolationMode: 'monotone', // curva suave sem "passar" dos pontos
      fill: true
    }];
    if (r.meta != null) {
      conjuntos.push({
        label: 'Meta',
        data: [{ x: minX, y: r.meta }, { x: maxX, y: r.meta }],
        borderColor: cor('--laranja'),
        borderDash: [8, 6],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false
      });
    }

    var corTexto = cor('--texto-sec');
    var corGrade = cor('--borda');
    canvas.setAttribute('aria-label', 'Gráfico do peso: de ' + kg(pontos[0].pesoKg) + ' em ' + F.dataCurta(pontos[0].data) +
      ' para ' + kg(pontos[pontos.length - 1].pesoKg) + ' em ' + F.dataCurta(pontos[pontos.length - 1].data) +
      (r.meta != null ? '. Meta: ' + kg(r.meta) : '') + '. Os valores estão na tabela de histórico.');

    var opcoes = {
      responsive: true,
      maintainAspectRatio: false,
      animation: movimentoReduzido.matches ? false : { duration: 700 },
      interaction: { mode: 'nearest', intersect: false },
      layout: { padding: { top: 8, right: 12, left: 4 } }, // pontos das bordas não ficam cortados
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: function (item) { return item.datasetIndex === 0; },
          callbacks: {
            title: function (itens) { return new Date(itens[0].parsed.x).toLocaleDateString('pt-BR'); },
            label: function (item) { return ' ' + kg(item.parsed.y); }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: minX,
          max: maxX,
          grid: { display: false },
          border: { color: corGrade },
          ticks: {
            color: corTexto,
            maxTicksLimit: 6,
            callback: function (v) {
              return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            }
          }
        },
        y: {
          grace: '8%',
          grid: { color: corGrade },
          border: { display: false },
          ticks: {
            color: corTexto,
            maxTicksLimit: 6,
            callback: function (v) { return F.numero(v, 0) + ' kg'; }
          }
        }
      }
    };

    if (grafico) {
      grafico.data.datasets = conjuntos;
      grafico.options = opcoes;
      grafico.update();
    } else {
      Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
      grafico = new Chart(canvas, { type: 'line', data: { datasets: conjuntos }, options: opcoes });
    }
  }

  function renderTudo(animar) {
    var r = calcular();
    renderResumo(r);
    renderProgresso(r, animar);
    renderGrafico(r);
    renderHistorico(r);
    return r;
  }

  async function recarregar(animar) {
    var dados = await Promise.all([S.getFicha(), S.getPesos()]);
    estado.ficha = dados[0];
    estado.registros = dados[1];
    preencherMeta();
    return renderTudo(animar);
  }

  /* ======================================================================
     Marcos e confete
     ====================================================================== */
  var MARCOS = [
    { id: '1kg', teste: function (r) { return r.direcao !== 0 && r.diferenca * r.direcao >= 1; },
      msg: function (r) { return r.direcao < 0 ? 'Você já perdeu 1 kg. Continue assim!' : 'Você já ganhou 1 kg. Continue assim!'; } },
    { id: '5kg', teste: function (r) { return r.direcao !== 0 && r.diferenca * r.direcao >= 5; },
      msg: function (r) { return r.direcao < 0 ? 'Você já perdeu 5 kg desde o peso inicial.' : 'Você já ganhou 5 kg desde o peso inicial.'; } },
    { id: 'metade', teste: function (r) { return r.progresso != null && r.progresso >= 50 && !r.atingida; },
      msg: function () { return 'Você já fez metade do caminho até a meta.'; } },
    { id: 'meta', teste: function (r) { return !!r.atingida; }, confete: true,
      msg: function () { return 'Você chegou à sua meta de peso. Converse com seu médico ou nutricionista sobre os próximos passos.'; } }
  ];

  async function verificarMarcos(r) {
    var vistos = (estado.ficha.marcosVistos || []).slice();
    var novos = MARCOS.filter(function (m) { return vistos.indexOf(m.id) < 0 && m.teste(r); });
    if (!novos.length) return;

    // Mostra só o marco mais importante (o último da lista).
    var principal = novos[novos.length - 1];
    PF.toast(principal.msg(r), { titulo: principal.confete ? 'Parabéns!' : 'Marco alcançado!', duracao: 7000 });
    if (principal.confete) confete();

    estado.ficha = await S.saveFicha({ marcosVistos: vistos.concat(novos.map(function (m) { return m.id; })) });
    document.dispatchEvent(new CustomEvent('pf:ficha-salva', { detail: { ficha: estado.ficha } }));
  }

  function confete() {
    if (movimentoReduzido.matches) return;
    var cores = [cor('--verde'), cor('--agua'), cor('--laranja'), '#E9C46A', '#F58C7A'];
    var caixa = document.createElement('div');
    caixa.className = 'confete';
    caixa.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 90; i++) {
      var p = document.createElement('span');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = cores[i % cores.length];
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
      p.style.setProperty('--deriva', (Math.random() * 160 - 80).toFixed(0) + 'px');
      p.style.setProperty('--giro', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      if (i % 3 === 0) p.style.borderRadius = '50%';
      caixa.appendChild(p);
    }
    document.body.appendChild(caixa);
    setTimeout(function () { caixa.remove(); }, 4600);
  }

  /* ======================================================================
     Formulários
     ====================================================================== */
  function mostrarErro(input, msg) {
    document.getElementById(input.id + '-erro').textContent = msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function validarFaixa(input, min, max, obrigatorio, nome, unidade) {
    var v = input.value.trim();
    if (!v) return mostrarErro(input, obrigatorio ? 'Informe ' + nome + '.' : '');
    var n = F.decimal(v);
    if (n == null) return mostrarErro(input, 'Use só números, como 72,5.');
    if (n < min || n > max) return mostrarErro(input, 'Confira ' + nome + ': deve ficar entre ' + min + ' e ' + max + ' ' + unidade + '.');
    return mostrarErro(input, '');
  }

  /* ---------- Registrar peso ---------- */
  var formPeso = document.getElementById('form-peso');

  function validarPeso() {
    var okData = formPeso.data.value
      ? mostrarErro(formPeso.data, formPeso.data.value > F.hojeISO() ? 'A data não pode ser no futuro.' : '')
      : mostrarErro(formPeso.data, 'Informe a data.');
    var okPeso = validarFaixa(formPeso.peso, 20, 400, true, 'o peso', 'kg');
    var okCintura = validarFaixa(formPeso.cintura, 30, 250, false, 'a cintura', 'cm');
    var primeiro = !okData ? formPeso.data : !okPeso ? formPeso.peso : !okCintura ? formPeso.cintura : null;
    if (primeiro) primeiro.focus();
    return !primeiro;
  }

  formPeso.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validarPeso()) return;
    var botao = formPeso.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Registrando…');
    try {
      var data = formPeso.data.value;
      // Um registro por dia: se já existe, substitui.
      var existente = estado.registros.find(function (p) { return p.data === data; });
      if (existente) await S.removePeso(existente.id);
      await S.addPeso({ data: data, pesoKg: F.decimal(formPeso.peso.value), cinturaCm: F.decimal(formPeso.cintura.value) });

      var r = await recarregar(false);
      PF.toast(existente ? 'O registro de ' + F.dataCurta(data) + ' foi atualizado.' : 'Peso registrado. O gráfico já foi atualizado.', { tipo: 'sucesso' });
      formPeso.peso.value = '';
      formPeso.cintura.value = '';
      formPeso.data.value = F.hojeISO();
      await verificarMarcos(r);
    } catch (err) {
      PF.toast(err.message || 'Não foi possível registrar. Tente novamente.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Excluir registro (com desfazer) ---------- */
  raiz.addEventListener('click', async function (e) {
    var btn = e.target instanceof Element && e.target.closest('[data-excluir]');
    if (!btn) return;
    var registro = estado.registros.find(function (p) { return p.id === btn.dataset.excluir; });
    if (!registro) return;
    await S.removePeso(registro.id);
    await recarregar(false);
    // O botão some com a linha: o foco vai para o título do histórico.
    var tituloHistorico = $('#evo-t-historico');
    tituloHistorico.setAttribute('tabindex', '-1');
    tituloHistorico.focus();
    PF.toast('Registro de ' + F.dataCurta(registro.data) + ' excluído.', {
      tipo: 'info',
      duracao: 6000,
      acao: {
        texto: 'Desfazer',
        onClick: async function () {
          await S.addPeso(registro);
          await recarregar(false);
          PF.toast('Registro restaurado.');
        }
      }
    });
  });

  /* ---------- Meta ---------- */
  var formMeta = document.getElementById('form-meta');

  function preencherMeta() {
    if (document.activeElement && formMeta.contains(document.activeElement)) return; // não atrapalha quem digita
    formMeta.metaPeso.value = F.paraInput(estado.ficha.metaPesoKg);
    formMeta.metaData.value = estado.ficha.metaData || '';
  }

  formMeta.addEventListener('submit', async function (e) {
    e.preventDefault();
    var okPeso = validarFaixa(formMeta.metaPeso, 20, 400, true, 'a meta', 'kg');
    var okData = mostrarErro(formMeta.metaData,
      formMeta.metaData.value && formMeta.metaData.value <= F.hojeISO() ? 'Escolha uma data no futuro.' : '');
    if (!okPeso) { formMeta.metaPeso.focus(); return; }
    if (!okData) { formMeta.metaData.focus(); return; }

    var botao = formMeta.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Salvando meta…');
    try {
      var novaMeta = F.decimal(formMeta.metaPeso.value);
      var mudou = novaMeta !== estado.ficha.metaPesoKg;
      var campos = { metaPesoKg: novaMeta, metaData: formMeta.metaData.value };
      // Meta nova → os marcos ligados à meta podem ser comemorados de novo.
      if (mudou) {
        campos.marcosVistos = (estado.ficha.marcosVistos || []).filter(function (m) {
          return m !== 'metade' && m !== 'meta';
        });
      }
      estado.ficha = await S.saveFicha(campos);
      document.dispatchEvent(new CustomEvent('pf:ficha-salva', { detail: { ficha: estado.ficha } }));
      var r = renderTudo(true);
      PF.toast('Sua meta foi salva.', { titulo: 'Meta atualizada' });
      // Marcos de meta (ex.: já atingida) só valem para uma meta nova.
      if (mudou) await verificarMarcos(r);
    } catch (err) {
      PF.toast(err.message || 'Não foi possível salvar a meta.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Filtro do gráfico ---------- */
  raiz.querySelectorAll('[name="periodo"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      estado.periodo = radio.value;
      renderGrafico(calcular());
    });
  });

  /* ======================================================================
     Início e eventos
     ====================================================================== */
  // A ficha mudou (peso inicial, altura, objetivo…) → recalcula.
  document.addEventListener('pf:ficha-salva', function (e) {
    if (!e.detail || !e.detail.ficha || e.detail.ficha === estado.ficha) return;
    estado.ficha = e.detail.ficha;
    preencherMeta();
    if (PF.app && PF.app.secaoAtual === 'evolucao') renderTudo(false);
  });

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao !== 'evolucao') return;
    formPeso.data.max = F.hojeISO();
    if (!formPeso.data.value) formPeso.data.value = F.hojeISO();
    recarregar(true);
  });

  // Tema do sistema mudou → recolore o gráfico.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (grafico) { grafico.destroy(); grafico = null; }
    if (PF.app && PF.app.secaoAtual === 'evolucao') renderGrafico(calcular());
  });
})();
