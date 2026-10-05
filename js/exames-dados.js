/* ==========================================================================
   PontoFit — exames-dados.js
   Catálogo de marcadores de exames de sangue: nome, unidade e uma referência
   de ADULTO sugerida (por sexo e, quando muda muito, por idade). Os valores
   variam entre laboratórios e métodos: o paciente sempre pode ajustar para
   copiar exatamente o que está no laudo dele.
   ref(sexo, idade) → [mín, máx] (null = sem limite daquele lado) ou null.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  function porSexo(m, f) { return function (sexo) { return sexo === 'F' ? f : sexo === 'M' ? m : null; }; }
  function fixa(min, max) { return function () { return [min, max]; }; }

  var MARCADORES = [
    // Hormônios
    { id: 'testosterona_total', grupo: 'Hormônios', nome: 'Testosterona total', unidade: 'ng/dL', ref: porSexo([240, 870], [14, 53]) },
    { id: 'testosterona_livre', grupo: 'Hormônios', nome: 'Testosterona livre', unidade: 'ng/dL',
      ref: function (sexo, idade) {
        if (sexo === 'F') return [0.18, 2.34];
        if (sexo !== 'M') return null;
        if (idade != null && idade > 60) return [1.86, 19];
        if (idade != null && idade > 40) return [2.67, 18.3];
        return [3.4, 24.6];
      } },
    { id: 'testosterona_biodisponivel', grupo: 'Hormônios', nome: 'Testosterona biodisponível', unidade: 'ng/dL',
      ref: function (sexo, idade) {
        if (sexo === 'F') return [4.4, 48];
        if (sexo !== 'M') return null;
        if (idade != null && idade > 60) return [43, 424];
        if (idade != null && idade > 40) return [58, 436];
        return [82, 626];
      } },
    { id: 'estradiol', grupo: 'Hormônios', nome: 'Estradiol', unidade: 'pg/mL', ref: porSexo([11, 44], null) },
    { id: 'shbg', grupo: 'Hormônios', nome: 'SHBG', unidade: 'nmol/L', ref: porSexo([18, 54], [26, 110]) },
    { id: 'lh', grupo: 'Hormônios', nome: 'LH', unidade: 'mUI/mL', ref: porSexo([1.7, 8.6], null) },
    { id: 'fsh', grupo: 'Hormônios', nome: 'FSH', unidade: 'mUI/mL', ref: porSexo([1.5, 12.4], null) },
    { id: 'prolactina', grupo: 'Hormônios', nome: 'Prolactina', unidade: 'ng/mL', ref: porSexo([4, 15.2], [4.8, 23.3]) },
    { id: 'psa_total', grupo: 'Hormônios', nome: 'PSA total', unidade: 'ng/mL', ref: porSexo([null, 4], null) },
    { id: 'cortisol', grupo: 'Hormônios', nome: 'Cortisol (manhã)', unidade: 'µg/dL', ref: fixa(6.2, 19.4) },
    // Tireoide
    { id: 'tsh', grupo: 'Tireoide', nome: 'TSH', unidade: 'µUI/mL', ref: fixa(0.35, 4.94) },
    { id: 't4_livre', grupo: 'Tireoide', nome: 'T4 livre', unidade: 'ng/dL', ref: fixa(0.7, 1.48) },
    { id: 't3_total', grupo: 'Tireoide', nome: 'T3 total', unidade: 'ng/dL', ref: fixa(80, 200) },
    // Perfil lipídico
    { id: 'colesterol_total', grupo: 'Perfil lipídico', nome: 'Colesterol total', unidade: 'mg/dL', ref: fixa(null, 190) },
    { id: 'hdl', grupo: 'Perfil lipídico', nome: 'Colesterol HDL', unidade: 'mg/dL', ref: fixa(40, null) },
    { id: 'ldl', grupo: 'Perfil lipídico', nome: 'Colesterol LDL', unidade: 'mg/dL', ref: fixa(null, 115) },
    { id: 'vldl', grupo: 'Perfil lipídico', nome: 'Colesterol VLDL', unidade: 'mg/dL', ref: function () { return null; } },
    { id: 'nao_hdl', grupo: 'Perfil lipídico', nome: 'Colesterol não HDL', unidade: 'mg/dL', ref: fixa(null, 145) },
    { id: 'triglicerides', grupo: 'Perfil lipídico', nome: 'Triglicérides', unidade: 'mg/dL', ref: fixa(null, 150) },
    // Glicose
    { id: 'glicose', grupo: 'Glicose', nome: 'Glicose em jejum', unidade: 'mg/dL', ref: fixa(70, 99) },
    { id: 'hba1c', grupo: 'Glicose', nome: 'Hemoglobina glicada (HbA1c)', unidade: '%', ref: fixa(null, 5.7) },
    { id: 'insulina', grupo: 'Glicose', nome: 'Insulina em jejum', unidade: 'µUI/mL', ref: fixa(2.6, 24.9) },
    // Hemograma
    { id: 'hemoglobina', grupo: 'Hemograma', nome: 'Hemoglobina', unidade: 'g/dL', ref: porSexo([13.5, 17.5], [12, 15.5]) },
    { id: 'hematocrito', grupo: 'Hemograma', nome: 'Hematócrito', unidade: '%', ref: porSexo([39, 50], [35, 45]) },
    { id: 'plaquetas', grupo: 'Hemograma', nome: 'Plaquetas', unidade: 'mil/mm³', ref: fixa(150, 450) },
    { id: 'leucocitos', grupo: 'Hemograma', nome: 'Leucócitos', unidade: '/mm³', ref: fixa(4000, 11000) },
    { id: 'ferritina', grupo: 'Hemograma', nome: 'Ferritina', unidade: 'ng/mL', ref: porSexo([30, 400], [13, 150]) },
    // Fígado e rins
    { id: 'tgo', grupo: 'Fígado e rins', nome: 'TGO (AST)', unidade: 'U/L', ref: fixa(null, 40) },
    { id: 'tgp', grupo: 'Fígado e rins', nome: 'TGP (ALT)', unidade: 'U/L', ref: fixa(null, 41) },
    { id: 'ggt', grupo: 'Fígado e rins', nome: 'Gama GT', unidade: 'U/L', ref: porSexo([null, 60], [null, 40]) },
    { id: 'creatinina', grupo: 'Fígado e rins', nome: 'Creatinina', unidade: 'mg/dL', ref: porSexo([0.7, 1.3], [0.6, 1.1]) },
    { id: 'ureia', grupo: 'Fígado e rins', nome: 'Ureia', unidade: 'mg/dL', ref: fixa(15, 45) },
    { id: 'acido_urico', grupo: 'Fígado e rins', nome: 'Ácido úrico', unidade: 'mg/dL', ref: porSexo([3.4, 7], [2.4, 6]) },
    // Vitaminas
    { id: 'vitamina_d', grupo: 'Vitaminas e minerais', nome: 'Vitamina D (25-OH)', unidade: 'ng/mL', ref: fixa(30, 100) },
    { id: 'vitamina_b12', grupo: 'Vitaminas e minerais', nome: 'Vitamina B12', unidade: 'pg/mL', ref: fixa(200, 900) },
    { id: 'ferro', grupo: 'Vitaminas e minerais', nome: 'Ferro sérico', unidade: 'µg/dL', ref: porSexo([65, 175], [50, 170]) },
    { id: 'magnesio', grupo: 'Vitaminas e minerais', nome: 'Magnésio', unidade: 'mg/dL', ref: fixa(1.6, 2.6) },
    { id: 'zinco', grupo: 'Vitaminas e minerais', nome: 'Zinco', unidade: 'µg/dL', ref: fixa(70, 120) }
  ];

  /** Atalhos para preencher vários marcadores de uma vez. */
  var PACOTES = [
    { nome: 'Hormonal', marcadores: ['testosterona_total', 'testosterona_livre', 'testosterona_biodisponivel', 'estradiol', 'shbg', 'psa_total', 'hematocrito'] },
    { nome: 'Tireoide', marcadores: ['tsh', 't4_livre'] },
    { nome: 'Perfil lipídico', marcadores: ['colesterol_total', 'hdl', 'ldl', 'vldl', 'nao_hdl', 'triglicerides'] },
    { nome: 'Glicose', marcadores: ['glicose', 'hba1c'] },
    { nome: 'Fígado e rins', marcadores: ['tgo', 'tgp', 'creatinina', 'ureia'] }
  ];

  var porId = {};
  MARCADORES.forEach(function (m) { porId[m.id] = m; });

  PF.exames = PF.exames || {};
  PF.exames.MARCADORES = MARCADORES;
  PF.exames.PACOTES = PACOTES;
  PF.exames.marcador = function (id) { return porId[id] || null; };

  /** Situação do valor pela referência: 'abaixo' | 'normal' | 'acima' | null (sem referência). */
  PF.exames.situacao = function (valor, min, max) {
    if (valor == null || (min == null && max == null)) return null;
    if (min != null && valor < min) return 'abaixo';
    if (max != null && valor > max) return 'acima';
    return 'normal';
  };

  /** Texto da referência: '240 a 870', 'até 190', 'acima de 40'. */
  PF.exames.textoRef = function (min, max, unidade) {
    var n = function (v) { return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 }); };
    var u = unidade ? ' ' + unidade : '';
    if (min != null && max != null) return n(min) + ' a ' + n(max) + u;
    if (max != null) return 'até ' + n(max) + u;
    if (min != null) return 'acima de ' + n(min) + u;
    return 'sem referência';
  };
})();
