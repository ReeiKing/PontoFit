/* ==========================================================================
   PontoFit — plano.js
   Seção "Meu plano": plano atual, teste grátis, mensalidades (pagas, em
   aberto, atrasadas), pagamento por Pix, pagamento automático no cartão
   (assinatura do Mercado Pago, api/subscriptions/*) e troca de plano.

   As cobranças são geradas a partir do fim do teste grátis. Pagamento: Pix
   do Mercado Pago (api/pix/*). Só o servidor marca uma mensalidade como paga
   e estende o acesso (acessoAte); aqui a tela mostra o QR e espera a
   confirmação.
   Dados via PF.storage.getAssinatura / saveAssinatura / criarPix / statusPix.
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

  // Dias de uso depois do fim do período pago, antes do bloqueio.
  // Igual ao "+ 3" de private.acesso_ativo() na migração do Pix.
  var TOLERANCIA_DIAS = 3;

  var assinatura = null;
  var cartao = null; // assinatura no cartão (Mercado Pago) ou null

  /* ---------- Utilitários ---------- */
  function reais(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function gerarId() { return PF.uuid(); } // UUID v4 (formato exigido pelo banco)

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
    var r = {
      hoje: hoje, pagas: [], atrasadas: [], abertas: [],
      emTeste: hoje < assinatura.testeGratisAte && assinatura.acessoAte === assinatura.testeGratisAte,
      bloqueado: hoje > F.somarDias(assinatura.acessoAte, TOLERANCIA_DIAS)
    };
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

    if (r.bloqueado) {
      card.dataset.assinaturaEstado = 'atraso';
      badge.className = 'badge badge--vermelho';
      badge.textContent = 'Acesso bloqueado';
      $('[data-assinatura-texto]').textContent = 'Pague uma mensalidade em aberto com Pix para liberar o app na hora.';
    } else if (r.atrasadas.length) {
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
      $('[data-assinatura-texto]').textContent = 'Acesso liberado até ' + F.dataCurta(assinatura.acessoAte) + '.';
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
      if (s !== 'paga' && s !== 'atrasada' && cartaoAtivo()) {
        // Será cobrada no cartão: sem botão de Pix, para não pagar duas vezes.
        var noCartao = document.createElement('span');
        noCartao.className = 'texto-sm texto-sec';
        noCartao.textContent = 'No cartão';
        acao.appendChild(noCartao);
      } else if (s !== 'paga') {
        btn.className = 'btn btn--sm' + (s === 'aberta' ? ' btn--secundario' : '');
        btn.dataset.pix = c.id;
        btn.textContent = 'Pagar com Pix';
        btn.setAttribute('aria-label', 'Pagar com Pix a ' + PLANOS[c.plano].item.toLowerCase() + ' ' + c.numero +
          ', ' + reais(c.valor) + ', vencimento ' + F.dataCurta(c.vencimento));
        acao.appendChild(btn);
      }
      tr.appendChild(acao);
      corpo.appendChild(tr);
    });
  }

  /* ---------- Pagamento automático no cartão (Mercado Pago) ----------
     Assinatura sem plano com pagamento pendente: o servidor cria a
     assinatura (/api/subscriptions) e a pessoa informa o cartão na página do
     Mercado Pago. Cada cobrança aprovada chega pelo webhook, que marca a
     mensalidade como paga e estende o acesso, como no Pix. */
  var cartaoEl = raiz.querySelector('[data-mp-subscriptions-page]');
  var assinarBtn = cartaoEl.querySelector('[data-cartao-assinar]');
  var cartaoOcupado = false; // evita cliques repetidos enquanto processa

  var CARTAO = {
    nenhuma: { badge: '', classe: '', texto: function (p) {
      return 'Cadastre um cartão no Mercado Pago e cada ' + (p.periodo === 'ano' ? 'anuidade' : 'mensalidade') +
        ' de ' + reais(p.valor) + ' é cobrada sozinha, a partir do fim do período que você já tem.';
    }, acoes: [] },
    pending: { badge: 'Aguardando cartão', classe: 'badge--laranja', texto: function () {
      return 'Falta informar o cartão na página do Mercado Pago. Clique em "Assinar no cartão" para continuar de onde parou.';
    }, acoes: ['cancel'] },
    authorized: { badge: 'Ativo', classe: '', texto: function (p) {
      return 'As cobranças de ' + reais(p.valor) + ' por ' + p.periodo + ' são feitas no cartão. O acesso é liberado assim que o Mercado Pago aprova.';
    }, acoes: ['pause', 'cancel'] },
    paused: { badge: 'Pausado', classe: 'badge--agua', texto: function () {
      return 'As cobranças no cartão estão pausadas. Reative ou pague as mensalidades com Pix.';
    }, acoes: ['reactivate', 'cancel'] },
    cancelled: { badge: 'Cancelado', classe: 'badge--vermelho', texto: function (p) {
      return 'A assinatura anterior foi cancelada. Você pode assinar de novo, ' + reais(p.valor) + ' por ' + p.periodo + ', ou seguir pagando com Pix.';
    }, acoes: [] }
  };

  function cartaoAtivo() { return !!cartao && cartao.status === 'authorized'; }
  function cartaoVivo() { return !!cartao && ['pending', 'authorized', 'paused'].indexOf(cartao.status) !== -1; }

  function erroCartao(msg) {
    var el = cartaoEl.querySelector('[data-cartao-erro]');
    el.hidden = !msg;
    el.textContent = msg ? msg + ' Se continuar, tente novamente em alguns minutos ou pague com Pix.' : '';
  }

  function renderCartao() {
    var estado = cartao && CARTAO[cartao.status] ? cartao.status : 'nenhuma';
    var info = CARTAO[estado];
    var plano = PLANOS[estado === 'nenhuma' || estado === 'cancelled' ? assinatura.plano : cartao.plano];
    cartaoEl.dataset.cartaoEstado = estado;
    cartaoEl.setAttribute('aria-busy', 'false');
    cartaoEl.querySelector('[data-cartao-texto]').textContent = info.texto(plano);

    var badge = cartaoEl.querySelector('[data-cartao-badge]');
    badge.hidden = !info.badge;
    badge.className = 'badge ' + info.classe;
    badge.textContent = info.badge;

    assinarBtn.hidden = !(estado === 'nenhuma' || estado === 'cancelled' || estado === 'pending');
    cartaoEl.querySelectorAll('[data-cartao-acao]').forEach(function (b) {
      b.hidden = info.acoes.indexOf(b.dataset.cartaoAcao) === -1;
    });
  }

  async function carregarCartao() {
    try {
      cartao = await S.getAssinaturaCartao();
    } catch (err) {
      cartao = null;
    }
  }

  async function assinarCartao() {
    if (cartaoOcupado) return;
    cartaoOcupado = true;
    erroCartao('');
    PF.setLoading(assinarBtn, true, 'Processando…');
    try {
      var r = await S.criarAssinaturaCartao();
      // Vai para a página do Mercado Pago (o botão segue desabilitado).
      window.location.assign(r.initPoint);
    } catch (err) {
      cartaoOcupado = false;
      PF.setLoading(assinarBtn, false);
      erroCartao(err.message || 'Não foi possível abrir o Mercado Pago agora.');
    }
  }

  var TEXTO_ACAO = {
    pause: { ok: 'Pagamento automático pausado.', carregando: 'Pausando…' },
    reactivate: { ok: 'Pagamento automático reativado.', carregando: 'Reativando…' },
    cancel: { ok: 'Pagamento automático cancelado. Você pode seguir pagando com Pix.', carregando: 'Cancelando…' }
  };

  async function alterarCartao(acao, botao) {
    if (cartaoOcupado || !cartao) return;
    if (acao === 'cancel' && !window.confirm('Cancelar o pagamento automático no cartão? Depois de cancelada, a assinatura não pode ser reativada; será preciso assinar de novo.')) return;
    cartaoOcupado = true;
    erroCartao('');
    PF.setLoading(botao, true, TEXTO_ACAO[acao].carregando);
    try {
      cartao = await S.alterarAssinaturaCartao(cartao.id, acao);
      renderTudo();
      PF.toast(TEXTO_ACAO[acao].ok);
    } catch (err) {
      erroCartao(err.message || 'Não foi possível alterar a assinatura.');
    } finally {
      cartaoOcupado = false;
      PF.setLoading(botao, false);
    }
  }

  /** Volta da página do Mercado Pago (back_url: app.html?assinatura=retorno#plano). */
  async function conferirRetorno() {
    var params = new URLSearchParams(location.search);
    if (params.get('assinatura') !== 'retorno') return;
    params.delete('assinatura');
    var busca = params.toString();
    history.replaceState(null, '', location.pathname + (busca ? '?' + busca : '') + location.hash);
    if (!cartao) return;
    try {
      cartao = await S.consultarAssinaturaCartao(cartao.id);
    } catch (err) { /* mostra o último status conhecido */ }
    renderTudo();
    if (cartao.status === 'authorized') {
      PF.toast('As próximas cobranças serão feitas no cartão automaticamente.', { titulo: 'Pagamento automático ativado', duracao: 6000 });
    } else if (cartao.status === 'pending') {
      PF.toast('O cartão ainda não foi confirmado. Se você concluiu agora, a confirmação pode levar alguns minutos.', { tipo: 'info', duracao: 6000 });
    }
  }

  assinarBtn.addEventListener('click', assinarCartao);
  cartaoEl.addEventListener('click', function (e) {
    var b = e.target instanceof Element ? e.target.closest('[data-cartao-acao]') : null;
    if (b) alterarCartao(b.dataset.cartaoAcao, b);
  });

  function renderTudo() {
    var r = resumir();
    renderResumo(r);
    renderCartao();
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
        await carregarCartao();
      })().finally(function () { carregando = null; });
    }
    return carregando;
  }

  /* ---------- Pix ----------
     Abre o QR, consulta /api/pix/status a cada 5 s enquanto o diálogo está
     aberto e, quando o Mercado Pago aprova, recarrega o plano e avisa o
     app.js (evento 'pf:acesso') para desbloquear o menu. */
  var dialogo = document.querySelector('[data-pix-dialogo]');
  var pix = null; // { pagamento, cobranca, timer, relogio }

  function pararPix() {
    if (!pix) return;
    clearTimeout(pix.timer);
    clearInterval(pix.relogio);
    pix = null;
  }

  function estadoPix(estado, texto) {
    dialogo.dataset.pixEstado = estado;
    dialogo.querySelector('[data-pix-status]').textContent = texto;
  }

  function relogioPix() {
    var resta = Math.max(0, new Date(pix.pagamento.expiraEm) - Date.now());
    var min = Math.floor(resta / 60000);
    var seg = Math.floor((resta % 60000) / 1000);
    dialogo.querySelector('[data-pix-validade]').textContent = resta
      ? 'Este código vale por mais ' + min + ':' + String(seg).padStart(2, '0') + ' min.'
      : 'Este código expirou.';
  }

  async function consultarPix() {
    if (!pix) return;
    var atual = pix;
    try {
      var r = await S.statusPix(atual.pagamento.id);
      if (pix !== atual) return; // diálogo fechado ou outro Pix aberto
      if (r.status === 'approved') return pixAprovado();
      if (r.status !== 'pending') {
        clearInterval(pix.relogio);
        return estadoPix('expirado', 'Este Pix expirou ou foi cancelado. Feche e gere outro.');
      }
    } catch (err) {
      if (pix !== atual) return;
    }
    pix.timer = setTimeout(consultarPix, 5000);
  }

  async function pixAprovado() {
    var c = pix.cobranca;
    pararPix();
    estadoPix('pago', 'Pagamento confirmado!');
    await carregar();
    renderTudo();
    document.dispatchEvent(new CustomEvent('pf:acesso', { detail: { acessoAte: assinatura.acessoAte } }));
    setTimeout(function () { if (dialogo.open) dialogo.close(); }, 1200);
    PF.toast(PLANOS[c.plano].item + ' ' + c.numero + ' paga. Acesso liberado até ' + F.dataCurta(assinatura.acessoAte) + '.', {
      titulo: 'Pagamento confirmado',
      duracao: 6000
    });
  }

  async function abrirPix(cobrancaId) {
    var c = assinatura.cobrancas.find(function (x) { return x.id === cobrancaId; });
    if (!c) return;
    pararPix();
    dialogo.querySelector('[data-pix-titulo]').textContent = PLANOS[c.plano].item + ' ' + c.numero;
    dialogo.querySelector('[data-pix-valor]').textContent = reais(PLANOS[c.plano].valor);
    dialogo.querySelector('[data-pix-img]').removeAttribute('src');
    dialogo.querySelector('[data-pix-codigo]').value = '';
    dialogo.querySelector('[data-pix-validade]').textContent = '';
    estadoPix('carregando', 'Gerando o Pix…');
    if (typeof dialogo.showModal === 'function') dialogo.showModal();

    var meu = { cobranca: c };
    pix = meu;
    try {
      var pagamento = await S.criarPix(c.id);
      if (pix !== meu) return;
      meu.pagamento = pagamento;
      dialogo.querySelector('[data-pix-img]').src = 'data:image/png;base64,' + pagamento.qrCodeBase64;
      dialogo.querySelector('[data-pix-codigo]').value = pagamento.qrCode;
      estadoPix('aguardando', 'Aguardando o pagamento…');
      relogioPix();
      meu.relogio = setInterval(relogioPix, 1000);
      meu.timer = setTimeout(consultarPix, 5000);
    } catch (err) {
      if (pix !== meu) return;
      estadoPix('erro', err.message || 'Não foi possível gerar o Pix.');
    }
  }

  dialogo.addEventListener('close', pararPix);
  dialogo.querySelector('[data-pix-fechar]').addEventListener('click', function () { dialogo.close(); });
  dialogo.querySelector('[data-pix-copiar]').addEventListener('click', async function () {
    var campo = dialogo.querySelector('[data-pix-codigo]');
    if (!campo.value) return;
    try {
      await navigator.clipboard.writeText(campo.value);
    } catch (e) {
      campo.select();
      document.execCommand('copy');
    }
    PF.toast('Código Pix copiado. Cole no app do seu banco, em "Pix copia e cola".', { tipo: 'info' });
  });

  raiz.addEventListener('click', function (e) {
    var alvo = e.target instanceof Element ? e.target : null;
    var pagar = alvo && alvo.closest('[data-pix]');
    if (pagar) abrirPix(pagar.dataset.pix);
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var escolhido = form.plano.value;
    if (!escolhido || escolhido === assinatura.plano) {
      PF.toast('Esse já é o seu plano atual.', { tipo: 'info' });
      return;
    }
    if (cartaoVivo() && cartao.status !== 'pending') {
      PF.toast('Cancele o pagamento automático no cartão antes de trocar de plano. Depois, assine de novo no plano novo.', { tipo: 'aviso', duracao: 6000 });
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
    await conferirRetorno();
  });

  // Badge já ao abrir o app (sem esperar a seção ser aberta).
  PF.auth.pronto.then(async function (usuario) {
    if (!usuario) return;
    await carregar();
    renderBadge(resumir());
  });
})();
