/* ==========================================================================
   PontoFit — gestacao.js
   Seção "Gestação" (aparece no menu para quem marcou sexo feminino na ficha
   ou já ativou o acompanhamento):
   - ativação com a data da última menstruação (DUM) ou a data provável do
     parto (DPP) e o peso antes da gravidez (salvos na ficha);
   - semana e trimestre, tamanho do bebê, o que acontece na semana;
   - ganho de peso recomendado (IOM 2009) comparado com o peso registrado;
   - alerta de medicamentos que pedem cuidado na gestação, cruzando com os
     medicamentos cadastrados no app e os informados na ficha;
   - exames e marcos, dicas para a mãe e para o bebê, alimentos a evitar e
     sinais de alerta.
   Conteúdo em js/gestacao-dados.js. Educativo: não substitui o pré-natal.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;
  var G = PF.gestacao;

  var raiz = document.querySelector('[data-gestacao]');
  if (!raiz || !S || !G) return;
  var $ = function (sel, ctx) { return (ctx || raiz).querySelector(sel); };
  var linkMenu = document.querySelector('[data-link-secao="gestacao"]');
  var formAtivar = document.getElementById('form-gestacao');

  var estado = { ficha: null, pesos: [], meds: [] };

  /* ---------- Cálculos ---------- */
  /** → null ou { dum, dpp, dias, semana, diasExtra, trimestre } */
  function calcularIdade(ficha) {
    var dum = ficha.gestacaoDum || (ficha.gestacaoDpp ? F.somarDias(ficha.gestacaoDpp, -280) : null);
    if (!dum) return null;
    var dias = F.diasEntre(dum, F.hojeISO());
    return {
      dum: dum,
      dpp: ficha.gestacaoDpp || F.somarDias(dum, 280),
      dias: dias,
      semana: Math.floor(dias / 7),
      diasExtra: dias % 7,
      trimestre: dias < 14 * 7 ? 1 : dias < 28 * 7 ? 2 : 3
    };
  }

  function dadosDaSemana(semana) {
    var s = Math.max(4, Math.min(40, semana));
    return G.semanas.find(function (x) { return x.semana === s; });
  }

  /** Faixa de ganho de peso (kg) recomendada até a semana atual. */
  function faixaGanho(imcPre, semana) {
    var ref = G.ganhoPeso.find(function (g) { return imcPre < g.ate; });
    var w = Math.max(0, Math.min(40, semana));
    var min, max;
    if (w <= 13) { min = 0.5 * w / 13; max = 2 * w / 13 < 1 ? 1 : 2 * w / 13; }
    else { min = 0.5 + (w - 13) * ref.semanal[0]; max = 2 + (w - 13) * ref.semanal[1]; }
    return { ref: ref, min: Math.min(min, ref.total[0]), max: Math.min(max, ref.total[1]) };
  }

  function normalizar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /** Medicamentos da lista de atenção que aparecem no que a gestante usa. */
  function alertasMedicamentos() {
    var fontes = estado.meds.map(function (m) { return m.nome; });
    if (estado.ficha.medicamentos) fontes.push(estado.ficha.medicamentos);
    var texto = ' ' + normalizar(fontes.join(' ; ')).replace(/[^a-z0-9]+/g, ' ') + ' ';
    return G.medicamentos.filter(function (m) {
      return m.termos.some(function (t) { return texto.indexOf(' ' + t + ' ') >= 0; });
    });
  }

  /* ---------- Menu: só para quem pode usar ---------- */
  function atualizarMenu(ficha) {
    if (!linkMenu) return;
    var visivel = !!ficha && (ficha.sexo === 'F' || ficha.gestante);
    linkMenu.closest('li').hidden = !visivel;
  }

  /* ---------- Renderização ---------- */
  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function renderAtivar() {
    $('[data-gestacao-ativar]').hidden = false;
    $('[data-gestacao-painel]').hidden = true;
    var f = estado.ficha;
    formAtivar.querySelector('[name="referencia"][value="' + (f.gestacaoDpp && !f.gestacaoDum ? 'dpp' : 'dum') + '"]').checked = true;
    formAtivar.data.value = f.gestacaoDum || f.gestacaoDpp || '';
    formAtivar.pesoPre.value = f.pesoPreGestacionalKg ? F.paraInput(f.pesoPreGestacionalKg) : (f.pesoInicialKg ? F.paraInput(f.pesoInicialKg) : '');
    atualizarRotuloData();
  }

  function renderPainel() {
    var f = estado.ficha;
    var idade = calcularIdade(f);
    $('[data-gestacao-ativar]').hidden = true;
    $('[data-gestacao-painel]').hidden = false;

    // Semana, trimestre e bebê
    var fimOuForaDaFaixa = idade.semana > 42 || idade.dias < 0;
    $('[data-g-semana]').textContent = fimOuForaDaFaixa
      ? 'Confira as datas da gestação'
      : idade.semana + (idade.semana === 1 ? ' semana' : ' semanas') + (idade.diasExtra ? ' e ' + idade.diasExtra + (idade.diasExtra === 1 ? ' dia' : ' dias') : '');
    $('[data-g-trimestre]').textContent = fimOuForaDaFaixa ? '' : idade.trimestre + 'º trimestre';
    var faltam = F.diasEntre(F.hojeISO(), idade.dpp);
    $('[data-g-dpp]').textContent = 'Data provável do parto: ' + F.dataExtenso(idade.dpp, true) +
      (faltam > 0 ? ' · faltam ' + Math.floor(faltam / 7) + ' semanas' + (faltam % 7 ? ' e ' + (faltam % 7) + ' dias' : '') : '');
    var pct = Math.max(0, Math.min(100, idade.dias / 280 * 100));
    $('[data-g-barra]').style.width = pct.toFixed(1) + '%';
    $('[data-g-barra-rotulo]').textContent = Math.round(pct) + '% da gestação';

    var sem = dadosDaSemana(idade.semana);
    $('[data-g-fruta]').textContent = idade.semana < 4
      ? 'O bebê ainda está começando a se formar.'
      : 'Seu bebê está do tamanho de ' + sem.fruta + '.';
    $('[data-g-medidas]').textContent = idade.semana < 4 ? '' : 'Cerca de ' + sem.tamanho + (sem.peso ? ' e ' + sem.peso : '') + ' (média aproximada; cada bebê tem seu ritmo).';
    $('[data-g-bebe]').textContent = idade.semana < 4 ? 'Nas próximas semanas, o coração e o sistema nervoso começam a se formar.' : sem.bebe;

    renderPeso(idade);
    renderMedicamentos();
    renderMarcos(idade);
    renderListas(idade);
  }

  function renderPeso(idade) {
    var f = estado.ficha;
    var caixa = $('[data-g-peso]');
    caixa.textContent = '';
    if (!f.pesoPreGestacionalKg || !f.alturaCm) {
      caixa.appendChild(el('p', 'texto-sec', !f.alturaCm
        ? 'Informe sua altura na ficha para calcular o ganho de peso recomendado.'
        : 'Informe seu peso antes da gravidez para calcular o ganho de peso recomendado.'));
      return;
    }
    var imcPre = F.imc(f.pesoPreGestacionalKg, f.alturaCm);
    var faixa = faixaGanho(imcPre, idade.semana);
    var dl = el('dl', 'g-dados');
    function linha(r, v) { dl.appendChild(el('dt', null, r)); dl.appendChild(el('dd', null, v)); }
    linha('Antes da gravidez', F.numero(f.pesoPreGestacionalKg) + ' kg · IMC ' + F.numero(imcPre, 1) + ' (' + faixa.ref.faixa.toLowerCase() + ')');
    linha('Ganho total recomendado', F.numero(faixa.ref.total[0]) + ' a ' + F.numero(faixa.ref.total[1]) + ' kg até o parto');
    linha('Esperado até agora', F.numero(faixa.min, 1) + ' a ' + F.numero(faixa.max, 1) + ' kg');

    var registros = estado.pesos.filter(function (p) { return p.data >= idade.dum; });
    var ultimo = registros[registros.length - 1];
    var status = $('[data-g-peso-status]');
    status.hidden = true;
    if (ultimo) {
      var ganho = ultimo.pesoKg - f.pesoPreGestacionalKg;
      linha('Seu ganho até ' + F.dataCurta(ultimo.data), (ganho < 0 ? '−' : '+') + F.numero(Math.abs(ganho), 1) + ' kg');
      status.hidden = false;
      if (ganho < faixa.min - 0.5) {
        status.className = 'g-status g-status--atencao';
        status.textContent = 'Seu ganho está abaixo da faixa esperada para esta semana. Converse com seu obstetra ou nutricionista.';
      } else if (ganho > faixa.max + 0.5) {
        status.className = 'g-status g-status--atencao';
        status.textContent = 'Seu ganho está acima da faixa esperada para esta semana. Vale conversar com seu obstetra ou nutricionista.';
      } else {
        status.className = 'g-status g-status--bom';
        status.textContent = 'Seu ganho de peso está dentro da faixa esperada. Continue assim!';
      }
    } else {
      caixa.appendChild(el('p', 'texto-sec texto-sm', 'Registre seu peso em Minha evolução para comparar com a faixa recomendada.'));
    }
    caixa.insertBefore(dl, caixa.firstChild);
  }

  function renderMedicamentos() {
    var caixa = $('[data-g-meds]');
    caixa.textContent = '';
    var alertas = alertasMedicamentos();
    var card = $('[data-g-meds-card]');
    card.classList.toggle('g-meds--alerta', alertas.length > 0);
    if (!alertas.length) {
      caixa.appendChild(el('p', null, estado.meds.length || estado.ficha.medicamentos
        ? 'Nenhum dos medicamentos que você cadastrou aparece na nossa lista de atenção. Mesmo assim, mostre todos ao seu obstetra.'
        : 'Você não tem medicamentos cadastrados. Se usar algum, cadastre em Medicamentos ou na ficha para receber alertas.'));
      return;
    }
    var ul = el('ul', 'g-alertas');
    ul.setAttribute('role', 'list');
    alertas.forEach(function (m) {
      var li = el('li', 'g-alerta g-alerta--' + m.nivel);
      li.appendChild(el('strong', null, m.nome));
      li.appendChild(el('span', 'badge ' + (m.nivel === 'contraindicado' ? 'badge--vermelho' : 'badge--laranja'), m.nivel === 'contraindicado' ? 'Contraindicado' : 'Requer cuidado'));
      li.appendChild(el('p', null, m.texto));
      ul.appendChild(li);
    });
    caixa.appendChild(ul);
    caixa.appendChild(el('p', 'g-aviso-forte', 'Não pare nem comece nenhum medicamento por conta própria. Fale com seu médico o quanto antes.'));
  }

  function renderMarcos(idade) {
    var ul = $('[data-g-marcos]');
    ul.textContent = '';
    G.marcos.forEach(function (m) {
      var li = el('li', 'g-marco');
      var estadoMarco = idade.semana > m.ate ? 'passou' : idade.semana >= m.de ? 'agora' : 'depois';
      li.dataset.estado = estadoMarco;
      li.appendChild(el('span', 'g-marco__semanas', m.de + 'ª a ' + m.ate + 'ª semana'));
      li.appendChild(el('span', 'g-marco__texto', m.texto));
      if (estadoMarco === 'agora') li.appendChild(el('span', 'badge badge--laranja', 'Agora'));
      ul.appendChild(li);
    });
  }

  function renderListas(idade) {
    var dicas = $('[data-g-dicas-mae]');
    dicas.textContent = '';
    G.dicasTrimestre[idade.trimestre].forEach(function (d) { dicas.appendChild(el('li', null, d)); });
    $('[data-g-dicas-mae-titulo]').textContent = 'Dicas para o ' + idade.trimestre + 'º trimestre';

    var bebe = $('[data-g-dicas-bebe]');
    if (!bebe.children.length) {
      G.dicasBebe.forEach(function (d) {
        var li = el('li', 'card g-dica');
        li.appendChild(el('strong', null, d.titulo));
        li.appendChild(el('p', 'texto-sm', d.texto));
        bebe.appendChild(li);
      });
      var evitar = $('[data-g-evitar]');
      G.alimentosEvitar.forEach(function (a) {
        var li = el('li');
        li.appendChild(el('strong', null, a.titulo + ': '));
        li.appendChild(document.createTextNode(a.texto));
        evitar.appendChild(li);
      });
      var alerta = $('[data-g-sinais]');
      G.sinaisAlerta.forEach(function (s) { alerta.appendChild(el('li', null, s)); });
      var lista = $('[data-g-lista-meds]');
      G.medicamentos.forEach(function (m) {
        var li = el('li');
        li.appendChild(el('strong', null, m.nome + ': '));
        li.appendChild(document.createTextNode(m.texto));
        lista.appendChild(li);
      });
    }
  }

  function render() {
    if (estado.ficha.gestante && calcularIdade(estado.ficha)) renderPainel();
    else renderAtivar();
  }

  async function carregar() {
    var res = await Promise.all([S.getFicha(), S.getPesos(), S.getMedicamentos()]);
    estado.ficha = res[0] || {};
    estado.pesos = res[1];
    estado.meds = res[2];
    atualizarMenu(estado.ficha);
  }

  /* ---------- Ativar / editar / encerrar ---------- */
  function atualizarRotuloData() {
    var dpp = formAtivar.querySelector('[name="referencia"]:checked').value === 'dpp';
    $('[data-g-rotulo-data]').textContent = dpp ? 'Data provável do parto' : 'Primeiro dia da última menstruação';
  }
  formAtivar.addEventListener('change', function (e) {
    if (e.target.name === 'referencia') atualizarRotuloData();
  });

  formAtivar.addEventListener('submit', async function (e) {
    e.preventDefault();
    var erro = $('[data-g-erro]');
    erro.textContent = '';
    var ref = formAtivar.querySelector('[name="referencia"]:checked').value;
    var data = formAtivar.data.value;
    var peso = F.decimal(formAtivar.pesoPre.value);
    var hoje = F.hojeISO();
    if (!data) { erro.textContent = 'Informe a data.'; formAtivar.data.focus(); return; }
    var dum = ref === 'dum' ? data : F.somarDias(data, -280);
    var dias = F.diasEntre(dum, hoje);
    if (dias < 0 || dias > 300) {
      erro.textContent = ref === 'dum'
        ? 'Confira a data: ela precisa ser nos últimos 10 meses e não pode ser no futuro.'
        : 'Confira a data provável do parto: ela precisa ser nos próximos 9 meses.';
      formAtivar.data.focus();
      return;
    }
    if (formAtivar.pesoPre.value && (peso == null || peso < 30 || peso > 300)) {
      erro.textContent = 'Confira o peso antes da gravidez (entre 30 e 300 kg).';
      formAtivar.pesoPre.focus();
      return;
    }
    var botao = formAtivar.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Salvando…');
    try {
      estado.ficha = await S.saveFicha({
        gestante: true,
        gestacaoDum: ref === 'dum' ? data : null,
        gestacaoDpp: ref === 'dpp' ? data : null,
        pesoPreGestacionalKg: peso
      });
      atualizarMenu(estado.ficha);
      render();
      document.dispatchEvent(new CustomEvent('pf:ficha-salva', { detail: { ficha: estado.ficha } }));
      PF.toast('Acompanhamento da gestação ativado. Parabéns por esse momento!', { titulo: 'Tudo pronto' });
    } catch (err) {
      erro.textContent = err.message || 'Não foi possível salvar. Tente de novo.';
    } finally {
      PF.setLoading(botao, false);
    }
  });

  $('[data-g-editar]').addEventListener('click', function () { renderAtivar(); formAtivar.data.focus(); });

  $('[data-g-encerrar]').addEventListener('click', async function () {
    if (!window.confirm('Encerrar o acompanhamento da gestação? Você pode ativar de novo quando quiser.')) return;
    try {
      estado.ficha = await S.saveFicha({ gestante: false });
      atualizarMenu(estado.ficha);
      render();
      document.dispatchEvent(new CustomEvent('pf:ficha-salva', { detail: { ficha: estado.ficha } }));
    } catch (err) {
      PF.toast(err.message || 'Não foi possível salvar.', { tipo: 'erro' });
    }
  });

  /* ---------- Para o painel (painel.js) ---------- */
  PF.acompanhamentoGestacao = {
    resumo: function (ficha) {
      if (!ficha || !ficha.gestante) return null;
      var idade = calcularIdade(ficha);
      if (!idade || idade.dias < 0 || idade.semana > 42) return null;
      return { semana: idade.semana, diasExtra: idade.diasExtra, trimestre: idade.trimestre, dpp: idade.dpp, bebe: dadosDaSemana(idade.semana) };
    }
  };

  /* ---------- Início ---------- */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'gestacao') return;
    try {
      await carregar();
      render();
    } catch (err) {
      PF.toast(err.message || 'Não foi possível carregar a gestação.', { tipo: 'erro' });
    }
  });

  document.addEventListener('pf:ficha-salva', function (e) {
    if (e.detail && e.detail.ficha) atualizarMenu(e.detail.ficha);
  });

  // Mostra ou esconde o item do menu logo ao abrir o app.
  PF.auth.pronto.then(function (u) {
    if (!u) return;
    S.getFicha().then(atualizarMenu, function () { /* sem rede: mantém escondido */ });
  });
})();
