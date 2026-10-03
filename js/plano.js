/* ==========================================================================
   PontoFit — plano.js
   Seção "Meu plano": plano atual, teste grátis, mensalidades (pagas, em
   aberto, atrasadas), registro de pagamento e troca de plano.

   O PontoFit não processa pagamentos: as cobranças são geradas a partir do
   fim do teste grátis e a pessoa registra o que já pagou.
   Dados via PF.storage.getAssinatura / saveAssinatura.
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var F = PF.fmt;

  var raiz = document.querySelector('[data-plano]');
  if (!raiz) return;
  var $ = function (sel) { return raiz.querySelector(sel); };
  var form = document.getElementById('form-plano');

  var PLANOS = {
    mensal: { nome: 'Mensal', valor: 20, periodo: 'mês', meses: 1, item: 'Mensalidade' },
    anual: { nome: 'Anual', valor: 199.99, periodo: 'ano', meses: 12, item: 'Anuidade' }
  };

  var assinatura = null;

  /* ---------- Utilitários ---------- */
  function reais(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function gerarId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /** Soma meses mantendo o dia (31/01 + 1 mês = 28/02 ou 29/02). */
  function somarMeses(iso, meses) {
    var d = F.dataDe(iso);
    var dia = d.getDate();
    var alvo = new Date(d.getFullYear(), d.getMonth() + meses, 1);
    var ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    alvo.setDate(Math.min(dia, ultimoDia));
    return F.paraISO(alvo);
  }

  /* ---------- Cobranças ----------
     A 1ª vence no fim do teste grátis; cada uma seguinte vence 1 mês (mensal)
     ou 12 meses (anual) depois da anterior, sempre contando a partir da data
     do fim do teste (evita "escorregar" o dia em meses curtos).
     Sempre existe uma cobrança futura: a próxima a vencer. */
  function novaCobranca(numero, offsetMeses, plano) {
    return {
      id: gerarId(),
      numero: numero,
      offsetMeses: offsetMeses,
      vencimento: somarMeses(assinatura.testeGratisAte, offsetMeses),
      plano: plano,
      valor: PLANOS[plano].valor,
      pagoEm: null
    };
  }

  /** Cria as cobranças que faltam até a próxima a vencer. → true se mudou */
  function gerarCobrancas() {
    var hoje = F.hojeISO();
    var lista = assinatura.cobrancas;
    var mudou = false;
    if (!lista.length) {
      lista.push(novaCobranca(1, 0, assinatura.plano));
      mudou = true;
    }
    var ultima = lista[lista.length - 1];
    while (ultima.vencimento <= hoje) {
      ultima = novaCobranca(ultima.numero + 1, ultima.offsetMeses + PLANOS[ultima.plano].meses, assinatura.plano);
      lista.push(ultima);
      mudou = true;
    }
    return mudou;
  }

  function situacao(c, hoje) {
    if (c.pagoEm) return 'paga';
    if (c.vencimento < hoje) return 'atrasada';
    if (c.vencimento === hoje) return 'hoje';
    return 'aberta';
  }

  function resumir() {
    var hoje = F.hojeISO();
    var r = { hoje: hoje, pagas: [], atrasadas: [], abertas: [], emTeste: hoje < assinatura.testeGratisAte };
    assinatura.cobrancas.forEach(function (c) {
      var s = situacao(c, hoje);
      if (s === 'paga') r.pagas.push(c);
      else if (s === 'atrasada') r.atrasadas.push(c);
      else r.abertas.push(c);
    });
    r.proxima = r.abertas[0] || null;
    r.totalPago = r.pagas.reduce(function (t, c) { return t + c.valor; }, 0);
    r.totalAberto = r.atrasadas.concat(r.abertas).reduce(function (t, c) { return t + c.valor; }, 0);
    return r;
  }

  /* ---------- Badge do menu (mensalidades atrasadas) ---------- */
  function renderBadge(r) {
    var badge = document.querySelector('[data-badge-plano]');
    var leitor = document.querySelector('[data-badge-plano-leitor]');
    if (!badge) return;
    var n = r ? r.atrasadas.length : 0;
    badge.hidden = n === 0;
    badge.textContent = String(n);
    leitor.textContent = n ? ', ' + n + ' ' + F.plural(n, 'mensalidade atrasada', 'mensalidades atrasadas') : '';
  }

  /* ---------- Renderização ---------- */
  function renderResumo(r) {
    var plano = PLANOS[assinatura.plano];
    var card = $('[data-assinatura-estado]');
    var badge = $('[data-assinatura-badge]');
    $('[data-assinatura-nome]').textContent = plano.nome;
    $('[data-assinatura-preco]').textContent = reais(plano.valor) + ' por ' + plano.periodo;

    if (r.atrasadas.length) {
      card.dataset.assinaturaEstado = 'atraso';
      badge.className = 'badge badge--vermelho';
      badge.textContent = 'Em atraso';
      $('[data-assinatura-texto]').textContent = r.atrasadas.length + ' ' +
        F.plural(r.atrasadas.length, 'cobrança atrasada', 'cobranças atrasadas') + ', somando ' +
        reais(r.atrasadas.reduce(function (t, c) { return t + c.valor; }, 0)) + '.';
    } else if (r.emTeste) {
      var dias = F.diasEntre(r.hoje, assinatura.testeGratisAte);
      card.dataset.assinaturaEstado = 'teste';
      badge.className = 'badge badge--agua';
      badge.textContent = 'Teste grátis';
      $('[data-assinatura-texto]').textContent = 'Seu teste grátis vai até ' + F.dataCurta(assinatura.testeGratisAte) +
        ' (' + (dias === 1 ? 'falta 1 dia' : 'faltam ' + dias + ' dias') + ').';
    } else {
      card.dataset.assinaturaEstado = 'emdia';
      badge.className = 'badge';
      badge.textContent = 'Em dia';
      $('[data-assinatura-texto]').textContent = 'Nenhuma cobrança atrasada.';
    }

    var p = r.proxima;
    if (p) {
      var faltam = F.diasEntre(r.hoje, p.vencimento);
      $('[data-assinatura-proxima]').textContent = (p.numero === 1 ? 'Primeira cobrança: ' : 'Próxima cobrança: ') +
        reais(p.valor) + ' em ' + F.dataExtenso(p.vencimento, true) +
        (faltam === 0 ? ' (vence hoje)' : faltam === 1 ? ' (amanhã)' : ' (em ' + faltam + ' dias)') + '.';
    } else {
      $('[data-assinatura-proxima]').textContent = '';
    }

    raiz.querySelector('[data-n="pagas"]').textContent = String(r.pagas.length);
    raiz.querySelector('[data-n="pagas-info"]').textContent = r.pagas.length
      ? 'última em ' + F.dataCurta(r.pagas.map(function (c) { return c.pagoEm; }).sort().pop()) : 'nenhuma ainda';
    raiz.querySelector('[data-n="total"]').textContent = reais(r.totalPago);
    raiz.querySelector('[data-n="total-info"]').textContent = 'desde o início';
    raiz.querySelector('[data-n="aberto"]').textContent = reais(r.totalAberto);
    raiz.querySelector('[data-n="aberto-info"]').textContent = r.atrasadas.length
      ? r.atrasadas.length + ' ' + F.plural(r.atrasadas.length, 'atrasada', 'atrasadas') + ' + próxima'
      : 'só a próxima cobrança';
    var cardAberto = raiz.querySelector('[data-n-card="aberto"]');
    cardAberto.classList.toggle('resumo--atencao', r.atrasadas.length > 0);
  }

  var SITUACAO = {
    paga: { classe: '', texto: function (c) { return 'Paga em ' + F.dataCurta(c.pagoEm); } },
    aberta: { classe: 'badge--agua', texto: function () { return 'Em aberto'; } },
    hoje: { classe: 'badge--laranja', texto: function () { return 'Vence hoje'; } },
    atrasada: { classe: 'badge--vermelho', texto: function (c, hoje) {
      var d = F.diasEntre(c.vencimento, hoje);
      return 'Atrasada há ' + d + ' ' + F.plural(d, 'dia', 'dias');
    } }
  };

  function celula(rotulo, conteudo) {
    var td = document.createElement('td');
    td.dataset.rotulo = rotulo;
    if (conteudo instanceof Node) td.appendChild(conteudo);
    else td.textContent = conteudo;
    return td;
  }

  function renderCobrancas(r) {
    var corpo = $('[data-cobrancas] tbody');
    corpo.textContent = '';
    // Mais recentes primeiro (a próxima a vencer no topo)
    assinatura.cobrancas.slice().reverse().forEach(function (c) {
      var s = situacao(c, r.hoje);
      var tr = document.createElement('tr');
      tr.appendChild(celula('Vencimento', F.dataCurta(c.vencimento)));
      tr.appendChild(celula('Referente a', PLANOS[c.plano].item + ' ' + c.numero));
      tr.appendChild(celula('Valor', reais(c.valor)));

      var badge = document.createElement('span');
      badge.className = 'badge ' + SITUACAO[s].classe;
      badge.textContent = SITUACAO[s].texto(c, r.hoje);
      tr.appendChild(celula('Situação', badge));

      var acao = document.createElement('td');
      acao.className = 'tabela__acao';
      var btn = document.createElement('button');
      btn.type = 'button';
      if (s === 'paga') {
        btn.className = 'btn btn--fantasma btn--sm';
        btn.dataset.desfazerPagamento = c.id;
        btn.textContent = 'Desfazer';
        btn.setAttribute('aria-label', 'Desfazer pagamento da ' + PLANOS[c.plano].item.toLowerCase() + ' ' + c.numero);
      } else {
        btn.className = 'btn btn--sm' + (s === 'aberta' ? ' btn--secundario' : '');
        btn.dataset.pagar = c.id;
        btn.textContent = 'Registrar pagamento';
        btn.setAttribute('aria-label', 'Registrar pagamento da ' + PLANOS[c.plano].item.toLowerCase() + ' ' + c.numero +
          ', ' + reais(c.valor) + ', vencimento ' + F.dataCurta(c.vencimento));
      }
      acao.appendChild(btn);
      tr.appendChild(acao);
      corpo.appendChild(tr);
    });
  }

  function renderTudo() {
    var r = resumir();
    renderResumo(r);
    renderCobrancas(r);
    renderBadge(r);
    var radio = form.querySelector('[value="' + assinatura.plano + '"]');
    if (radio) radio.checked = true;
    return r;
  }

  // Badge e seção podem pedir ao mesmo tempo: compartilham o mesmo carregamento
  // para não gerar as cobranças duas vezes.
  var carregando = null;
  function carregar() {
    if (!carregando) {
      carregando = (async function () {
        assinatura = await S.getAssinatura();
        assinatura.cobrancas = assinatura.cobrancas || [];
        if (gerarCobrancas()) await S.saveAssinatura(assinatura);
      })().finally(function () { carregando = null; });
    }
    return carregando;
  }

  /* ---------- Ações ---------- */
  function focarTitulo() {
    var t = $('#plano-t-cobrancas');
    t.focus();
  }

  async function marcarPagamento(id, pagoEm) {
    var c = assinatura.cobrancas.find(function (x) { return x.id === id; });
    if (!c) return null;
    c.pagoEm = pagoEm;
    await S.saveAssinatura(assinatura);
    renderTudo();
    return c;
  }

  raiz.addEventListener('click', async function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    if (!alvo) return;

    var pagar = alvo.closest('[data-pagar]');
    if (pagar) {
      var c = await marcarPagamento(pagar.dataset.pagar, F.hojeISO());
      focarTitulo();
      PF.toast(PLANOS[c.plano].item + ' ' + c.numero + ' (' + reais(c.valor) + ') registrada como paga hoje.', {
        titulo: 'Pagamento registrado',
        duracao: 6000,
        acao: { texto: 'Desfazer', onClick: function () { marcarPagamento(c.id, null); } }
      });
      return;
    }

    var desfazer = alvo.closest('[data-desfazer-pagamento]');
    if (desfazer) {
      var d = await marcarPagamento(desfazer.dataset.desfazerPagamento, null);
      focarTitulo();
      PF.toast(PLANOS[d.plano].item + ' ' + d.numero + ' voltou para em aberto.', { tipo: 'info' });
    }
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var escolhido = form.plano.value;
    if (!escolhido || escolhido === assinatura.plano) {
      PF.toast('Esse já é o seu plano atual.', { tipo: 'info' });
      return;
    }
    var botao = form.querySelector('[type="submit"]');
    PF.setLoading(botao, true, 'Salvando…');
    try {
      var hoje = F.hojeISO();
      assinatura.plano = escolhido;
      // Só as cobranças ainda não vencidas e não pagas mudam de valor.
      assinatura.cobrancas.forEach(function (c) {
        if (!c.pagoEm && c.vencimento >= hoje) {
          c.plano = escolhido;
          c.valor = PLANOS[escolhido].valor;
        }
      });
      await S.saveAssinatura(assinatura);
      renderTudo();
      PF.toast('A próxima cobrança já está no valor do plano ' + PLANOS[escolhido].nome.toLowerCase() + ' (' + reais(PLANOS[escolhido].valor) + ').', {
        titulo: 'Plano alterado para ' + PLANOS[escolhido].nome
      });
    } catch (err) {
      PF.toast(err.message || 'Não foi possível trocar o plano.', { tipo: 'erro' });
    } finally {
      PF.setLoading(botao, false);
    }
  });

  /* ---------- Eventos e início ---------- */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'plano') return;
    await carregar();
    renderTudo();
  });

  // Badge já ao abrir o app (sem esperar a seção ser aberta).
  PF.auth.pronto.then(async function (usuario) {
    if (!usuario) return;
    await carregar();
    renderBadge(resumir());
  });
})();
