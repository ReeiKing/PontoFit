/* ==========================================================================
   PontoFit — exames.js
   Medicamentos → "Exames de sangue": o paciente registra os resultados de
   cada exame (com o laudo em PDF/foto, opcional), vê o que está abaixo,
   dentro ou acima da referência, a variação desde o exame anterior e o
   gráfico da evolução de cada marcador. Catálogo em exames-dados.js.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;
  var E = PF.exames;
  var raiz = document.querySelector('[data-exames]');
  if (!raiz || !S || !E) return;
  var $ = function (sel) { return document.querySelector(sel); };

  var exames = [];
  var ficha = {};
  var carregado = false;
  var abertos = {};      // exames expandidos na lista
  var grafico = null;

  var SITUACAO = {
    abaixo: { nome: 'Abaixo', classe: 'badge--laranja' },
    normal: { nome: 'Dentro', classe: '' },
    acima: { nome: 'Acima', classe: 'badge--vermelho' }
  };

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function numero(v) { return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); }
  function idade() { return ficha.dataNascimento ? F.idade(ficha.dataNascimento) : null; }

  /* ---------- Lista ---------- */
  /** Resultado anterior do mesmo marcador (exame mais antigo mais próximo). */
  function anteriorDe(marcador, indiceExame) {
    for (var i = indiceExame + 1; i < exames.length; i++) {
      var r = exames[i].resultados.find(function (x) { return x.marcador === marcador; });
      if (r) return { valor: r.valor, data: exames[i].data };
    }
    return null;
  }

  function render() {
    var lista = $('[data-exames-lista]');
    lista.textContent = '';
    $('[data-exames-vazio]').hidden = exames.length > 0;
    exames.forEach(function (ex, i) { lista.appendChild(itemExame(ex, i)); });
    renderEvolucao();
  }

  function itemExame(ex, indice) {
    var li = el('li', 'exame');
    var fora = ex.resultados.filter(function (r) {
      var s = E.situacao(r.valor, r.refMin, r.refMax);
      return s === 'abaixo' || s === 'acima';
    }).length;

    var cab = el('button', 'exame__cabecalho');
    cab.type = 'button';
    cab.setAttribute('aria-expanded', String(!!abertos[ex.id]));
    cab.setAttribute('aria-controls', 'exame-' + ex.id);
    var quem = el('span', 'exame__quem');
    quem.appendChild(el('strong', null, F.dataExtenso(ex.data, true)));
    quem.appendChild(el('span', 'texto-sm texto-sec', [ex.laboratorio, ex.resultados.length + (ex.resultados.length === 1 ? ' resultado' : ' resultados')].filter(Boolean).join(' · ')));
    cab.appendChild(quem);
    cab.appendChild(el('span', 'badge ' + (fora ? 'badge--laranja' : ''), fora ? fora + ' fora da referência' : 'Tudo na referência'));
    cab.insertAdjacentHTML('beforeend', '<svg class="exame__seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6"/></svg>');
    cab.addEventListener('click', function () {
      abertos[ex.id] = !abertos[ex.id];
      cab.setAttribute('aria-expanded', String(abertos[ex.id]));
      corpo.hidden = !abertos[ex.id];
    });
    li.appendChild(cab);

    var corpo = el('div', 'exame__corpo');
    corpo.id = 'exame-' + ex.id;
    corpo.hidden = !abertos[ex.id];
    var tabela = el('table', 'tabela exame__tabela');
    tabela.innerHTML = '<thead><tr><th scope="col">Marcador</th><th scope="col">Resultado</th><th scope="col">Referência</th><th scope="col">Situação</th></tr></thead>';
    var tb = el('tbody');
    ex.resultados.forEach(function (r) {
      var tr = el('tr');
      var td = function (rotulo, conteudo) {
        var c = el('td');
        c.dataset.rotulo = rotulo;
        if (conteudo instanceof Node) c.appendChild(conteudo); else c.textContent = conteudo;
        tr.appendChild(c);
      };
      var th = el('th', null, r.nome);
      th.scope = 'row';
      tr.appendChild(th);
      var res = el('span', 'exame__valor');
      res.appendChild(el('strong', null, numero(r.valor) + (r.unidade ? ' ' + r.unidade : '')));
      var ant = anteriorDe(r.marcador, indice);
      if (ant && ant.valor !== r.valor) {
        var dif = r.valor - ant.valor;
        res.appendChild(el('span', 'exame__variacao', (dif > 0 ? '↑ +' : '↓ −') + numero(Math.abs(Math.round(dif * 1000) / 1000)) + ' desde ' + F.dataCurta(ant.data)));
      }
      td('Resultado', res);
      td('Referência', E.textoRef(r.refMin, r.refMax, r.unidade));
      var s = E.situacao(r.valor, r.refMin, r.refMax);
      td('Situação', s ? el('span', 'badge ' + SITUACAO[s].classe, SITUACAO[s].nome) : '—');
      tb.appendChild(tr);
    });
    tabela.appendChild(tb);
    corpo.appendChild(tabela);
    if (ex.observacoes) corpo.appendChild(el('p', 'exame__obs texto-sm', ex.observacoes));

    var acoes = el('div', 'exame__acoes');
    if (ex.arquivo) {
      var laudo = el('button', 'btn btn--sm btn--secundario', 'Ver laudo');
      laudo.type = 'button';
      laudo.addEventListener('click', function () { abrirLaudo(ex.arquivo, laudo); });
      acoes.appendChild(laudo);
    }
    var editar = el('button', 'btn btn--sm btn--fantasma', 'Editar');
    editar.type = 'button';
    editar.addEventListener('click', function () { abrirDialogo(ex); });
    var excluir = el('button', 'btn btn--sm btn--fantasma exame__excluir', 'Excluir');
    excluir.type = 'button';
    excluir.addEventListener('click', async function () {
      if (!confirm('Excluir o exame de ' + F.dataCurta(ex.data) + '? Os resultados e o laudo serão apagados.')) return;
      PF.setLoading(excluir, true, 'Excluindo…');
      try {
        await S.excluirExame(ex.id, ex.arquivo);
        PF.toast('Exame excluído.');
        await carregar();
      } catch (err) {
        PF.toast(err.message, { tipo: 'erro' });
        PF.setLoading(excluir, false);
      }
    });
    acoes.appendChild(editar);
    acoes.appendChild(excluir);
    corpo.appendChild(acoes);
    li.appendChild(corpo);
    return li;
  }

  async function abrirLaudo(caminho, botao) {
    // Abre a aba já no clique (Safari bloqueia window.open depois de um await).
    var aba = window.open('', '_blank');
    PF.setLoading(botao, true, 'Abrindo…');
    try {
      var url = await S.urlLaudo(caminho);
      if (aba) aba.location.href = url; else location.href = url;
    } catch (err) {
      if (aba) aba.close();
      PF.toast(err.message, { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  }

  /* ---------- Evolução de um marcador ---------- */
  function renderEvolucao() {
    var caixa = $('[data-exames-evolucao]');
    var sel = $('[data-exames-marcador]');
    var contagem = {};
    var nomes = {};
    exames.forEach(function (ex) {
      ex.resultados.forEach(function (r) { contagem[r.marcador] = (contagem[r.marcador] || 0) + 1; nomes[r.marcador] = r.nome; });
    });
    var ids = Object.keys(contagem).sort(function (a, b) { return nomes[a].localeCompare(nomes[b], 'pt-BR'); });
    caixa.hidden = !ids.length;
    if (!ids.length) return;
    var atual = sel.value;
    sel.textContent = '';
    ids.forEach(function (id) {
      var o = el('option', null, nomes[id] + (contagem[id] > 1 ? ' (' + contagem[id] + ' exames)' : ''));
      o.value = id;
      sel.appendChild(o);
    });
    // Começa por um marcador com mais de um exame (mais útil no gráfico).
    sel.value = ids.indexOf(atual) >= 0 ? atual : (ids.find(function (id) { return contagem[id] > 1; }) || ids[0]);
    desenharGrafico(sel.value);
  }

  function cor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

  function desenharGrafico(marcador) {
    var pontos = [];
    var ultimo = null;
    exames.slice().reverse().forEach(function (ex) {
      var r = ex.resultados.find(function (x) { return x.marcador === marcador; });
      if (r) { pontos.push({ x: F.dataDe(ex.data).getTime(), y: r.valor, data: ex.data }); ultimo = r; }
    });
    var info = $('[data-exames-grafico-info]');
    info.textContent = ultimo ? 'Referência: ' + E.textoRef(ultimo.refMin, ultimo.refMax, ultimo.unidade) + (pontos.length < 2 ? '. Registre o próximo exame para ver a evolução.' : '') : '';
    var canvas = $('[data-exames-grafico]');
    canvas.setAttribute('aria-label', (ultimo ? ultimo.nome : '') + ': ' + pontos.map(function (p) { return numero(p.y) + ' em ' + F.dataCurta(p.data); }).join('; '));
    if (typeof window.Chart !== 'function') return;

    var conjuntos = [{
      data: pontos, borderColor: cor('--verde'), backgroundColor: cor('--verde'), pointRadius: 5, pointHoverRadius: 7, borderWidth: 3, tension: 0.25
    }];
    var minX = pontos.length ? pontos[0].x : 0;
    var maxX = pontos.length ? pontos[pontos.length - 1].x : 1;
    if (minX === maxX) { minX -= 15 * 864e5; maxX += 15 * 864e5; }
    [['refMin', 'Mínimo'], ['refMax', 'Máximo']].forEach(function (k) {
      if (ultimo && ultimo[k[0]] != null) {
        conjuntos.push({ label: k[1], data: [{ x: minX, y: ultimo[k[0]] }, { x: maxX, y: ultimo[k[0]] }], borderColor: cor('--laranja'), borderDash: [6, 5], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0 });
      }
    });
    var opcoes = {
      responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: function (i) { return i.datasetIndex === 0; },
          callbacks: {
            title: function (it) { return it.length ? new Date(it[0].parsed.x).toLocaleDateString('pt-BR') : ''; },
            label: function (it) { return ' ' + numero(it.parsed.y) + (ultimo && ultimo.unidade ? ' ' + ultimo.unidade : ''); }
          }
        }
      },
      scales: {
        x: { type: 'linear', min: minX, max: maxX, grid: { display: false }, ticks: { color: cor('--texto-sec'), maxTicksLimit: 5, callback: function (v) { return new Date(v).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' }); } } },
        y: { grace: '15%', grid: { color: cor('--borda') }, ticks: { color: cor('--texto-sec'), maxTicksLimit: 5, callback: function (v) { return numero(v); } } }
      }
    };
    if (grafico) {
      grafico.setActiveElements([]);
      if (grafico.tooltip) grafico.tooltip.setActiveElements([], { x: 0, y: 0 });
      grafico.data.datasets = conjuntos;
      grafico.options = opcoes;
      grafico.update();
    } else {
      grafico = new window.Chart(canvas, { type: 'line', data: { datasets: conjuntos }, options: opcoes });
    }
  }
  $('[data-exames-marcador]').addEventListener('change', function (e) { desenharGrafico(e.target.value); });

  /* ---------- Cadastro / edição ---------- */
  var dlg = $('[data-exame-dialogo]');
  var form = $('[data-exame-form]');
  var linhas = $('[data-exame-linhas]');
  var editando = null;   // exame em edição
  var arquivoNovo = null;
  var removerArquivo = false;
  var nLinha = 0;

  (function montarSeletores() {
    var add = $('[data-exame-add]');
    add.appendChild(new Option('+ Adicionar marcador…', ''));
    var grupos = {};
    E.MARCADORES.forEach(function (m) {
      if (!grupos[m.grupo]) { grupos[m.grupo] = el('optgroup'); grupos[m.grupo].label = m.grupo; add.appendChild(grupos[m.grupo]); }
      grupos[m.grupo].appendChild(new Option(m.nome, m.id));
    });
    var outro = el('optgroup');
    outro.label = 'Outro';
    outro.appendChild(new Option('Outro marcador (digitar o nome)', '__outro'));
    add.appendChild(outro);
    add.addEventListener('change', function () {
      if (!add.value) return;
      var linha = adicionarLinha(add.value === '__outro' ? null : add.value);
      add.value = '';
      if (linha) (linha.querySelector('[data-campo="nome"]:not([readonly])') || linha.querySelector('[data-campo="valor"]')).focus();
    });

    var pac = $('[data-exame-pacotes]');
    E.PACOTES.forEach(function (p) {
      var b = el('button', 'filtro', '+ ' + p.nome);
      b.type = 'button';
      b.addEventListener('click', function () {
        var primeira = null;
        p.marcadores.forEach(function (id) { var l = adicionarLinha(id); if (l && !primeira) primeira = l; });
        if (primeira) primeira.querySelector('[data-campo="valor"]').focus();
        else PF.toast('Esses marcadores já estão na lista.', { tipo: 'info' });
      });
      pac.appendChild(b);
    });
  })();

  function campoLinha(li, rotulo, nome, valor, attrs) {
    nLinha++;
    var c = el('div', 'campo exame-linha__' + nome);
    var l = el('label', 'campo__label', rotulo);
    var i = el('input', 'input');
    i.id = 'exl-' + nome + '-' + nLinha;
    l.htmlFor = i.id;
    i.dataset.campo = nome;
    i.value = valor == null ? '' : valor;
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] === true) i.setAttribute(k, ''); else i.setAttribute(k, attrs[k]); });
    c.appendChild(l);
    c.appendChild(i);
    li.appendChild(c);
    return i;
  }

  /** Linha de resultado. marcadorId null = marcador livre. r = valores já salvos (edição). */
  function adicionarLinha(marcadorId, r) {
    if (marcadorId && linhas.querySelector('[data-marcador="' + marcadorId + '"]')) return null;
    var m = marcadorId ? E.marcador(marcadorId) : null;
    var ref = m && m.ref ? m.ref(ficha.sexo, idade()) : null;
    r = r || {};
    var li = el('li', 'exame-linha');
    li.dataset.marcador = marcadorId || '';
    var paraInput = function (v) { return v == null ? '' : F.paraInput(v); };
    campoLinha(li, 'Marcador', 'nome', r.nome || (m ? m.nome : ''), m ? { readonly: true, tabindex: '-1' } : { maxlength: '80', placeholder: 'Ex.: Homocisteína' });
    campoLinha(li, 'Resultado', 'valor', paraInput(r.valor), { inputmode: 'decimal', placeholder: 'Ex.: 427,36' });
    campoLinha(li, 'Unidade', 'unidade', r.unidade != null ? r.unidade : (m ? m.unidade : ''), { maxlength: '20' });
    campoLinha(li, 'Ref. mín.', 'min', r.refMin !== undefined ? paraInput(r.refMin) : paraInput(ref && ref[0]), { inputmode: 'decimal' });
    campoLinha(li, 'Ref. máx.', 'max', r.refMax !== undefined ? paraInput(r.refMax) : paraInput(ref && ref[1]), { inputmode: 'decimal' });
    var tirar = el('button', 'exame-linha__tirar');
    tirar.type = 'button';
    tirar.setAttribute('aria-label', 'Remover ' + (r.nome || (m ? m.nome : 'marcador')));
    tirar.textContent = '×';
    tirar.addEventListener('click', function () { li.remove(); });
    li.appendChild(tirar);
    linhas.appendChild(li);
    return li;
  }

  function mostrarArquivo(nome) {
    $('[data-exame-arquivo-nome]').textContent = nome || 'Nenhum arquivo';
    $('[data-exame-arquivo-tirar]').hidden = !nome;
  }
  form.arquivo.addEventListener('change', function () {
    var f = form.arquivo.files && form.arquivo.files[0];
    if (!f) return;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(f.type)) { PF.toast('Envie o laudo em PDF ou foto (JPG, PNG ou WebP).', { tipo: 'aviso' }); form.arquivo.value = ''; return; }
    if (f.size > 10 * 1024 * 1024) { PF.toast('O arquivo passou de 10 MB.', { tipo: 'aviso' }); form.arquivo.value = ''; return; }
    arquivoNovo = f;
    removerArquivo = false;
    mostrarArquivo(f.name);
  });
  $('[data-exame-arquivo-tirar]').addEventListener('click', function () {
    arquivoNovo = null;
    removerArquivo = true;
    form.arquivo.value = '';
    mostrarArquivo(null);
  });

  function abrirDialogo(ex) {
    editando = ex || null;
    arquivoNovo = null;
    removerArquivo = false;
    form.reset();
    linhas.textContent = '';
    $('[data-exame-erro]').textContent = '';
    $('[data-exame-dialogo-titulo]').textContent = ex ? 'Editar exame' : 'Novo exame';
    form.data.max = F.hojeISO();
    form.data.value = ex ? ex.data : F.hojeISO();
    form.laboratorio.value = ex ? (ex.laboratorio || '') : '';
    form.observacoes.value = ex ? (ex.observacoes || '') : '';
    mostrarArquivo(ex && ex.arquivo ? 'Laudo já anexado' : null);
    if (ex) ex.resultados.forEach(function (r) { adicionarLinha(E.marcador(r.marcador) ? r.marcador : null, r); });
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    form.data.focus();
  }

  function slug(t) {
    return 'outro_' + String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 33);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var erro = $('[data-exame-erro]');
    erro.textContent = '';
    if (!form.data.value || form.data.value > F.hojeISO()) { erro.textContent = 'Informe a data da coleta (hoje ou antes).'; form.data.focus(); return; }
    var resultados = [];
    var problema = null;
    linhas.querySelectorAll('.exame-linha').forEach(function (li) {
      if (problema) return;
      var v = function (n) { return li.querySelector('[data-campo="' + n + '"]'); };
      var nome = v('nome').value.trim();
      var valorTxt = v('valor').value.trim();
      if (!valorTxt && !li.dataset.marcador && !nome) return; // linha livre em branco
      if (!valorTxt) { problema = [v('valor'), 'Preencha o resultado de ' + (nome || 'cada marcador') + ' (ou remova a linha).']; return; }
      var valor = F.decimal(valorTxt);
      if (valor == null || valor < 0) { problema = [v('valor'), 'Resultado inválido em ' + (nome || 'um marcador') + '.']; return; }
      if (!nome) { problema = [v('nome'), 'Digite o nome do marcador.']; return; }
      var min = v('min').value.trim() ? F.decimal(v('min').value) : null;
      var max = v('max').value.trim() ? F.decimal(v('max').value) : null;
      if ((v('min').value.trim() && min == null) || (v('max').value.trim() && max == null)) { problema = [v('min'), 'Referência inválida em ' + nome + '.']; return; }
      if (min != null && max != null && min > max) { problema = [v('min'), 'Em ' + nome + ', o mínimo da referência está maior que o máximo.']; return; }
      var marcador = li.dataset.marcador || slug(nome);
      if (!/^[a-z0-9_]{2,40}$/.test(marcador)) marcador = 'outro_marcador';
      resultados.push({ marcador: marcador, nome: nome, valor: valor, unidade: v('unidade').value.trim(), refMin: min, refMax: max });
    });
    if (problema) { erro.textContent = problema[1]; problema[0].focus(); return; }
    if (!resultados.length) { erro.textContent = 'Adicione pelo menos um resultado.'; return; }

    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, arquivoNovo ? 'Enviando o laudo…' : 'Salvando…');
    try {
      var id = await S.saveExame({
        id: editando && editando.id, data: form.data.value, laboratorio: form.laboratorio.value.trim(), observacoes: form.observacoes.value.trim(),
        resultados: resultados, arquivo: arquivoNovo, removerArquivo: removerArquivo, arquivoAtual: editando && editando.arquivo
      });
      dlg.close();
      abertos[id] = true;
      PF.toast(editando ? 'Exame atualizado.' : 'Exame salvo. ' + resultados.length + (resultados.length === 1 ? ' resultado registrado.' : ' resultados registrados.'));
      await carregar();
    } catch (err) {
      erro.textContent = err.message;
    } finally {
      PF.setLoading(botao, false);
    }
  });

  dlg.querySelectorAll('[data-exame-fechar]').forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
  $('[data-exame-novo]').addEventListener('click', function () { abrirDialogo(null); });

  /* ---------- Carregar ---------- */
  async function carregar() {
    try {
      var r = await Promise.all([S.getExames(), carregado ? Promise.resolve(ficha) : S.getFicha().catch(function () { return {}; })]);
      exames = r[0];
      ficha = r[1] || {};
      carregado = true;
      render();
    } catch (err) {
      PF.toast(err.message, { tipo: 'erro' });
    }
  }

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao === 'medicamentos') carregar();
  });
})();
