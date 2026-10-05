/* ==========================================================================
   PontoFit — profissional.js
   Painel do profissional (profissional.html): pacientes que autorizaram o
   compartilhamento (resumo, alertas e detalhes), link de convite e perfil.
   Os dados vêm de /api/prof, que só devolve pacientes com vínculo ativo e só
   o que cada um escolheu compartilhar. Aqui não há decisão de permissão.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;
  var raiz = document.querySelector('[data-prof]');
  if (!raiz || !S) return;
  var $ = function (sel) { return document.querySelector(sel); };

  var perfil = null;
  var pacientes = [];
  var filtro = { tipo: 'todos', busca: '' };

  var OBJETIVOS = { emagrecer: 'Emagrecer', 'ganhar-massa': 'Ganhar massa', manter: 'Manter o peso', disposicao: 'Mais disposição' };
  var ATIVIDADE = { sedentario: 'Sedentário', leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso' };
  var CONDICOES = { diabetes: 'Diabetes', hipertensao: 'Hipertensão', tireoide: 'Tireoide' };

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function kg(n) { return n == null ? '—' : F.numero(n) + ' kg'; }
  function sinal(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + F.numero(Math.abs(n)); }
  function data(iso) { return iso ? F.dataCurta(iso) : '—'; }
  function dias(n) { return n + (Math.abs(n) === 1 ? ' dia' : ' dias'); }
  function normalizar(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function iniciais(nome) {
    var p = String(nome || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '').toUpperCase() + ((p.length > 1 ? p[p.length - 1][0] : '') || '').toUpperCase();
  }
  function primeiroNome(nome) { return String(nome || '').trim().split(/\s+/)[0] || ''; }

  function textoDose(d) {
    if (d.semData) return 'sem data da última aplicação';
    if (d.dias < 0) return 'atrasada há ' + dias(Math.abs(d.dias));
    if (d.dias === 0) return 'hoje';
    if (d.dias === 1) return 'amanhã';
    return 'em ' + dias(d.dias);
  }
  function classeDose(d) {
    if (d.semData) return '';
    if (d.dias < 0) return 'badge--vermelho';
    if (d.dias <= 1) return 'badge--laranja';
    return '';
  }

  /* ---------- Abas ---------- */
  var ABAS = ['pacientes', 'convite', 'perfil'];
  function abaDoHash() {
    var h = location.hash.replace('#', '');
    return ABAS.indexOf(h) >= 0 ? h : 'pacientes';
  }
  function mostrarAba(foco) {
    if (!perfil) return;
    var id = abaDoHash();
    document.querySelectorAll('[data-prof-secao]').forEach(function (s) { s.hidden = s.dataset.profSecao !== id; });
    document.querySelectorAll('[data-aba]').forEach(function (a) {
      if (a.dataset.aba === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (foco) { var h = document.querySelector('[data-prof-secao="' + id + '"] h1'); if (h) h.focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', function () { mostrarAba(true); window.scrollTo(0, 0); });

  /* ---------- Perfil e convite ---------- */
  function linkConvite() { return location.origin + '/convite.html?c=' + encodeURIComponent(perfil.codigo); }

  function renderPerfil() {
    $('[data-prof-saudacao]').textContent = 'Olá, ' + primeiroNome(perfil.nome) + '. Aqui aparecem os pacientes que autorizaram o compartilhamento.';
    var link = linkConvite();
    $('[data-prof-link]').value = link;
    $('[data-prof-codigo]').textContent = perfil.codigo;
    var msg = 'Olá! Sou ' + perfil.nome + (perfil.profissaoNome ? ' (' + perfil.profissaoNome.toLowerCase() + ')' : '') +
      '. Quero acompanhar sua evolução pelo PontoFit. Toque no link para autorizar: ' + link;
    $('[data-prof-whatsapp]').href = 'https://wa.me/?text=' + encodeURIComponent(msg);

    var f = $('[data-prof-form="perfil"]');
    f.nome.value = perfil.nome || '';
    f.profissao.value = perfil.profissao || 'outro';
    f.registro.value = perfil.registro || '';
    f.empresa.value = perfil.empresa || '';
  }

  function ativarPainel(p) {
    perfil = p;
    $('[data-prof-ativar]').hidden = true;
    $('[data-prof-abas]').hidden = false;
    renderPerfil();
    mostrarAba(false);
    carregarPacientes();
  }

  $('[data-prof-copiar]').addEventListener('click', function () {
    var campo = $('[data-prof-link]');
    var pronto = function () { PF.toast('Link copiado. Agora é só colar na conversa com o paciente.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(campo.value).then(pronto, function () { campo.select(); document.execCommand('copy'); pronto(); });
    } else {
      campo.select(); document.execCommand('copy'); pronto();
    }
  });

  $('[data-prof-trocar]').addEventListener('click', async function (e) {
    var botao = e.currentTarget;
    if (!confirm('Gerar um link novo? O link atual deixa de funcionar.')) return;
    PF.setLoading(botao, true, 'Gerando…');
    try {
      var r = await S.trocarCodigoProfissional();
      perfil = r.profissional;
      renderPerfil();
      botao.closest('details').open = false;
      PF.toast('Link novo pronto. Envie este para os próximos pacientes.');
    } catch (err) {
      PF.toast(err.message, { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  function lerPerfil(form) {
    return { nome: form.nome.value, profissao: form.profissao.value, registro: form.registro.value, empresa: form.empresa.value };
  }

  $('[data-prof-form="ativar"]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var form = e.target;
    var erro = $('[data-prof-erro="ativar"]');
    erro.textContent = '';
    var campos = lerPerfil(form);
    if (campos.nome.trim().length < 2) { erro.textContent = 'Informe seu nome.'; form.nome.focus(); return; }
    if (!campos.profissao) { erro.textContent = 'Escolha a profissão.'; form.profissao.focus(); return; }
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Ativando…');
    try {
      var r = await S.ativarProfissional(campos);
      ativarPainel(r.profissional);
      location.hash = '#convite';
      PF.toast('Painel ativado! Envie seu link para os pacientes.');
    } catch (err) {
      erro.textContent = err.message;
    } finally {
      PF.setLoading(botao, false);
    }
  });

  $('[data-prof-form="perfil"]').addEventListener('submit', async function (e) {
    e.preventDefault();
    var form = e.target;
    var erro = $('[data-prof-erro="perfil"]');
    erro.textContent = '';
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Salvando…');
    try {
      var r = await S.atualizarProfissional(lerPerfil(form));
      perfil = r.profissional;
      renderPerfil();
      PF.toast('Perfil salvo.');
    } catch (err) {
      erro.textContent = err.message;
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Pacientes ---------- */
  async function carregarPacientes() {
    raiz.setAttribute('aria-busy', 'true');
    try {
      var r = await S.getPacientesProf();
      pacientes = r.pacientes || [];
      renderPacientes();
    } catch (err) {
      PF.toast(err.message, { tipo: 'erro' });
    } finally {
      raiz.setAttribute('aria-busy', 'false');
    }
  }

  function definir(chave, texto) {
    var e = document.querySelector('[data-k="' + chave + '"]');
    if (e) e.textContent = texto;
  }

  function renderPacientes() {
    var comAlerta = pacientes.filter(function (p) { return p.alertas.length; }).length;
    var semPlano = pacientes.filter(function (p) { return !p.planoAtivo; }).length;
    definir('total', String(pacientes.length));
    definir('alertas', String(comAlerta));
    definir('ativos', String(pacientes.length - semPlano));

    var vazio = !pacientes.length;
    $('[data-prof-vazio]').hidden = !vazio;
    $('[data-prof-filtros-caixa]').hidden = vazio;

    var caixa = $('[data-prof-filtros]');
    caixa.textContent = '';
    [['todos', 'Todos', pacientes.length], ['atencao', 'Precisam de atenção', comAlerta], ['sem-plano', 'Sem plano ativo', semPlano]].forEach(function (f) {
      var b = el('button', 'filtro', f[1] + ' (' + f[2] + ')');
      b.type = 'button';
      b.dataset.filtro = f[0];
      b.setAttribute('aria-pressed', String(filtro.tipo === f[0]));
      caixa.appendChild(b);
    });
    renderLista();
  }

  function renderLista() {
    var ul = $('[data-prof-lista]');
    ul.textContent = '';
    var termo = normalizar(filtro.busca);
    var lista = pacientes.filter(function (p) {
      if (filtro.tipo === 'atencao' && !p.alertas.length) return false;
      if (filtro.tipo === 'sem-plano' && p.planoAtivo) return false;
      return !termo || normalizar(p.nome).indexOf(termo) >= 0;
    });
    if (pacientes.length && !lista.length) {
      ul.appendChild(el('li', 'card admin-vazio texto-sec', 'Nenhum paciente encontrado com esse filtro.'));
      return;
    }
    lista.forEach(function (p) { ul.appendChild(cartaoPaciente(p)); });
  }

  function cartaoPaciente(p) {
    var li = el('li', 'card prof-paciente' + (p.alertas.length ? ' prof-paciente--alerta' : ''));
    var botao = el('button', 'prof-paciente__botao');
    botao.type = 'button';
    botao.dataset.paciente = p.id;
    botao.setAttribute('aria-label', 'Ver detalhes de ' + p.nome);

    var topo = el('div', 'prof-paciente__topo');
    topo.appendChild(el('span', 'prof-avatar', iniciais(p.nome))).setAttribute('aria-hidden', 'true');
    var quem = el('div', 'prof-paciente__quem');
    quem.appendChild(el('strong', 'prof-paciente__nome', p.nome));
    var info = [];
    if (p.idade != null) info.push(p.idade + ' anos');
    if (p.objetivo) info.push(OBJETIVOS[p.objetivo] || p.objetivo);
    if (p.gestacao) info.push('Gestante · ' + p.gestacao.semana + 'ª semana');
    quem.appendChild(el('span', 'texto-sm texto-sec', info.join(' · ') || 'Desde ' + data(String(p.desde).slice(0, 10))));
    topo.appendChild(quem);
    topo.appendChild(el('span', 'badge ' + (p.planoAtivo ? '' : 'badge--vermelho'), p.planoAtivo ? 'Plano ativo' : 'Sem plano'));
    botao.appendChild(topo);

    var dl = el('dl', 'prof-paciente__dados');
    function item(rotulo, valor, extra) {
      var d = el('div');
      d.appendChild(el('dt', null, rotulo));
      var dd = el('dd', null, valor);
      if (extra) dd.appendChild(extra);
      d.appendChild(dd);
      dl.appendChild(d);
    }
    if (p.compartilha.peso) {
      if (p.peso) {
        var dif = el('span', 'prof-dif ' + (p.peso.diferenca < 0 ? 'prof-dif--desce' : p.peso.diferenca > 0 ? 'prof-dif--sobe' : ''), ' ' + sinal(p.peso.diferenca) + ' kg');
        item('Peso atual', kg(p.peso.atual.pesoKg), dif);
        if (p.peso.progresso != null) item('Meta', p.peso.progresso + '% de ' + kg(p.peso.meta));
      } else {
        item('Peso', 'sem registro');
      }
    }
    if (p.compartilha.medicamentos && p.doses && p.doses.length) {
      var d0 = p.doses[0];
      item('Próxima dose', d0.nome + ' ' + textoDose(d0));
    }
    if (p.compartilha.agua && p.agua) item('Água hoje', p.agua.hoje + '/' + p.agua.meta + ' copos');
    if (dl.children.length) botao.appendChild(dl);

    if (p.alertas.length) {
      var al = el('ul', 'prof-alertas');
      al.setAttribute('role', 'list');
      p.alertas.forEach(function (a) { al.appendChild(el('li', 'prof-alerta prof-alerta--' + a.tipo, a.texto)); });
      botao.appendChild(al);
    }
    li.appendChild(botao);
    return li;
  }

  $('[data-prof-filtros]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filtro]');
    if (!b) return;
    filtro.tipo = b.dataset.filtro;
    document.querySelectorAll('[data-prof-filtros] [data-filtro]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderLista();
  });
  var espera = null;
  $('#prof-busca').addEventListener('input', function (e) {
    clearTimeout(espera);
    espera = setTimeout(function () { filtro.busca = e.target.value; renderLista(); }, 150);
  });
  $('[data-prof-atualizar]').addEventListener('click', async function (e) {
    var botao = e.currentTarget;
    PF.setLoading(botao, true, 'Atualizando…');
    await carregarPacientes();
    PF.setLoading(botao, false);
  });

  /* ---------- Detalhes do paciente ---------- */
  var det = $('[data-prof-detalhe]');
  var corpo = $('[data-det-corpo]');

  function bloco(titulo) {
    var b = el('section', 'ger-bloco');
    b.appendChild(el('h3', null, titulo));
    corpo.appendChild(b);
    return b;
  }
  function dados(pares) {
    var dl = el('dl', 'ger-dados');
    pares.forEach(function (p) {
      if (p[1] == null || p[1] === '') return;
      var d = el('div');
      d.appendChild(el('dt', null, p[0]));
      d.appendChild(el('dd', null, p[1]));
      dl.appendChild(d);
    });
    return dl;
  }
  function naoCompartilhado(titulo) {
    var b = bloco(titulo);
    b.classList.add('prof-oculto');
    b.appendChild(el('p', 'texto-sm texto-sec', 'O paciente não compartilhou essa informação.'));
  }

  /** Linha do peso (SVG simples, sem biblioteca). */
  function graficoPeso(pesos, meta) {
    if (pesos.length < 2) return null;
    var NS = 'http://www.w3.org/2000/svg';
    var L = 320, A = 120, M = 8;
    var valores = pesos.map(function (p) { return p.pesoKg; }).concat(meta != null ? [meta] : []);
    var min = Math.min.apply(null, valores) - 0.5;
    var max = Math.max.apply(null, valores) + 0.5;
    var x = function (i) { return M + i * (L - 2 * M) / (pesos.length - 1); };
    var y = function (v) { return M + (max - v) * (A - 2 * M) / (max - min); };
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + L + ' ' + A);
    svg.setAttribute('class', 'prof-grafico');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Peso de ' + kg(pesos[0].pesoKg) + ' em ' + data(pesos[0].data) + ' para ' + kg(pesos[pesos.length - 1].pesoKg) + ' em ' + data(pesos[pesos.length - 1].data));
    if (meta != null) {
      var lm = document.createElementNS(NS, 'line');
      lm.setAttribute('x1', M); lm.setAttribute('x2', L - M); lm.setAttribute('y1', y(meta)); lm.setAttribute('y2', y(meta));
      lm.setAttribute('class', 'prof-grafico__meta');
      svg.appendChild(lm);
    }
    var linha = document.createElementNS(NS, 'polyline');
    linha.setAttribute('points', pesos.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.pesoKg).toFixed(1); }).join(' '));
    linha.setAttribute('class', 'prof-grafico__linha');
    svg.appendChild(linha);
    pesos.forEach(function (p, i) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', x(i)); c.setAttribute('cy', y(p.pesoKg)); c.setAttribute('r', 3);
      c.setAttribute('class', 'prof-grafico__ponto');
      svg.appendChild(c);
    });
    return svg;
  }

  function renderDetalhe(p) {
    corpo.textContent = '';
    $('[data-det-nome]').textContent = p.nome;
    var info = [];
    if (p.idade != null) info.push(p.idade + ' anos');
    info.push('Compartilha desde ' + data(String(p.desde).slice(0, 10)));
    info.push(p.planoAtivo ? 'Plano ativo até ' + data(p.planoAte) : 'Sem plano ativo');
    $('[data-det-info]').textContent = info.join(' · ');

    if (p.alertas.length) {
      var al = el('ul', 'prof-alertas');
      al.setAttribute('role', 'list');
      p.alertas.forEach(function (a) { al.appendChild(el('li', 'prof-alerta prof-alerta--' + a.tipo, a.texto)); });
      corpo.appendChild(al);
    }

    // Peso
    if (p.compartilha.peso) {
      var bp = bloco('Peso e meta');
      if (p.peso) {
        bp.appendChild(dados([
          ['Inicial', kg(p.peso.inicial.pesoKg) + ' (' + data(p.peso.inicial.data) + ')'],
          ['Atual', kg(p.peso.atual.pesoKg) + ' (' + data(p.peso.atual.data) + ')'],
          ['Diferença', sinal(p.peso.diferenca) + ' kg'],
          ['Meta', p.peso.meta != null ? kg(p.peso.meta) + (p.metaData ? ' até ' + data(p.metaData) : '') : 'não definida'],
          ['Falta', p.peso.falta != null ? kg(Math.abs(p.peso.falta)) : null],
          ['IMC', p.peso.imc != null ? F.numero(p.peso.imc) : null]
        ]));
        if (p.peso.progresso != null) {
          var barra = el('div', 'admin-barra__trilho');
          barra.setAttribute('role', 'progressbar');
          barra.setAttribute('aria-valuenow', String(p.peso.progresso));
          barra.setAttribute('aria-valuemin', '0');
          barra.setAttribute('aria-valuemax', '100');
          barra.setAttribute('aria-label', 'Caminho até a meta');
          var v = el('span', 'admin-barra__valor admin-barra__valor--verde');
          barra.appendChild(v);
          bp.appendChild(el('p', 'texto-sm', p.peso.progresso + '% do caminho até a meta'));
          bp.appendChild(barra);
          requestAnimationFrame(function () { v.style.width = p.peso.progresso + '%'; });
        }
        var g = graficoPeso(p.pesos || [], p.peso.meta);
        if (g) bp.appendChild(g);
        var ult = (p.pesos || []).slice(-6).reverse();
        if (ult.length) {
          var ul = el('ul', 'ger-historico');
          ul.setAttribute('role', 'list');
          ult.forEach(function (r) {
            var li = el('li', 'ger-historico__item');
            li.appendChild(el('strong', null, kg(r.pesoKg) + (r.cinturaCm ? ' · cintura ' + F.numero(r.cinturaCm) + ' cm' : '')));
            li.appendChild(el('span', 'ger-historico__quando', data(r.data)));
            ul.appendChild(li);
          });
          bp.appendChild(ul);
        }
      } else {
        bp.appendChild(el('p', 'texto-sm texto-sec', 'Nenhum peso registrado ainda.'));
      }
    } else naoCompartilhado('Peso e meta');

    // Medicamentos
    if (p.compartilha.medicamentos) {
      var bm = bloco('Medicamentos');
      if (p.doses && p.doses.length) {
        var lm = el('ul', 'prof-doses');
        lm.setAttribute('role', 'list');
        p.doses.forEach(function (d) {
          var li = el('li', 'prof-dose');
          var q = el('div');
          q.appendChild(el('strong', null, d.nome));
          var partes = [];
          if (d.doseMl != null) partes.push(F.numero(d.doseMl, 2) + ' mL');
          if (d.doseMg != null) partes.push(F.numero(d.doseMg) + ' mg');
          if (d.intervaloDias) partes.push('a cada ' + dias(d.intervaloDias));
          if (d.ultima) partes.push('última em ' + data(d.ultima));
          q.appendChild(el('span', 'texto-sm texto-sec', partes.join(' · ')));
          li.appendChild(q);
          li.appendChild(el('span', 'badge ' + classeDose(d), d.semData ? 'Sem data' : 'Próxima ' + textoDose(d)));
          lm.appendChild(li);
        });
        bm.appendChild(lm);
        if (p.aplicacoes && p.aplicacoes.length) {
          var dt = el('details', 'g-detalhes');
          dt.appendChild(el('summary', null, 'Últimas aplicações (' + p.aplicacoes.length + ')'));
          var ua = el('ul', 'ger-historico');
          ua.setAttribute('role', 'list');
          p.aplicacoes.forEach(function (a) {
            var li = el('li', 'ger-historico__item ger-historico__item--pagamento');
            li.appendChild(el('strong', null, a.medicamento + (a.doseMl != null ? ' · ' + F.numero(a.doseMl, 2) + ' mL' : '')));
            li.appendChild(el('span', 'ger-historico__quando', data(a.data)));
            ua.appendChild(li);
          });
          dt.appendChild(ua);
          bm.appendChild(dt);
        }
      } else {
        bm.appendChild(el('p', 'texto-sm texto-sec', 'Nenhum medicamento cadastrado.'));
      }
    } else naoCompartilhado('Medicamentos');

    // Água
    if (p.compartilha.agua) {
      var ba = bloco('Água');
      if (p.agua) {
        ba.appendChild(dados([['Hoje', p.agua.hoje + ' de ' + p.agua.meta + ' copos'], ['Últimos 7 dias', p.agua.diasNaMeta7 + ' de 7 na meta']]));
        var semana = [];
        for (var i = 6; i >= 0; i--) {
          var iso = F.somarDias(F.hojeISO(), -i);
          var reg = (p.aguaDias || []).find(function (a) { return a.data === iso; });
          semana.push({ iso: iso, copos: reg ? reg.copos : 0, meta: reg ? reg.meta : p.agua.meta });
        }
        var ul2 = el('ul', 'prof-agua');
        ul2.setAttribute('role', 'list');
        semana.forEach(function (d) {
          var li = el('li', 'prof-agua__dia' + (d.copos >= d.meta ? ' prof-agua__dia--meta' : ''));
          var col = el('span', 'prof-agua__coluna');
          var enc = el('span', 'prof-agua__nivel');
          enc.style.height = Math.min(100, Math.round(d.copos / Math.max(1, d.meta) * 100)) + '%';
          col.appendChild(enc);
          li.appendChild(col);
          var nome = F.dataDe(d.iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          li.appendChild(el('span', 'prof-agua__rotulo', nome));
          li.setAttribute('aria-label', F.dataExtenso(d.iso) + ': ' + d.copos + ' de ' + d.meta + ' copos');
          ul2.appendChild(li);
        });
        ba.appendChild(ul2);
      }
    } else naoCompartilhado('Água');

    // Ficha
    if (p.compartilha.ficha) {
      var bf = bloco('Ficha');
      var f = p.ficha;
      if (f) {
        var cond = (f.condicoes || []).map(function (c) { return CONDICOES[c] || c; });
        if (f.condicoesOutras) cond.push(f.condicoesOutras);
        bf.appendChild(dados([
          ['Sexo', p.sexo === 'F' ? 'Feminino' : p.sexo === 'M' ? 'Masculino' : null],
          ['Altura', f.alturaCm != null ? F.numero(f.alturaCm) + ' cm' : null],
          ['Objetivo', p.objetivo ? (OBJETIVOS[p.objetivo] || p.objetivo) : null],
          ['Atividade física', f.nivelAtividade ? (ATIVIDADE[f.nivelAtividade] || f.nivelAtividade) : null],
          ['Condições de saúde', cond.join(', ') || 'nenhuma informada'],
          ['Alergias', f.alergias],
          ['Medicamentos em uso', f.medicamentosEmUso],
          ['Cidade', [f.cidade, f.estado].filter(Boolean).join(' / ')],
          ['Telefone', f.telefone],
          ['Observações', f.observacoes]
        ]));
      } else {
        bf.appendChild(el('p', 'texto-sm texto-sec', 'O paciente ainda não preencheu a ficha.'));
      }
    } else naoCompartilhado('Ficha');

    // Gestação (só aparece se compartilhada)
    if (p.compartilha.gestacao) {
      var bg = bloco('Gestação');
      if (p.gestacao) {
        bg.appendChild(dados([
          ['Semana', p.gestacao.semana + ' semanas e ' + dias(p.gestacao.diasExtra)],
          ['Data provável do parto', data(p.gestacao.dpp)],
          ['Peso antes da gestação', p.gestacao.pesoPreKg != null ? kg(p.gestacao.pesoPreKg) : null]
        ]));
      } else {
        bg.appendChild(el('p', 'texto-sm texto-sec', 'Sem gestação registrada.'));
      }
    }

    corpo.appendChild(el('p', 'texto-sm texto-sec prof-aviso', 'Dados informados pelo próprio paciente no app. Use como apoio ao acompanhamento.'));
  }

  async function abrirPaciente(id) {
    var resumo = pacientes.find(function (p) { return p.id === id; });
    $('[data-det-nome]').textContent = resumo ? resumo.nome : 'Carregando…';
    $('[data-det-info]').textContent = '';
    corpo.textContent = '';
    corpo.appendChild(el('p', 'texto-sec', 'Carregando…'));
    corpo.setAttribute('aria-busy', 'true');
    if (typeof det.showModal === 'function') det.showModal(); else det.setAttribute('open', '');
    try {
      var r = await S.getPacienteProf(id);
      renderDetalhe(r.paciente);
    } catch (err) {
      corpo.textContent = '';
      corpo.appendChild(el('p', 'texto-sec', err.message));
      carregarPacientes(); // o vínculo pode ter sido removido
    } finally {
      corpo.setAttribute('aria-busy', 'false');
    }
  }

  $('[data-prof-lista]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-paciente]');
    if (b) abrirPaciente(b.dataset.paciente);
  });
  $('[data-det-fechar]').addEventListener('click', function () { det.close(); });
  det.addEventListener('click', function (e) { if (e.target === det) det.close(); });

  /* ---------- Início ---------- */
  PF.auth.pronto.then(async function (u) {
    if (!u) return;
    try {
      var r = await S.getProfissional();
      $('[data-prof-carregando]').hidden = true;
      if (r.profissional) {
        ativarPainel(r.profissional);
      } else {
        var nome = u.nome && u.nome !== u.email ? u.nome : '';
        if (nome) $('#at-nome').value = nome;
        $('[data-prof-ativar]').hidden = false;
        raiz.setAttribute('aria-busy', 'false');
      }
    } catch (err) {
      $('[data-prof-carregando]').textContent = err.message;
      raiz.setAttribute('aria-busy', 'false');
    }
  });
})();
