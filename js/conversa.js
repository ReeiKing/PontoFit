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
    var enviar = el('button', 'btn conversa__enviar');
    enviar.type = 'submit';
    enviar.setAttribute('aria-label', 'Enviar mensagem');
    enviar.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>');
    form.appendChild(rotulo);
    form.appendChild(campo);
    form.appendChild(enviar);
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
      li.appendChild(el('p', 'conversa__texto', m.texto));
      li.appendChild(el('span', 'conversa__hora', hora(m.criadoEm)));
      lista.appendChild(li);
    }

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
      if (!texto) return;
      enviar.disabled = true;
      try {
        var m = await S.enviarMensagem(vinculoId, texto);
        campo.value = '';
        ajustarAltura();
        adicionar(m);
        rolarParaFim();
      } catch (err) {
        erro.textContent = err.message;
      } finally {
        enviar.disabled = false;
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
      destruir: function () { document.removeEventListener('pf:mensagem', aoReceber); }
    };
  }

  PF.conversa = { montar: montar, ouvir: ouvir };
})();
