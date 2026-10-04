/* ==========================================================================
   PontoFit — painel.js
   Seção "Início": painel do paciente ao entrar no app.
   - saudação, meta (anel de progresso, quanto falta, estimativa), peso,
     variação, IMC e próxima dose;
   - semana da gestação, para quem ativou o acompanhamento (gestacao.js);
   - água do dia (copo com meta pelo peso e sequência de dias), check-in
     semanal de peso e conquistas;
   - receita do dia e dica do dia (mudam a cada dia, iguais o dia inteiro);
   - situação do plano;
   - "Relatório do paciente": prévia na tela e versão para imprimir/PDF.
   Reaproveita os cálculos de evolucao.js (PF.evolucao) e medicamentos.js
   (PF.medicamentos) para os números baterem com as outras seções.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;

  var raiz = document.querySelector('[data-painel]');
  if (!raiz || !S) return;
  var secao = document.getElementById('secao-inicio');
  var $ = function (sel, ctx) { return (ctx || secao).querySelector(sel); };

  var dados = null; // { usuario, ficha, pesos, meds, acessoAte, resumo, dose }

  /* ---------- Conteúdo do dia ---------- */
  var DICAS = [
    'Comece o dia com um copo de água antes do café. Depois de horas de sono, o corpo agradece.',
    'Monte o prato pela metade com legumes e verduras. O resto se organiza sozinho.',
    'Caminhar 10 minutos depois do almoço ajuda na digestão e no controle do açúcar no sangue.',
    'Deixe uma garrafa de água à vista na mesa. O que está perto é lembrado.',
    'Durma e acorde em horários parecidos, inclusive no fim de semana. O sono rende mais.',
    'Prefira a fruta inteira ao suco: as fibras dão mais saciedade.',
    'Mastigue devagar. O cérebro leva cerca de 20 minutos para perceber que você está satisfeito.',
    'Pese-se sempre no mesmo horário, de preferência de manhã, em jejum e depois de ir ao banheiro.',
    'Um punhado de castanhas é um ótimo lanche: gordura boa, proteína e saciedade.',
    'Inclua uma fonte de proteína em cada refeição: ovo, frango, peixe, feijão, iogurte.',
    'Tempere com ervas, alho, limão e especiarias e use menos sal sem perder o sabor.',
    'Desligue as telas 30 minutos antes de dormir. A luz azul atrapalha o sono.',
    'Subir escadas em vez de pegar o elevador conta como atividade física, sim.',
    'Cozinhe uma quantidade maior no fim de semana e congele porções para os dias corridos.',
    'Feijão com arroz é uma combinação completa de proteína. Valorize o básico.',
    'Faça a lista de compras antes de ir ao mercado e evite ir com fome.',
    'Sentiu fome fora de hora? Beba um copo de água e espere 10 minutos. Às vezes é sede.',
    'Pequenas pausas para alongar a cada hora sentado aliviam costas e pescoço.',
    'Varie as cores no prato: cada cor traz vitaminas e minerais diferentes.',
    'Iogurte natural com fruta e aveia é um café da manhã rápido e equilibrado.',
    'Registre seu peso uma vez por semana. Oscilações diárias são normais e enganam.',
    'Leve um lanche saudável na bolsa para não depender do que estiver à venda.',
    'Bebidas açucaradas somam muitas calorias sem matar a fome. Prefira água com limão.',
    'Comemore cada quilo e cada semana de hábito. Constância vale mais que perfeição.',
    'Tomar sol pela manhã por alguns minutos ajuda a regular o sono (e a vitamina D).',
    'Coma sentado e com atenção à comida, longe do celular e da TV.',
    'Prefira assados, cozidos e grelhados às frituras no dia a dia.',
    'Um dia fora do plano não estraga nada. Retome na próxima refeição, sem culpa.',
    'Respire fundo por um minuto quando a ansiedade bater. Ajuda a não comer por impulso.',
    'Converse com seu médico ou nutricionista antes de mudanças grandes na alimentação.'
  ];

  /** Número do dia (muda à meia-noite de Brasília) para escolher o conteúdo. */
  function numeroDoDia() {
    var hoje = F.dataDe(F.hojeISO());
    return Math.floor(hoje.getTime() / 86400000);
  }

  function receitaDoDia() {
    var lista = PF.receitas || [];
    if (!lista.length) return null;
    return lista[(numeroDoDia() * 7) % lista.length]; // salto de 7 para não seguir a ordem do livro
  }

  /* ---------- Formatação ---------- */
  function kg(n) { return F.numero(Math.abs(n)) + ' kg'; }

  function saudacao(nome) {
    var h = new Date().getHours();
    var parte = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    var primeiro = String(nome || '').trim().split(/\s+/)[0];
    return primeiro ? parte + ', ' + primeiro + '!' : parte + '!';
  }

  function definir(chave, texto) {
    var el = secao.querySelector('[data-p="' + chave + '"]');
    if (el) el.textContent = texto;
  }

  /* ---------- Próxima dose (mesmo cálculo de medicamentos.js) ---------- */
  function proximaDose(meds, aplicacoesPorMed) {
    var melhor = null;
    meds.forEach(function (m) {
      var ultima = m.dataUltimaAplicacao;
      var apls = aplicacoesPorMed[m.id] || [];
      apls.forEach(function (a) { if (!ultima || a.data > ultima) ultima = a.data; });
      if (!m.intervaloDias || !ultima) return;
      var proxima = F.somarDias(ultima, m.intervaloDias);
      var dias = F.diasEntre(F.hojeISO(), proxima);
      if (!melhor || dias < melhor.dias) melhor = { med: m, proxima: proxima, ultima: ultima, dias: dias };
    });
    return melhor;
  }

  /* ---------- Renderização ---------- */
  function renderTopo() {
    $('[data-painel-data]').textContent = F.dataExtenso(F.hojeISO(), true);
    $('[data-painel-saudacao]').textContent = saudacao(dados.usuario && dados.usuario.nome);
  }

  function renderCompletar() {
    var f = dados.ficha || {};
    var faltando = [];
    if (!f.pesoInicialKg && !dados.pesos.length) faltando.push('peso');
    if (!f.alturaCm) faltando.push('altura');
    if (!f.metaPesoKg) faltando.push('meta de peso');
    if (!f.dataNascimento) faltando.push('data de nascimento');
    var aviso = $('[data-painel-completar]');
    aviso.hidden = !faltando.length;
    if (faltando.length) {
      $('[data-painel-faltando]').textContent = 'Falta informar: ' + faltando.join(', ') + '. Leva menos de um minuto.';
    }
  }

  function renderMeta() {
    var r = dados.resumo;
    var card = $('[data-painel-meta]');
    var anel = $('[data-meta-anel]');
    var circ = 2 * Math.PI * 52;
    anel.style.strokeDasharray = circ.toFixed(1);

    if (r.vazio || r.meta == null) {
      card.dataset.estado = 'vazio';
      anel.style.strokeDashoffset = circ.toFixed(1);
      $('[data-meta-pct]').textContent = '–';
      $('[data-meta-falta]').textContent = r.vazio ? 'Registre seu peso para começar' : 'Defina uma meta de peso';
      $('[data-meta-detalhe]').textContent = 'Na seção Minha evolução você registra o peso, define a meta e acompanha o caminho até ela.';
      $('[data-painel-frase]').textContent = 'Comece registrando seu peso e sua meta: o painel faz as contas por você.';
      return;
    }

    var pct = Math.round(r.progresso);
    // Começa vazio e enche (transição no CSS).
    anel.style.strokeDashoffset = circ.toFixed(1);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { anel.style.strokeDashoffset = (circ * (1 - pct / 100)).toFixed(1); });
    });
    $('[data-meta-pct]').textContent = pct + '%';

    if (r.atingida) {
      card.dataset.estado = 'atingida';
      $('[data-meta-falta]').textContent = 'Meta de ' + kg(r.meta) + ' atingida!';
      $('[data-meta-detalhe]').textContent = 'Parabéns pela constância. Que tal definir o próximo objetivo?';
      $('[data-painel-frase]').textContent = 'Você chegou na sua meta. Isso é resultado de cada pequena escolha.';
      return;
    }

    card.dataset.estado = 'andamento';
    $('[data-meta-falta]').textContent = 'Faltam ' + kg(r.falta) + ' para ' + kg(r.meta);
    var partes = [];
    if (r.ritmo != null && Math.abs(r.ritmo) >= 0.05) {
      partes.push('Ritmo: ' + (r.ritmo < 0 ? 'perdendo ' : 'ganhando ') + kg(r.ritmo) + ' por semana.');
    }
    if (r.estimativa) partes.push('Nesse ritmo, você chega lá por volta de ' + F.dataExtenso(r.estimativa, true) + '.');
    else if (r.metaData) partes.push('Data desejada: ' + F.dataExtenso(r.metaData, true) + '.');
    $('[data-meta-detalhe]').textContent = partes.join(' ') || 'Registre seu peso toda semana para acompanhar o ritmo.';
    $('[data-painel-frase]').textContent = pct >= 50
      ? 'Você já passou da metade do caminho. Continue assim!'
      : 'Cada registro mostra o seu progresso. Um passo de cada vez.';
  }

  function renderNumeros() {
    var r = dados.resumo;
    if (r.vazio) {
      definir('peso', '–'); definir('peso-info', 'sem registro');
      definir('variacao', '–'); definir('variacao-info', '');
    } else {
      definir('peso', kg(r.atual.pesoKg));
      definir('peso-info', 'em ' + F.dataCurta(r.atual.data));
      var card = secao.querySelector('[data-p-card="variacao"]');
      card.classList.remove('painel-numero--bom', 'painel-numero--atencao');
      if (r.serie.length < 2 || Math.abs(r.diferenca) < 0.05) {
        definir('variacao', '0 kg');
        definir('variacao-info', r.serie.length < 2 ? 'registre um novo peso' : 'sem variação');
      } else {
        definir('variacao', (r.diferenca < 0 ? '−' : '+') + kg(r.diferenca));
        definir('variacao-info', r.diferenca < 0 ? 'a menos que no início' : 'a mais que no início');
        if (r.direcao) card.classList.add(Math.sign(r.diferenca) === r.direcao ? 'painel-numero--bom' : 'painel-numero--atencao');
      }
    }

    if (r.imcAtual) {
      definir('imc', F.numero(r.imcAtual, 1));
      definir('imc-info', F.faixaImc(r.imcAtual).rotulo);
    } else {
      definir('imc', '–');
      definir('imc-info', 'informe sua altura');
    }

    var d = dados.dose;
    var cardDose = secao.querySelector('[data-p-card="dose"]');
    cardDose.classList.remove('painel-numero--atencao');
    if (!d) {
      definir('dose', '–');
      definir('dose-info', dados.meds.length ? 'registre a última aplicação' : 'nenhum medicamento');
    } else {
      definir('dose', d.dias > 1 ? 'em ' + d.dias + ' dias' : d.dias === 1 ? 'amanhã' : d.dias === 0 ? 'hoje' : 'atrasada');
      definir('dose-info', d.med.nome + ' · ' + F.dataCurta(d.proxima));
      if (d.dias <= 1) cardDose.classList.add('painel-numero--atencao');
    }
  }

  function renderReceita() {
    var r = receitaDoDia();
    var botao = $('[data-receita-abrir]');
    if (!r) { botao.hidden = true; return; }
    var cat = (PF.receitasCategorias || []).find(function (c) { return c.id === r.categoria; });
    $('[data-receita-titulo]').textContent = r.titulo;
    $('[data-receita-meta]').textContent = (cat ? cat.nome + ' · ' : '') + r.tempo + ' · ' + r.porcoes;
    $('[data-receita-dica]').textContent = r.dica || '';
    botao.dataset.receita = r.id;
  }

  function renderDica() {
    $('[data-dica-texto]').textContent = DICAS[numeroDoDia() % DICAS.length];
  }

  function renderAcesso() {
    var ate = dados.acessoAte;
    var hoje = F.hojeISO();
    var el = $('[data-acesso-texto]');
    if (!ate || ate < hoje) { el.textContent = 'Sem plano ativo.'; return; }
    var dias = F.diasEntre(hoje, ate) + 1;
    el.textContent = 'Acesso liberado até ' + F.dataCurta(ate) + (dias <= 3 ? ' (' + (dias === 1 ? 'último dia' : 'faltam ' + dias + ' dias') + ').' : '.');
  }

  function renderGestacao() {
    var card = $('[data-painel-gestacao]');
    var g = PF.acompanhamentoGestacao && PF.acompanhamentoGestacao.resumo(dados.ficha);
    card.hidden = !g;
    if (!g) return;
    $('[data-pg-trimestre]').textContent = 'Gestação · ' + g.trimestre + 'º trimestre';
    $('[data-pg-semana]').textContent = g.semana + ' semanas' + (g.diasExtra ? ' e ' + g.diasExtra + (g.diasExtra === 1 ? ' dia' : ' dias') : '');
    $('[data-pg-bebe]').textContent = g.semana >= 4 ? 'Seu bebê está do tamanho de ' + g.bebe.fruta + '.' : 'O bebê está começando a se formar.';
  }

  /* ---------- Água do dia ---------- */
  var agua = { copos: 0, meta: 8, timer: null };

  /** Meta em copos de 250 ml: 35 ml por kg, entre 6 e 14 copos (8 sem peso). */
  function metaAgua() {
    var r = dados.resumo;
    if (r.vazio) return 8;
    return Math.max(6, Math.min(14, Math.round(r.atual.pesoKg * 35 / 250)));
  }

  /** Dias seguidos batendo a meta (termina hoje ou ontem). */
  function sequenciaAgua() {
    var porDia = {};
    dados.agua.forEach(function (a) { porDia[a.data] = a; });
    porDia[F.hojeISO()] = { copos: agua.copos, meta: agua.meta };
    var dia = F.hojeISO();
    var ok = function (d) { return porDia[d] && porDia[d].copos >= porDia[d].meta; };
    if (!ok(dia)) dia = F.somarDias(dia, -1);
    var n = 0;
    while (ok(dia)) { n++; dia = F.somarDias(dia, -1); }
    return n;
  }

  function renderAgua(animar) {
    var pct = Math.min(1, agua.copos / agua.meta);
    var nivel = $('[data-agua-nivel]');
    if (!animar) nivel.style.transition = 'none';
    nivel.style.transform = 'translateY(' + ((1 - pct) * 100).toFixed(1) + 'px)';
    if (!animar) { void nivel.getBoundingClientRect(); nivel.style.transition = ''; }
    $('[data-agua-qtd]').textContent = agua.copos + ' de ' + agua.meta + (agua.meta === 1 ? ' copo' : ' copos');
    $('[data-agua-info]').textContent = agua.copos >= agua.meta
      ? 'Meta do dia batida! ' + F.numero(agua.copos * 0.25, 2) + ' litros.'
      : 'Faltam ' + (agua.meta - agua.copos) + (agua.meta - agua.copos === 1 ? ' copo' : ' copos') + ' de 250 ml (' + F.numero(agua.meta * 0.25, 2) + ' L no dia).';
    $('[data-agua-menos]').disabled = agua.copos === 0;
    var seq = sequenciaAgua();
    $('[data-agua-sequencia]').textContent = seq >= 2 ? seq + ' dias seguidos batendo a meta' : seq === 1 ? 'Primeiro dia da sequência. Volte amanhã!' : '';
    secao.querySelector('.painel-agua').classList.toggle('painel-agua--batida', agua.copos >= agua.meta);
  }

  function mudarAgua(delta) {
    var antes = agua.copos;
    agua.copos = Math.max(0, Math.min(40, agua.copos + delta));
    if (agua.copos === antes) return;
    renderAgua(true);
    if (antes < agua.meta && agua.copos >= agua.meta) {
      PF.toast('Você bateu a meta de água de hoje.', { titulo: 'Hidratação em dia', duracao: 4000 });
    }
    clearTimeout(agua.timer);
    agua.timer = setTimeout(function () {
      S.saveAgua(F.hojeISO(), agua.copos, agua.meta).then(function () {
        var hoje = dados.agua.find(function (a) { return a.data === F.hojeISO(); });
        if (hoje) { hoje.copos = agua.copos; hoje.meta = agua.meta; }
        else dados.agua.unshift({ data: F.hojeISO(), copos: agua.copos, meta: agua.meta });
        renderConquistas();
      }, function (err) {
        PF.toast(err.message || 'Não foi possível salvar a água de hoje.', { tipo: 'erro' });
      });
    }, 500);
  }

  $('[data-agua-mais]').addEventListener('click', function () { mudarAgua(1); });
  $('[data-agua-menos]').addEventListener('click', function () { mudarAgua(-1); });

  function prepararAgua() {
    var hoje = dados.agua.find(function (a) { return a.data === F.hojeISO(); });
    agua.meta = metaAgua();
    agua.copos = hoje ? hoje.copos : 0;
    renderAgua(false);
    // Enche até o nível de hoje com animação depois de aparecer.
    if (agua.copos) {
      var c = agua.copos;
      agua.copos = 0;
      renderAgua(false);
      agua.copos = c;
      requestAnimationFrame(function () { requestAnimationFrame(function () { renderAgua(true); }); });
    }
  }

  /* ---------- Check-in semanal de peso ---------- */
  function renderCheckin() {
    var r = dados.resumo;
    var card = $('[data-painel-checkin]');
    var dias = r.vazio ? null : F.diasEntre(r.atual.data, F.hojeISO());
    card.hidden = !(r.vazio || dias >= 7);
    if (card.hidden) return;
    $('[data-checkin-titulo]').textContent = r.vazio ? 'Registre seu primeiro peso' : 'Hora do check-in semanal';
    $('[data-checkin-texto]').textContent = r.vazio
      ? 'É o ponto de partida para o painel calcular sua evolução e sua meta.'
      : 'Seu último registro foi há ' + dias + ' dias (' + kg(r.atual.pesoKg) + '). Pese-se de manhã, em jejum, para comparar.';
  }

  $('[data-checkin-form]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var form = e.target;
    var erro = $('[data-checkin-erro]');
    var peso = F.decimal(form.peso.value);
    erro.textContent = '';
    if (peso == null || peso < 20 || peso > 400) { erro.textContent = 'Digite um peso entre 20 e 400 kg, como 72,5.'; form.peso.focus(); return; }
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Registrando…');
    try {
      await S.addPeso({ data: F.hojeISO(), pesoKg: peso });
      form.reset();
      await carregar();
      renderTudo();
      PF.toast('Peso de ' + kg(peso) + ' registrado.', { titulo: 'Check-in feito' });
    } catch (err) {
      erro.textContent = err.message || 'Não foi possível registrar agora.';
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Conquistas ---------- */
  function conquistas() {
    var f = dados.ficha || {};
    var r = dados.resumo;
    var naDirecao = 0;
    if (!r.vazio && r.serie.length > 1 && r.direcao) naDirecao = r.diferenca * r.direcao; // kg na direção da meta
    var registrosPeso = dados.pesos.length;
    var diasAguaOk = dados.agua.filter(function (a) { return a.copos >= a.meta; }).length;
    var lista = [
      { id: 'primeiro', titulo: 'Primeiro passo', texto: 'Registrou o primeiro peso.', ok: !r.vazio },
      { id: 'ficha', titulo: 'Ficha completa', texto: 'Altura, peso, meta e nascimento preenchidos.', ok: !!(f.alturaCm && (f.pesoInicialKg || registrosPeso) && f.metaPesoKg && f.dataNascimento) },
      { id: 'meta-definida', titulo: 'Meta definida', texto: 'Escolheu aonde quer chegar.', ok: !!f.metaPesoKg },
      { id: 'agua-1', titulo: 'Hidratada', texto: 'Bateu a meta de água em um dia.', ok: diasAguaOk >= 1 || agua.copos >= agua.meta },
      { id: 'agua-7', titulo: 'Semana hidratada', texto: '7 dias seguidos na meta de água.', ok: sequenciaAgua() >= 7 },
      { id: 'constancia', titulo: 'Constância', texto: '5 pesagens registradas.', ok: registrosPeso >= 5 },
      { id: 'kg-1', titulo: 'Primeiro quilo', texto: '1 kg na direção da sua meta.', ok: naDirecao >= 1 },
      { id: 'kg-5', titulo: 'Cinco quilos', texto: '5 kg na direção da sua meta.', ok: naDirecao >= 5 },
      { id: 'metade', titulo: 'Metade do caminho', texto: '50% da meta concluída.', ok: r.meta != null && r.progresso >= 50 },
      { id: 'meta', titulo: 'Meta atingida', texto: 'Chegou ao peso que definiu.', ok: !!r.atingida },
      { id: 'chef', titulo: 'Chef PontoFit', texto: '5 receitas favoritas salvas.', ok: (dados.favoritas || []).length >= 5 }
    ];
    if (f.gestante) lista.push({ id: 'gestacao', titulo: 'Gestação acompanhada', texto: 'Ativou o acompanhamento da gestação.', ok: true });
    return lista;
  }

  var ICONE_MEDALHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2M13 12l5.88-9.8M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/></svg>';

  function renderConquistas() {
    var lista = conquistas();
    var ul = $('[data-conquistas]');
    ul.textContent = '';
    var feitas = 0;
    lista.forEach(function (c) {
      if (c.ok) feitas++;
      var li = el('li', 'conquista' + (c.ok ? ' conquista--feita' : ''));
      li.innerHTML = '<span class="conquista__icone">' + ICONE_MEDALHA + '</span>';
      var txt = el('span', 'conquista__texto');
      txt.appendChild(el('strong', null, c.titulo));
      txt.appendChild(el('span', null, c.texto));
      li.appendChild(txt);
      li.appendChild(el('span', 'sr-only', c.ok ? ' (conquistada)' : ' (ainda não)'));
      ul.appendChild(li);
    });
    $('[data-conquistas-total]').textContent = feitas + ' de ' + lista.length + ' conquistadas';
  }

  function renderTudo() {
    renderTopo();
    prepararAgua();
    renderCheckin();
    renderConquistas();
    renderGestacao();
    renderCompletar();
    renderMeta();
    renderNumeros();
    renderReceita();
    renderDica();
    renderAcesso();
    raiz.setAttribute('aria-busy', 'false');
  }

  async function carregar() {
    var res = await Promise.all([
      PF.auth.pronto,
      S.getFicha(),
      S.getPesos(),
      S.getMedicamentos(),
      S.getAcessoAte(),
      S.getAgua(F.somarDias(F.hojeISO(), -60)).catch(function () { return []; }),
      S.getFavoritas ? S.getFavoritas().catch(function () { return []; }) : Promise.resolve([])
    ]);
    var meds = res[3];
    var apls = await Promise.all(meds.map(function (m) { return S.getAplicacoes(m.id).catch(function () { return []; }); }));
    var porMed = {};
    meds.forEach(function (m, i) { porMed[m.id] = apls[i]; });
    dados = {
      usuario: (PF.app && PF.app.usuario) || res[0],
      ficha: res[1] || {},
      pesos: res[2],
      meds: meds,
      aplicacoes: porMed,
      acessoAte: res[4],
      agua: res[5],
      favoritas: res[6]
    };
    dados.resumo = PF.evolucao ? PF.evolucao.calcular(dados.ficha, dados.pesos) : { vazio: true, serie: [] };
    dados.dose = proximaDose(meds, porMed);
  }

  /* ---------- Receita do dia → abre no livro ---------- */
  $('[data-receita-abrir]').addEventListener('click', function () {
    var id = this.dataset.receita;
    location.hash = '#receitas';
    // Espera a seção de receitas aparecer para abrir o leitor.
    document.addEventListener('pf:secao', function abrir(e) {
      if (e.detail.secao !== 'receitas') return;
      document.removeEventListener('pf:secao', abrir);
      setTimeout(function () { if (PF.livroReceitas) PF.livroReceitas.abrirPorId(id); }, 50);
    });
  });

  /* ======================================================================
     Relatório do paciente
     ====================================================================== */
  var dialogo = document.querySelector('[data-relatorio]');
  var conteudo = document.querySelector('[data-relatorio-conteudo]');
  var impressao = document.querySelector('[data-relatorio-impressao]');

  var ROTULOS = {
    sexo: { F: 'Feminino', M: 'Masculino' },
    objetivo: { emagrecer: 'Emagrecer', 'ganhar-massa': 'Ganhar massa', manter: 'Manter peso', disposicao: 'Mais disposição' },
    nivelAtividade: { sedentario: 'Sedentário', leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso' },
    condicoes: { diabetes: 'Diabetes', hipertensao: 'Hipertensão', tireoide: 'Tireoide', outras: 'Outras' }
  };

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function linhaDado(dl, rotulo, valor) {
    if (valor == null || valor === '') return;
    dl.appendChild(el('dt', null, rotulo));
    dl.appendChild(el('dd', null, valor));
  }

  function tabela(cabecalhos, linhas) {
    var t = el('table', 'relatorio__tabela');
    var thead = el('thead');
    var tr = el('tr');
    cabecalhos.forEach(function (c) { var th = el('th', null, c); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr);
    t.appendChild(thead);
    var tbody = el('tbody');
    linhas.forEach(function (l) {
      var r = el('tr');
      l.forEach(function (c) { r.appendChild(el('td', null, c)); });
      tbody.appendChild(r);
    });
    t.appendChild(tbody);
    return t;
  }

  function secaoRelatorio(titulo) {
    var s = el('section', 'relatorio__secao');
    s.appendChild(el('h3', null, titulo));
    return s;
  }

  function montarRelatorio() {
    var f = dados.ficha || {};
    var r = dados.resumo;
    var folha = document.createDocumentFragment();

    var topo = el('div', 'relatorio__cabecalho');
    topo.appendChild(el('p', 'relatorio__marca', 'PontoFit'));
    topo.appendChild(el('h2', null, f.nome || (dados.usuario && dados.usuario.nome) || 'Paciente'));
    topo.appendChild(el('p', 'relatorio__emitido', 'Emitido em ' + F.dataExtenso(F.hojeISO(), true)));
    folha.appendChild(topo);

    // Dados pessoais e corporais
    var s1 = secaoRelatorio('Dados do paciente');
    var dl = el('dl', 'relatorio__dados');
    linhaDado(dl, 'Idade', f.dataNascimento ? F.idade(f.dataNascimento) + ' anos' : null);
    linhaDado(dl, 'Sexo', ROTULOS.sexo[f.sexo]);
    linhaDado(dl, 'Altura', f.alturaCm ? F.numero(f.alturaCm) + ' cm' : null);
    linhaDado(dl, 'Objetivo', ROTULOS.objetivo[f.objetivo]);
    linhaDado(dl, 'Atividade física', ROTULOS.nivelAtividade[f.nivelAtividade]);
    linhaDado(dl, 'Cidade', [f.cidade, f.estado].filter(Boolean).join(' / '));
    s1.appendChild(dl);
    folha.appendChild(s1);

    // Peso e meta
    var s2 = secaoRelatorio('Peso e meta');
    var dl2 = el('dl', 'relatorio__dados');
    if (!r.vazio) {
      linhaDado(dl2, 'Peso inicial', kg(r.inicial.pesoKg) + ' (' + F.dataCurta(r.inicial.data) + ')');
      linhaDado(dl2, 'Peso atual', kg(r.atual.pesoKg) + ' (' + F.dataCurta(r.atual.data) + ')');
      if (r.serie.length > 1) linhaDado(dl2, 'Variação', (r.diferenca < 0 ? '−' : '+') + kg(r.diferenca));
      if (r.imcInicial) linhaDado(dl2, 'IMC inicial', F.numero(r.imcInicial, 1) + ' · ' + F.faixaImc(r.imcInicial).rotulo);
      if (r.imcAtual) linhaDado(dl2, 'IMC atual', F.numero(r.imcAtual, 1) + ' · ' + F.faixaImc(r.imcAtual).rotulo);
      if (r.meta != null) {
        linhaDado(dl2, 'Meta', kg(r.meta) + (r.metaData ? ' até ' + F.dataCurta(r.metaData) : ''));
        linhaDado(dl2, 'Progresso', r.atingida ? 'Meta atingida' : Math.round(r.progresso) + '% · faltam ' + kg(r.falta));
      }
      if (r.ritmo != null) linhaDado(dl2, 'Ritmo médio', (r.ritmo < 0 ? 'perdendo ' : 'ganhando ') + kg(r.ritmo) + ' por semana');
    } else {
      dl2.appendChild(el('dd', null, 'Nenhum peso registrado.'));
    }
    s2.appendChild(dl2);
    var registros = r.vazio ? [] : r.serie.slice(-12).reverse();
    if (registros.length > 1) {
      s2.appendChild(el('p', 'relatorio__subtitulo', 'Últimos registros'));
      s2.appendChild(tabela(['Data', 'Peso', 'Cintura'], registros.map(function (p) {
        return [F.dataCurta(p.data), kg(p.pesoKg), p.cinturaCm ? F.numero(p.cinturaCm) + ' cm' : '–'];
      })));
    }
    folha.appendChild(s2);

    // Gestação
    var g = PF.acompanhamentoGestacao && PF.acompanhamentoGestacao.resumo(f);
    if (g) {
      var sg = secaoRelatorio('Gestação');
      var dlg = el('dl', 'relatorio__dados');
      linhaDado(dlg, 'Idade gestacional', g.semana + ' semanas' + (g.diasExtra ? ' e ' + g.diasExtra + ' dias' : '') + ' (' + g.trimestre + 'º trimestre)');
      linhaDado(dlg, 'Última menstruação', f.gestacaoDum ? F.dataCurta(f.gestacaoDum) : null);
      linhaDado(dlg, 'Data provável do parto', F.dataCurta(g.dpp));
      linhaDado(dlg, 'Peso antes da gravidez', f.pesoPreGestacionalKg ? kg(f.pesoPreGestacionalKg) : null);
      if (f.pesoPreGestacionalKg && !r.vazio) {
        var ganho = r.atual.pesoKg - f.pesoPreGestacionalKg;
        linhaDado(dlg, 'Ganho de peso', (ganho < 0 ? '−' : '+') + kg(ganho) + ' (' + F.dataCurta(r.atual.data) + ')');
      }
      sg.appendChild(dlg);
      folha.appendChild(sg);
    }

    // Medicamentos
    var s3 = secaoRelatorio('Medicamentos acompanhados');
    if (dados.meds.length) {
      s3.appendChild(tabela(['Medicamento', 'Dose', 'Intervalo', 'Última aplicação', 'Próxima'], dados.meds.map(function (m) {
        var d = proximaDose([m], dados.aplicacoes);
        var dose = [m.doseMl ? F.numero(m.doseMl, 2) + ' mL' : null, m.doseMg ? F.numero(m.doseMg, 2) + ' mg' : null].filter(Boolean).join(' · ');
        return [m.nome, dose || '–', m.intervaloDias ? 'a cada ' + m.intervaloDias + ' dias' : '–',
          d ? F.dataCurta(d.ultima) : '–', d ? F.dataCurta(d.proxima) : '–'];
      })));
    } else {
      s3.appendChild(el('p', null, 'Nenhum medicamento cadastrado no PontoFit.'));
    }
    if (f.medicamentos) s3.appendChild(el('p', null, 'Outros medicamentos em uso (informados pelo paciente): ' + f.medicamentos));
    folha.appendChild(s3);

    // Saúde
    var s4 = secaoRelatorio('Saúde');
    var dl4 = el('dl', 'relatorio__dados');
    var cond = (f.condicoesSaude || []).map(function (c) { return ROTULOS.condicoes[c] || c; });
    if (f.condicoesOutras) cond.push(f.condicoesOutras);
    linhaDado(dl4, 'Condições de saúde', cond.join(', ') || 'Nenhuma informada');
    linhaDado(dl4, 'Alergias', f.alergias || 'Nenhuma informada');
    linhaDado(dl4, 'Profissional responsável', [f.profissionalNome, f.profissionalContato].filter(Boolean).join(' · '));
    linhaDado(dl4, 'Observações', f.observacoes);
    s4.appendChild(dl4);
    folha.appendChild(s4);

    folha.appendChild(el('p', 'relatorio__aviso',
      'Relatório gerado a partir das informações registradas pelo próprio paciente no PontoFit. ' +
      'Tem caráter informativo e não substitui avaliação médica ou nutricional.'));
    return folha;
  }

  async function abrirRelatorio() {
    var botao = $('[data-relatorio-abrir]');
    PF.setLoading(botao, true, 'Montando o relatório…');
    try {
      if (!dados) await carregar();
      conteudo.textContent = '';
      conteudo.appendChild(montarRelatorio());
      if (typeof dialogo.showModal === 'function') dialogo.showModal();
    } catch (err) {
      PF.toast(err.message || 'Não foi possível montar o relatório.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  }

  function imprimir() {
    // A impressão usa uma cópia fora do diálogo (o CSS de impressão mostra só ela).
    impressao.textContent = '';
    impressao.appendChild(conteudo.cloneNode(true));
    document.documentElement.classList.add('imprimindo-relatorio');
    window.print();
  }

  window.addEventListener('afterprint', function () {
    document.documentElement.classList.remove('imprimindo-relatorio');
    impressao.textContent = '';
  });

  $('[data-relatorio-abrir]').addEventListener('click', abrirRelatorio);
  document.querySelector('[data-relatorio-imprimir]').addEventListener('click', imprimir);
  document.querySelector('[data-relatorio-fechar]').addEventListener('click', function () { dialogo.close(); });

  /* ---------- Início ---------- */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'inicio') return;
    try {
      await carregar();
      renderTudo();
    } catch (err) {
      raiz.setAttribute('aria-busy', 'false');
      PF.toast(err.message || 'Não foi possível carregar o painel.', { tipo: 'erro' });
    }
  });
})();
