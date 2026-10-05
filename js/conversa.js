/* ==========================================================================
   PontoFit — conversa.js
   Conversa entre profissional e paciente, usada no painel do profissional
   (detalhes do paciente) e no app do paciente (seção Mensagens).

   PF.conversa.montar(elemento, { vinculoId, nomeOutro }) → { destruir }
   PF.conversa.ouvir()  liga o tempo real (uma vez por página) e dispara
     'pf:mensagem' (detail: { mensagem, vinculoId }) a cada mensagem nova.

   Quem pode ler e enviar é decidido pelo banco (políticas de mensagens).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  if (!S) return;

  var ouvindo = false;
  function ouvir() {
    if (ouvindo) return;
    ouvindo = true;
    S.ouvirMensagens(function (mensagem, vinculoId) {
      document.dispatchEvent(new CustomEvent('pf:mensagem', { detail: { mensagem: mensagem, vinculoId: vinculoId } }));
    });
  }

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }
  function diaDe(ts) { return new Date(ts).toLocaleDateString('en-CA'); }
  function rotuloDia(ts) {
    var d = diaDe(ts);
    var hoje = PF.fmt.hojeISO();
    if (d === hoje) return 'Hoje';
    if (d === PF.fmt.somarDias(hoje, -1)) return 'Ontem';
    return new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  }
  /** Reduz a foto (lado maior até 1600 px) e converte para JPEG. → Promise<Blob> */
  var LADO_MAX = 1600;
  function reduzirImagem(arquivo) {
    return new Promise(function (resolver, rejeitar) {
      if (!/^image\//.test(arquivo.type)) return rejeitar(new Error('Escolha uma imagem (foto, print ou PNG).'));
      if (arquivo.size > 25 * 1024 * 1024) return rejeitar(new Error('Essa imagem é muito grande. Escolha uma de até 25 MB.'));
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onload = function () {
        var escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * escala);
        c.height = Math.round(img.naturalHeight * escala);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; // PNG transparente vira fundo branco no JPEG
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (blob) {
          if (blob) resolver(blob); else rejeitar(new Error('Não foi possível ler essa imagem.'));
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rejeitar(new Error('Não foi possível ler essa imagem. Tente uma foto em JPG ou PNG.')); };
      img.src = url;
    });
  }

  function hora(ts) { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  function montar(caixa, opcoes) {
    ouvir();
    var vinculoId = opcoes.vinculoId;
    var ids = {};
    var ultimoDia = null;

    caixa.textContent = '';
    caixa.classList.add('conversa');
    var lista = el('ol', 'conversa__lista');
    lista.setAttribute('role', 'log');
    lista.setAttribute('aria-live', 'polite');
    lista.setAttribute('aria-label', 'Conversa com ' + opcoes.nomeOutro);
    lista.setAttribute('tabindex', '0');
    var vazio = el('p', 'conversa__vazio texto-sm texto-sec', 'Carregando a conversa…');
    caixa.appendChild(lista);
    caixa.appendChild(vazio);

    var form = el('form', 'conversa__form');
    form.noValidate = true;
    var rotulo = el('label', 'sr-only', 'Mensagem para ' + opcoes.nomeOutro);
    rotulo.htmlFor = 'conversa-' + vinculoId;
    var campo = el('textarea', 'input conversa__campo');
    campo.id = 'conversa-' + vinculoId;
    campo.rows = 1;
    campo.maxLength = 2000;
    campo.placeholder = 'Escreva uma mensagem';
    var anexar = el('button', 'conversa__anexar');
    anexar.type = 'button';
    anexar.setAttribute('aria-label', 'Anexar imagem');
    anexar.title = 'Anexar imagem';
    anexar.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/></svg>');
    var seletor = el('input');
    seletor.type = 'file';
    seletor.accept = 'image/*';
    seletor.hidden = true;
    var previa = el('div', 'conversa__previa');
    previa.hidden = true;
    var enviar = el('button', 'btn conversa__enviar');
    enviar.type = 'submit';
    enviar.setAttribute('aria-label', 'Enviar mensagem');
    enviar.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>');
    form.appendChild(rotulo);
    form.appendChild(anexar);
    form.appendChild(seletor);
    form.appendChild(campo);
    form.appendChild(enviar);
    caixa.appendChild(previa);
    caixa.appendChild(form);
    var erro = el('p', 'campo__erro conversa__erro');
    erro.setAttribute('aria-live', 'polite');
    caixa.appendChild(erro);

    function rolarParaFim() { lista.scrollTop = lista.scrollHeight; }

    function adicionar(m) {
      if (ids[m.id]) return;
      ids[m.id] = true;
      vazio.hidden = true;
      var dia = diaDe(m.criadoEm);
      if (dia !== ultimoDia) {
        ultimoDia = dia;
        lista.appendChild(el('li', 'conversa__dia', rotuloDia(m.criadoEm)));
      }
      var li = el('li', 'conversa__msg' + (m.minha ? ' conversa__msg--minha' : ''));
      li.appendChild(el('span', 'sr-only', m.minha ? 'Você: ' : opcoes.nomeOutro + ': '));
      if (m.anexo) li.appendChild(imagemDaMensagem(m));
      if (m.texto) li.appendChild(el('p', 'conversa__texto', m.texto));
      li.appendChild(el('span', 'conversa__hora', hora(m.criadoEm)));
      lista.appendChild(li);
    }

    /** Imagem da conversa: endereço temporário pedido na hora; toque abre em tamanho real. */
    function imagemDaMensagem(m) {
      var link = el('a', 'conversa__imagem');
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', 'Imagem enviada' + (m.minha ? ' por você' : ' por ' + opcoes.nomeOutro) + ', abrir em tamanho real');
      var img = el('img');
      img.alt = '';
      img.decoding = 'async';
      link.appendChild(img);
      S.urlAnexo(m.anexo).then(function (url) {
        link.href = url;
        img.addEventListener('load', function () {
          var perto = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 400;
          if (perto) rolarParaFim();
        });
        img.src = url;
      }, function () {
        link.classList.add('conversa__imagem--erro');
        link.textContent = 'Imagem indisponível';
      });
      return link;
    }

    /* Anexo escolhido (já reduzido), mostrado acima do campo até enviar. */
    var anexo = null;
    var anexoUrl = null;
    function limparAnexo() {
      anexo = null;
      if (anexoUrl) URL.revokeObjectURL(anexoUrl);
      anexoUrl = null;
      previa.hidden = true;
      previa.textContent = '';
      seletor.value = '';
    }
    anexar.addEventListener('click', function () { seletor.click(); });
    seletor.addEventListener('change', async function () {
      var arquivo = seletor.files && seletor.files[0];
      if (!arquivo) return;
      erro.textContent = '';
      anexar.disabled = true;
      try {
        var blob = await reduzirImagem(arquivo);
        limparAnexo();
        anexo = blob;
        anexoUrl = URL.createObjectURL(blob);
        var img = el('img');
        img.src = anexoUrl;
        img.alt = 'Imagem que será enviada';
        var tirar = el('button', 'conversa__previa-tirar');
        tirar.type = 'button';
        tirar.setAttribute('aria-label', 'Remover imagem');
        tirar.textContent = '×';
        tirar.addEventListener('click', function () { limparAnexo(); campo.focus(); });
        previa.appendChild(img);
        previa.appendChild(el('span', 'texto-sm texto-sec', 'Escreva uma legenda (opcional) e envie.'));
        previa.appendChild(tirar);
        previa.hidden = false;
        campo.focus();
      } catch (err) {
        erro.textContent = err.message;
        seletor.value = '';
      } finally {
        anexar.disabled = false;
      }
    });

    // Colar um print direto no campo também anexa.
    campo.addEventListener('paste', function (e) {
      var itens = e.clipboardData && e.clipboardData.files;
      if (!itens || !itens.length || !/^image\//.test(itens[0].type)) return;
      e.preventDefault();
      var dt = new DataTransfer();
      dt.items.add(itens[0]);
      seletor.files = dt.files;
      seletor.dispatchEvent(new Event('change'));
    });

    function ajustarAltura() {
      campo.style.height = '';
      if (campo.scrollHeight > campo.clientHeight) campo.style.height = Math.min(campo.scrollHeight + 2, 160) + 'px';
    }
    campo.addEventListener('input', ajustarAltura);
    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var texto = campo.value.trim();
      erro.textContent = '';
      if (!texto && !anexo) return;
      enviar.disabled = true;
      anexar.disabled = true;
      if (anexo) PF.setLoading(enviar, true, 'Enviando imagem…');
      try {
        var m = await S.enviarMensagem(vinculoId, texto, anexo);
        limparAnexo();
        campo.value = '';
        ajustarAltura();
        adicionar(m);
        rolarParaFim();
      } catch (err) {
        erro.textContent = err.message;
      } finally {
        PF.setLoading(enviar, false);
        enviar.disabled = false;
        anexar.disabled = false;
        campo.focus();
      }
    });

    function aoReceber(e) {
      if (e.detail.vinculoId !== vinculoId) return;
      var perto = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 80;
      adicionar(e.detail.mensagem);
      if (perto || e.detail.mensagem.minha) rolarParaFim();
      if (!e.detail.mensagem.minha) S.marcarLidas(vinculoId).then(avisarLidas, function () {});
    }
    document.addEventListener('pf:mensagem', aoReceber);

    function avisarLidas() { document.dispatchEvent(new CustomEvent('pf:mensagens-lidas', { detail: { vinculoId: vinculoId } })); }

    S.getMensagens(vinculoId).then(function (msgs) {
      msgs.forEach(adicionar);
      if (!msgs.length) vazio.textContent = 'Nenhuma mensagem ainda. Mande um oi para ' + opcoes.nomeOutro.split(' ')[0] + '.';
      rolarParaFim();
      return S.marcarLidas(vinculoId).then(avisarLidas);
    }).catch(function (err) {
      vazio.textContent = err.message;
    });

    return {
      focar: function () { campo.focus(); },
      destruir: function () { limparAnexo(); document.removeEventListener('pf:mensagem', aoReceber); }
    };
  }

  PF.conversa = { montar: montar, ouvir: ouvir };
})();
