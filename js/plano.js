/* ==========================================================================
   PontoFit — plano.js
   Seção "Assinaturas": situação do acesso, escolha do plano (7 dias, 30 dias
   ou 6 meses), pagamento por Pix (QR no site, api/pix/*) ou cartão (Checkout
   Pro do Mercado Pago, api/cartao/*) e histórico de pagamentos.

   Planos avulsos: cada pagamento aprovado soma o período ao acesso. Só o
   servidor confirma pagamento e estende o acesso (acessoAte); aqui a tela
   mostra o QR ou leva ao Mercado Pago e espera a confirmação.
   Sem acesso ativo, esta é a única seção liberada (app.js + RLS no banco).
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
  var botaoPix = $('[data-pagar-pix]');
  var botaoCartao = $('[data-pagar-cartao]');

  // Igual a PLANOS em api/_lib/pix.js (o servidor decide o valor cobrado).
  var PLANOS = {
    semanal: { nome: '7 dias', item: 'Plano 7 dias', valor: 4.99 },
    mensal: { nome: '30 dias', item: 'Plano 30 dias', valor: 15 },
    semestral: { nome: '6 meses', item: 'Plano 6 meses', valor: 50 }
  };

  var assinatura = null; // { plano, acessoAte, pagamentos }
  var ocupado = false;   // evita cliques repetidos enquanto processa

  /* ---------- Utilitários ---------- */
  function reais(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function dataDe(ts) {
    return new Date(ts).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  function planoEscolhido() {
    var marcado = form.querySelector('[name="plano"]:checked');
    return marcado ? marcado.value : null;
  }

  function erro(msg) {
    var el = $('[data-plano-erro]');
    el.hidden = !msg;
    el.textContent = msg || '';
  }

  function acessoAtivo() {
    return !!(assinatura && assinatura.acessoAte && assinatura.acessoAte >= F.hojeISO());
  }

  /* ---------- Renderização ---------- */
  function renderAcesso() {
    var card = $('[data-assinatura-estado]');
    var badge = $('[data-assinatura-badge]');
    var titulo = $('[data-assinatura-titulo]');
    var texto = $('[data-assinatura-texto]');
    badge.hidden = false;

    if (!acessoAtivo()) {
      card.dataset.assinaturaEstado = 'atraso';
      badge.className = 'badge badge--vermelho';
      badge.textContent = 'Sem acesso';
      titulo.textContent = 'Escolha um plano';
      texto.textContent = assinatura.acessoAte && assinatura.acessoAte !== F.somarDias(F.hojeISO(), -1)
        ? 'Seu acesso terminou em ' + F.dataCurta(assinatura.acessoAte) + '. Pague um plano para liberar receitas, ficha, evolução e medicamentos na hora.'
        : 'Pague um plano para liberar receitas, ficha, evolução e medicamentos na hora.';
      return;
    }

    var dias = F.diasEntre(F.hojeISO(), assinatura.acessoAte) + 1; // conta o dia de hoje
    card.dataset.assinaturaEstado = dias <= 2 ? 'teste' : 'emdia';
    badge.className = dias <= 2 ? 'badge badge--laranja' : 'badge';
    badge.textContent = 'Ativo';
    titulo.textContent = 'Liberado até ' + F.dataCurta(assinatura.acessoAte);
    texto.textContent = (dias === 1 ? 'Hoje é o último dia do seu acesso.' : 'Faltam ' + dias + ' dias.') +
      ' Para continuar sem interrupção, pague um novo plano: os dias são somados.';
  }

  var SITUACAO = {
    approved: { classe: '', texto: 'Aprovado' },
    pending: { classe: 'badge--agua', texto: 'Aguardando' },
    in_process: { classe: 'badge--agua', texto: 'Em análise' },
    authorized: { classe: 'badge--agua', texto: 'Em análise' },
    rejected: { classe: 'badge--vermelho', texto: 'Recusado' },
    cancelled: { classe: 'badge--vermelho', texto: 'Cancelado' },
    expired: { classe: 'badge--vermelho', texto: 'Expirado' },
    valor_divergente: { classe: 'badge--vermelho', texto: 'Em revisão' }
  };

  function celula(rotulo, conteudo) {
    var td = document.createElement('td');
    td.dataset.rotulo = rotulo;
    if (conteudo instanceof Node) td.appendChild(conteudo);
    else td.textContent = conteudo;
    return td;
  }

  function renderHistorico() {
    // Cartão "pending" = checkout aberto e não concluído; não é um pagamento.
    var lista = assinatura.pagamentos.filter(function (p) { return !(p.meio === 'cartao' && p.status === 'pending'); });
    var tabela = $('[data-historico]');
    var corpo = tabela.querySelector('tbody');
    corpo.textContent = '';
    tabela.hidden = !lista.length;
    $('[data-historico-vazio]').hidden = !!lista.length;

    lista.forEach(function (p) {
      var s = SITUACAO[p.status] || { classe: 'badge--agua', texto: p.status };
      var tr = document.createElement('tr');
      tr.appendChild(celula('Data', dataDe(p.aprovadoEm || p.criadoEm)));
      tr.appendChild(celula('Plano', PLANOS[p.plano] ? PLANOS[p.plano].nome : p.plano));
      tr.appendChild(celula('Forma', p.meio === 'pix' ? 'Pix' : 'Cartão'));
      tr.appendChild(celula('Valor', reais(p.valor)));
      var badge = document.createElement('span');
      badge.className = 'badge ' + s.classe;
      badge.textContent = s.texto;
      tr.appendChild(celula('Situação', badge));
      corpo.appendChild(tr);
    });
  }

  function renderTudo() {
    renderAcesso();
    renderHistorico();
    if (!planoEscolhido()) {
      var radio = form.querySelector('[value="' + assinatura.plano + '"]') || form.querySelector('[value="mensal"]');
      radio.checked = true;
    }
  }

  // Seção e retorno do pagamento podem pedir ao mesmo tempo: um carregamento só.
  var carregando = null;
  function carregar() {
    if (!carregando) {
      carregando = (async function () {
        assinatura = await S.getAssinatura();
      })().finally(function () { carregando = null; });
    }
    return carregando;
  }

  /** Recarrega e avisa o app.js para liberar o menu. */
  async function acessoLiberado() {
    await carregar();
    renderTudo();
    document.dispatchEvent(new CustomEvent('pf:acesso', { detail: { acessoAte: assinatura.acessoAte } }));
  }

  /* ---------- Escolha do plano ---------- */
  form.addEventListener('change', function () {
    erro('');
    var plano = planoEscolhido();
    if (plano && assinatura && plano !== assinatura.plano) {
      assinatura.plano = plano;
      S.savePlanoPreferido(plano).catch(function () { /* só preferência */ });
    }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- Cartão (Checkout Pro) ----------
     O servidor cria a preferência e devolve o init_point; a pessoa paga na
     página do Mercado Pago e volta para app.html?pagamento=<id>#plano. */
  botaoCartao.addEventListener('click', async function () {
    var plano = planoEscolhido();
    if (ocupado || !plano) return;
    ocupado = true;
    erro('');
    PF.setLoading(botaoCartao, true, 'Abrindo o Mercado Pago…');
    try {
      var r = await S.criarPagamentoCartao(plano);
      window.location.assign(r.initPoint); // segue desabilitado até sair da página
    } catch (err) {
      ocupado = false;
      PF.setLoading(botaoCartao, false);
      erro((err.message || 'Não foi possível abrir o pagamento no cartão.') + ' Você também pode pagar com Pix.');
    }
  });

  /** Volta do Checkout Pro: confere o pagamento no servidor e libera na hora. */
  async function conferirRetorno() {
    var params = new URLSearchParams(location.search);
    var compra = params.get('pagamento');
    if (!compra) return;
    params.delete('pagamento');
    ['collection_id', 'collection_status', 'payment_id', 'status', 'external_reference', 'payment_type',
      'merchant_order_id', 'preference_id', 'site_id', 'processing_mode', 'merchant_account_id'].forEach(function (k) { params.delete(k); });
    var busca = params.toString();
    history.replaceState(null, '', location.pathname + (busca ? '?' + busca : '') + location.hash);

    var aviso = PF.toast('Conferindo seu pagamento…', { tipo: 'info', duracao: 0 });
    try {
      var r = await S.statusPagamentoCartao(compra);
      aviso.fechar();
      if (r.status === 'approved') {
        await acessoLiberado();
        PF.toast('Acesso liberado até ' + F.dataCurta(assinatura.acessoAte) + '.', { titulo: 'Pagamento aprovado', duracao: 6000 });
      } else if (r.status === 'rejected' || r.status === 'cancelled') {
        await carregar();
        renderTudo();
        PF.toast('O pagamento não foi aprovado. Tente outro cartão ou pague com Pix.', { titulo: 'Pagamento recusado', tipo: 'erro', duracao: 8000 });
      } else if (r.status === 'pending' || r.status === 'in_process' || r.status === 'authorized') {
        PF.toast('O Mercado Pago ainda está analisando o pagamento. Assim que aprovar, o acesso é liberado sozinho.', { tipo: 'info', duracao: 8000 });
      }
    } catch (err) {
      aviso.fechar();
      PF.toast(err.message || 'Não foi possível conferir o pagamento agora. Atualize a página em instantes.', { tipo: 'erro' });
    }
  }

  /* ---------- Pix ----------
     Abre o QR, consulta /api/pix/status a cada 5 s enquanto o diálogo está
     aberto e, quando o Mercado Pago aprova, recarrega e avisa o app.js
     (evento 'pf:acesso') para desbloquear o menu. */
  var dialogo = document.querySelector('[data-pix-dialogo]');
  var pix = null; // { pagamento, plano, timer, relogio }

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
    var plano = pix.plano;
    pararPix();
    estadoPix('pago', 'Pagamento confirmado!');
    await acessoLiberado();
    setTimeout(function () { if (dialogo.open) dialogo.close(); }, 1200);
    PF.toast(PLANOS[plano].item + ' pago. Acesso liberado até ' + F.dataCurta(assinatura.acessoAte) + '.', {
      titulo: 'Pagamento confirmado',
      duracao: 6000
    });
  }

  async function abrirPix(plano) {
    pararPix();
    dialogo.querySelector('[data-pix-titulo]').textContent = PLANOS[plano].item;
    dialogo.querySelector('[data-pix-valor]').textContent = reais(PLANOS[plano].valor);
    dialogo.querySelector('[data-pix-img]').removeAttribute('src');
    dialogo.querySelector('[data-pix-codigo]').value = '';
    dialogo.querySelector('[data-pix-validade]').textContent = '';
    estadoPix('carregando', 'Gerando o Pix…');
    if (typeof dialogo.showModal === 'function') dialogo.showModal();

    var meu = { plano: plano };
    pix = meu;
    try {
      var pagamento = await S.criarPix(plano);
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

  botaoPix.addEventListener('click', function () {
    var plano = planoEscolhido();
    if (plano) abrirPix(plano);
  });

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

  /* ---------- Início ---------- */
  document.addEventListener('pf:secao', async function (e) {
    if (e.detail.secao !== 'plano') return;
    try {
      await carregar();
      renderTudo();
    } catch (err) {
      erro(err.message || 'Não foi possível carregar suas assinaturas.');
    }
    await conferirRetorno();
  });
})();
