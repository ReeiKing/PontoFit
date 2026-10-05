/* ==========================================================================
   PontoFit — vinculos.js
   Minha ficha → "Profissionais que me acompanham": o paciente escolhe o que
   cada profissional pode ver e pode remover o acesso (/api/vinculos).
   ========================================================================== */
(function () {
  'use strict';

  var PF = window.PF;
  var S = PF.storage;
  var caixa = document.querySelector('[data-vinculos]');
  if (!caixa || !S) return;
  var lista = caixa.querySelector('[data-vinculos-lista]');

  var CAMPOS = [['peso', 'Peso e meta'], ['agua', 'Água'], ['medicamentos', 'Medicamentos'], ['ficha', 'Ficha'], ['gestacao', 'Gestação']];
  var carregado = false;

  function el(tag, classe, texto) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function render(profissionais) {
    lista.textContent = '';
    caixa.hidden = !profissionais.length;
    profissionais.forEach(function (p) {
      var li = el('li', 'vinculo');
      li.dataset.id = p.id;
      var topo = el('div', 'vinculo__topo');
      var quem = el('div', 'vinculo__quem');
      quem.appendChild(el('strong', null, p.nome));
      quem.appendChild(el('span', 'texto-sm texto-sec', [p.profissaoNome, p.registro, p.empresa].filter(Boolean).join(' · ')));
      topo.appendChild(quem);
      var remover = el('button', 'btn btn--sm btn--fantasma vinculo__remover');
      remover.type = 'button';
      remover.dataset.remover = '';
      remover.appendChild(el('span', null, 'Remover acesso'));
      topo.appendChild(remover);
      li.appendChild(topo);

      var grupo = el('fieldset', 'vinculo__campos');
      grupo.appendChild(el('legend', 'sr-only', 'O que ' + p.nome + ' pode ver'));
      CAMPOS.forEach(function (c) {
        var label = el('label', 'chip');
        var input = el('input');
        input.type = 'checkbox';
        input.name = c[0];
        input.checked = !!p.compartilha[c[0]];
        label.appendChild(input);
        label.appendChild(el('span', null, c[1]));
        grupo.appendChild(label);
      });
      li.appendChild(grupo);
      lista.appendChild(li);
    });
  }

  async function carregar() {
    try {
      var r = await S.getVinculos();
      carregado = true;
      render(r.profissionais || []);
    } catch (e) { /* sem rede: o cartão só não aparece */ }
  }

  lista.addEventListener('change', async function (e) {
    var input = e.target;
    var li = input.closest('[data-id]');
    if (!li) return;
    var compartilha = {};
    li.querySelectorAll('input[type="checkbox"]').forEach(function (i) { compartilha[i.name] = i.checked; });
    if (!Object.keys(compartilha).some(function (k) { return compartilha[k]; })) {
      input.checked = true;
      PF.toast('Deixe pelo menos uma opção marcada, ou use "Remover acesso".', { tipo: 'aviso' });
      return;
    }
    input.disabled = true;
    try {
      await S.atualizarVinculo(li.dataset.id, compartilha);
      PF.toast('Compartilhamento atualizado.');
    } catch (err) {
      input.checked = !input.checked;
      PF.toast(err.message, { tipo: 'erro' });
    } finally {
      input.disabled = false;
    }
  });

  lista.addEventListener('click', async function (e) {
    var botao = e.target.closest('[data-remover]');
    if (!botao) return;
    var li = botao.closest('[data-id]');
    var nome = li.querySelector('strong').textContent;
    if (!confirm('Remover o acesso de ' + nome + '? Essa pessoa deixa de ver seus dados na hora.')) return;
    PF.setLoading(botao, true, 'Removendo…');
    try {
      var r = await S.revogarVinculo(li.dataset.id);
      render(r.profissionais || []);
      PF.toast(nome + ' não tem mais acesso aos seus dados.');
    } catch (err) {
      PF.setLoading(botao, false);
      PF.toast(err.message, { tipo: 'erro' });
    }
  });

  document.addEventListener('pf:secao', function (e) {
    if (e.detail.secao === 'ficha' && !carregado) carregar();
  });
})();
