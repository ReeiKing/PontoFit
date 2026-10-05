/* ==========================================================================
   PontoFit — orientacoes.js
   Seção Plano alimentar (#orientacoes): metas e refeições que cada
   profissional definiu para o paciente (/api/vinculos). A meta de água já
   vale no contador do Início (painel.js); a de peso o paciente aplica na
   evolução com um toque. O menu mostra "Novo" quando algo foi atualizado
   depois da última visita (lembrado só neste aparelho).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;
  var raiz = document.querySelector('[data-orientacoes]');
  if (!raiz || !S) return;
  var $ = function (sel) { return document.querySelector(sel); };
  var CHAVE = 'pf-orientacoes-vistas';

  var comPlano = [];

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function vistoEm() { try { return localStorage.getItem(CHAVE) || ''; } catch (e) { return ''; } }
  function marcarVisto() {
    var ultimo = comPlano.map(function (p) { return p.orientacoes.atualizadoEm; }).sort().pop();
    try { if (ultimo) localStorage.setItem(CHAVE, ultimo); } catch (e) { /* ignora */ }
    $('[data-badge-orientacoes]').hidden = true;
    $('[data-badge-orientacoes-leitor]').textContent = '';
  }
  function temNovidade() {
    var visto = vistoEm();
    return comPlano.some(function (p) { return p.orientacoes.atualizadoEm > visto; });
  }

  function vazia(o) {
    return !o || (o.metaPesoKg == null && o.metaAguaMl == null && !(o.refeicoes || []).length && !o.observacoes);
  }

  /** Índice da próxima refeição pelo horário de agora (as sem horário não contam). */
  function proximaRefeicao(refeicoes) {
    var agora = new Date();
    var hhmm = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
    var idx = -1;
    refeicoes.forEach(function (r, i) { if (idx < 0 && r.horario && r.horario >= hhmm) idx = i; });
    return idx;
  }

  function render() {
    raiz.textContent = '';
    if (!comPlano.length) {
      raiz.appendChild(el('p', 'card texto-sec', 'Seu profissional ainda não enviou metas ou plano alimentar.'));
      return;
    }
    comPlano.forEach(function (p) {
      var o = p.orientacoes;
      var card = el('section', 'card orientacao');
      var topo = el('header', 'orientacao__topo');
      topo.appendChild(el('h2', 'orientacao__quem', p.nome));
      topo.appendChild(el('span', 'texto-sm texto-sec', [p.profissaoNome, 'atualizado em ' + new Date(o.atualizadoEm).toLocaleDateString('pt-BR')].join(' · ')));
      card.appendChild(topo);

      if (o.metaPesoKg != null || o.metaAguaMl != null) {
        var metas = el('div', 'orientacao__metas');
        if (o.metaPesoKg != null) {
          var mp = el('div', 'orientacao__meta');
          mp.appendChild(el('span', 'painel-rotulo', 'Meta de peso'));
          mp.appendChild(el('strong', 'orientacao__valor', F.numero(o.metaPesoKg) + ' kg'));
          if (o.metaData) mp.appendChild(el('span', 'texto-sm texto-sec', 'até ' + F.dataCurta(o.metaData)));
          var usar = el('button', 'btn btn--sm btn--secundario');
          usar.type = 'button';
          usar.dataset.usarMeta = p.id;
          usar.appendChild(el('span', null, 'Usar na minha evolução'));
          mp.appendChild(usar);
          metas.appendChild(mp);
        }
        if (o.metaAguaMl != null) {
          var ma = el('div', 'orientacao__meta orientacao__meta--agua');
          ma.appendChild(el('span', 'painel-rotulo', 'Água por dia'));
          ma.appendChild(el('strong', 'orientacao__valor', (o.metaAguaMl / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' L'));
          ma.appendChild(el('span', 'texto-sm texto-sec', 'Já vale no contador de água do Início'));
          metas.appendChild(ma);
        }
        card.appendChild(metas);
      }

      var refeicoes = o.refeicoes || [];
      if (refeicoes.length) {
        card.appendChild(el('h3', 'orientacao__subtitulo', 'Refeições'));
        var prox = proximaRefeicao(refeicoes);
        var ol = el('ol', 'orientacao__refeicoes');
        refeicoes.forEach(function (r, i) {
          var li = el('li', 'orientacao__refeicao' + (i === prox ? ' orientacao__refeicao--proxima' : ''));
          var cab = el('div', 'orientacao__refeicao-topo');
          cab.appendChild(el('strong', null, r.nome));
          if (r.horario) cab.appendChild(el('span', 'orientacao__hora', r.horario));
          if (i === prox) cab.appendChild(el('span', 'badge', 'Próxima'));
          li.appendChild(cab);
          if (r.itens) li.appendChild(el('p', 'orientacao__itens', r.itens));
          ol.appendChild(li);
        });
        card.appendChild(ol);
      }

      if (o.observacoes) {
        card.appendChild(el('h3', 'orientacao__subtitulo', 'Orientações gerais'));
        card.appendChild(el('p', 'orientacao__itens', o.observacoes));
      }
      raiz.appendChild(card);
    });
  }

  raiz.addEventListener('click', async function (e) {
    var b = e.target.closest('[data-usar-meta]');
    if (!b) return;
    var p = comPlano.find(function (x) { return x.id === b.dataset.usarMeta; });
    if (!p) return;
    PF.setLoading(b, true, 'Aplicando…');
    try {
      await S.saveFicha({ metaPesoKg: p.orientacoes.metaPesoKg, metaData: p.orientacoes.metaData || null });
      PF.toast('Meta de ' + F.numero(p.orientacoes.metaPesoKg) + ' kg aplicada na sua evolução.', {
        acao: { texto: 'Ver evolução', href: '#evolucao' }
      });
    } catch (err) {
      PF.toast(err.message, { tipo: 'erro' });
    } finally {
      PF.setLoading(b, false);
    }
  });

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao !== 'orientacoes') return;
    render();
    marcarVisto();
  });

  PF.auth.pronto.then(async function (u) {
    if (!u) return;
    var r;
    try { r = await S.getVinculos(); } catch (e) { return; }
    comPlano = (r.profissionais || []).filter(function (p) { return !vazia(p.orientacoes); });
    if (!comPlano.length) return;
    $('[data-menu-orientacoes]').hidden = false;
    if (PF.app.secaoAtual === 'orientacoes') { render(); marcarVisto(); return; }
    if (temNovidade()) {
      $('[data-badge-orientacoes]').hidden = false;
      $('[data-badge-orientacoes-leitor]').textContent = '(novidade)';
      PF.toast('Seu profissional enviou metas ou um plano alimentar.', {
        titulo: 'Plano atualizado', tipo: 'info', duracao: 8000, acao: { texto: 'Ver plano', href: '#orientacoes' }
      });
    }
  });
})();
