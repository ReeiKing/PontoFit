/* ==========================================================================
   PontoFit — nutrientes-dados.js
   Guia de vitaminas e minerais (estático, educativo).
   Foco nas fontes naturais. Suplementos, inclusive manipulados, só com
   prescrição: o guia explica quando costumam ser indicados, sem doses.
   ingredientes: palavras para achar receitas do livro com esses alimentos.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  PF.nutrientes = [
    {
      id: 'ferro',
      nome: 'Ferro',
      cor: 'vermelho',
      resumo: 'Leva oxigênio para o corpo todo.',
      paraQue: 'Faz parte da hemoglobina, que transporta o oxigênio no sangue. Com pouco ferro, vem o cansaço e a anemia.',
      alimentos: ['Feijão', 'Lentilha', 'Grão-de-bico', 'Carne vermelha magra', 'Frango', 'Ovos', 'Couve e espinafre', 'Sementes de abóbora'],
      dica: 'Combine com vitamina C na mesma refeição (laranja, acerola, limão) e evite café e chá logo depois de comer: eles atrapalham a absorção.',
      falta: 'Cansaço, palidez, falta de ar, unhas fracas, queda de cabelo.',
      suplementar: 'Na gestação (faz parte do pré-natal), em anemia diagnosticada por exame e em menstruações muito intensas.',
      gestacao: 'A necessidade quase dobra na gravidez. O obstetra costuma prescrever o suplemento.',
      ingredientes: ['feijao', 'lentilha', 'grao-de-bico', 'patinho', 'acem', 'carne', 'espinafre', 'couve']
    },
    {
      id: 'acido-folico',
      nome: 'Ácido fólico (vitamina B9)',
      cor: 'verde',
      resumo: 'Essencial para a formação das células e do bebê.',
      paraQue: 'Participa da formação de células novas e do sistema nervoso do bebê nas primeiras semanas de gestação.',
      alimentos: ['Folhas verde-escuras', 'Brócolis', 'Feijão', 'Lentilha', 'Grão-de-bico', 'Abacate', 'Laranja'],
      dica: 'Cozinhe as verduras rapidamente ou no vapor: o folato se perde com o cozimento longo.',
      falta: 'Anemia, cansaço, feridas na boca. Na gestação, aumenta o risco de malformações do tubo neural.',
      suplementar: 'Para quem planeja engravidar e no início da gestação, por indicação médica.',
      gestacao: 'O ideal é começar antes de engravidar e manter pelo menos até o fim do primeiro trimestre, conforme o médico orientar.',
      ingredientes: ['espinafre', 'couve', 'brocolis', 'feijao', 'lentilha', 'grao-de-bico', 'abacate', 'laranja']
    },
    {
      id: 'b12',
      nome: 'Vitamina B12',
      cor: 'roxo',
      resumo: 'Cuida dos nervos e da produção do sangue.',
      paraQue: 'Mantém o sistema nervoso saudável e ajuda a formar as células do sangue.',
      alimentos: ['Carnes', 'Peixes', 'Ovos', 'Leite', 'Iogurte', 'Queijos'],
      dica: 'Só existe naturalmente em alimentos de origem animal. Quem não come nenhum precisa de acompanhamento.',
      falta: 'Cansaço, formigamento nas mãos e pés, falhas de memória, anemia.',
      suplementar: 'Veganos e vegetarianos estritos, pessoas acima de 50 anos e quem usa por muito tempo metformina ou remédios para o estômago (como omeprazol), sempre com exame.',
      gestacao: 'Importante para o desenvolvimento do sistema nervoso do bebê.',
      ingredientes: ['ovo', 'ovos', 'frango', 'tilapia', 'atum', 'sardinha', 'iogurte', 'queijo', 'leite', 'patinho']
    },
    {
      id: 'vitamina-d',
      nome: 'Vitamina D',
      cor: 'laranja',
      resumo: 'Fortalece ossos e imunidade.',
      paraQue: 'Ajuda o corpo a absorver o cálcio e manter os ossos fortes. Também participa da imunidade.',
      alimentos: ['Sol (o corpo produz com a luz solar)', 'Sardinha', 'Salmão', 'Gema de ovo', 'Leite e derivados'],
      dica: 'Exposição solar moderada, no horário que seu médico ou dermatologista orientar, é a principal fonte.',
      falta: 'Dores nos ossos e músculos, fraqueza, mais risco de fraturas.',
      suplementar: 'Quando o exame de sangue mostra nível baixo. Excesso é tóxico: nunca tome doses altas por conta própria.',
      gestacao: 'O obstetra avalia o nível no pré-natal e indica suplemento se precisar.',
      ingredientes: ['ovo', 'ovos', 'sardinha', 'salmao', 'atum', 'leite', 'iogurte']
    },
    {
      id: 'calcio',
      nome: 'Cálcio',
      cor: 'agua',
      resumo: 'Ossos, dentes e músculos fortes.',
      paraQue: 'Forma ossos e dentes e é necessário para os músculos (inclusive o coração) funcionarem.',
      alimentos: ['Leite', 'Iogurte', 'Queijos', 'Sardinha', 'Brócolis', 'Couve', 'Gergelim e tahine'],
      dica: 'Se não consome leite, invista em sardinha, gergelim, folhas verdes e bebidas vegetais enriquecidas.',
      falta: 'Câimbras, unhas fracas e, com o tempo, perda de massa óssea.',
      suplementar: 'Por indicação médica, por exemplo na menopausa ou quando a alimentação não alcança a necessidade.',
      gestacao: 'O bebê usa o cálcio da mãe para formar os ossos. Capriche nas fontes do dia a dia.',
      ingredientes: ['leite', 'iogurte', 'queijo', 'ricota', 'couve', 'brocolis', 'gergelim', 'tahine', 'sardinha']
    },
    {
      id: 'omega-3',
      nome: 'Ômega-3',
      cor: 'agua',
      resumo: 'Coração e cérebro.',
      paraQue: 'Gordura boa que protege o coração e ajuda no funcionamento do cérebro e da visão.',
      alimentos: ['Sardinha', 'Salmão', 'Linhaça', 'Chia', 'Nozes'],
      dica: 'Linhaça precisa estar moída (ou triturada na hora) para o corpo aproveitar.',
      falta: 'Não costuma dar sintomas claros, mas a falta prolongada não é boa para coração e cérebro.',
      suplementar: 'Em situações específicas, por indicação médica ou nutricional.',
      gestacao: 'Ajuda no desenvolvimento do cérebro e dos olhos do bebê. Prefira peixes com pouco mercúrio, como sardinha e salmão.',
      ingredientes: ['linhaca', 'chia', 'nozes', 'sardinha', 'salmao']
    },
    {
      id: 'magnesio',
      nome: 'Magnésio',
      cor: 'verde',
      resumo: 'Músculos, nervos e sono.',
      paraQue: 'Participa de centenas de reações no corpo: contração muscular, nervos, controle do açúcar e da pressão.',
      alimentos: ['Castanhas', 'Sementes de abóbora', 'Aveia', 'Feijão', 'Banana', 'Cacau', 'Folhas verdes'],
      dica: 'Um punhado de castanhas e uma porção de feijão por dia já ajudam bastante.',
      falta: 'Câimbras, tremores, cansaço, irritabilidade.',
      suplementar: 'Por indicação médica, em casos de deficiência confirmada ou uso de alguns remédios.',
      gestacao: 'Câimbras são comuns na gravidez. Converse com o obstetra antes de suplementar.',
      ingredientes: ['castanha', 'castanhas', 'aveia', 'feijao', 'banana', 'cacau', 'sementes', 'amendoim']
    },
    {
      id: 'zinco',
      nome: 'Zinco',
      cor: 'roxo',
      resumo: 'Imunidade e cicatrização.',
      paraQue: 'Fortalece a imunidade, ajuda na cicatrização e no crescimento.',
      alimentos: ['Carnes', 'Ovos', 'Feijão', 'Grão-de-bico', 'Castanhas', 'Sementes de abóbora'],
      dica: 'Deixar feijão e grão-de-bico de molho antes de cozinhar melhora a absorção.',
      falta: 'Infecções frequentes, feridas que demoram a cicatrizar, queda de cabelo, perda do paladar.',
      suplementar: 'Só com deficiência confirmada. Excesso atrapalha a absorção de cobre.',
      gestacao: 'Necessário para o crescimento do bebê. Uma alimentação variada costuma suprir.',
      ingredientes: ['patinho', 'carne', 'ovo', 'ovos', 'feijao', 'grao-de-bico', 'castanha', 'castanhas']
    },
    {
      id: 'vitamina-c',
      nome: 'Vitamina C',
      cor: 'laranja',
      resumo: 'Imunidade e absorção de ferro.',
      paraQue: 'Antioxidante, ajuda na imunidade, na formação de colágeno e na absorção do ferro dos vegetais.',
      alimentos: ['Acerola', 'Laranja', 'Limão', 'Goiaba', 'Morango', 'Kiwi', 'Pimentão', 'Abacaxi'],
      dica: 'Ela se perde com o calor e o tempo: prefira frutas frescas e sucos feitos na hora.',
      falta: 'Gengivas sangrando, cansaço, cicatrização lenta.',
      suplementar: 'Raramente necessário com uma alimentação com frutas. Doses muito altas podem causar desconforto.',
      gestacao: 'Ajuda a absorver o ferro, que a gestante precisa em dobro.',
      ingredientes: ['acerola', 'laranja', 'limao', 'morango', 'pimentao', 'abacaxi', 'maracuja']
    },
    {
      id: 'vitamina-a',
      nome: 'Vitamina A',
      cor: 'laranja',
      resumo: 'Visão, pele e imunidade.',
      paraQue: 'Mantém a visão (principalmente no escuro), a pele e as mucosas saudáveis e participa da imunidade.',
      alimentos: ['Cenoura', 'Abóbora', 'Batata-doce', 'Manga', 'Mamão', 'Folhas verde-escuras'],
      dica: 'Os vegetais alaranjados e verde-escuros trazem betacaroteno, que o corpo transforma em vitamina A conforme precisa.',
      falta: 'Dificuldade de enxergar à noite, pele e olhos secos.',
      suplementar: 'Só com orientação: o excesso da forma pronta (retinol) é tóxico.',
      gestacao: 'Evite suplementos com retinol em doses altas e fígado em excesso: podem causar malformações. As frutas e legumes são seguros.',
      ingredientes: ['cenoura', 'abobora', 'batata-doce', 'manga', 'mamao', 'espinafre', 'couve']
    },
    {
      id: 'iodo',
      nome: 'Iodo',
      cor: 'agua',
      resumo: 'Faz a tireoide funcionar.',
      paraQue: 'Necessário para produzir os hormônios da tireoide, que controlam o metabolismo.',
      alimentos: ['Sal iodado (em pouca quantidade)', 'Peixes', 'Ovos', 'Leite e derivados'],
      dica: 'O sal de cozinha no Brasil já é iodado. Não precisa aumentar o sal: um pouco já basta.',
      falta: 'Alterações da tireoide, cansaço, ganho de peso, bócio.',
      suplementar: 'Por indicação médica, principalmente na gestação e amamentação.',
      gestacao: 'A necessidade aumenta. O obstetra avalia se precisa complementar.',
      ingredientes: ['tilapia', 'atum', 'sardinha', 'ovo', 'ovos', 'iogurte', 'leite']
    }
  ];

  /* Orientação sobre suplementos e manipulados (sem indicar fórmulas). */
  PF.nutrientesOrientacoes = [
    { titulo: 'Comida em primeiro lugar', texto: 'Uma alimentação variada supre a maior parte das vitaminas e minerais. O suplemento complementa, não substitui.' },
    { titulo: 'Exame antes de suplementar', texto: 'Vitamina D, ferro, B12 e outros devem ser suplementados com base em exames de sangue e na avaliação de um profissional.' },
    { titulo: 'Manipulados só com prescrição', texto: 'Fórmulas manipuladas são feitas sob medida para cada pessoa. Não use a fórmula de outra pessoa nem compre "kits" prontos sem receita.' },
    { titulo: 'Excesso também faz mal', texto: 'Vitaminas A, D e E e minerais como ferro e zinco se acumulam no corpo. Doses altas sem acompanhamento podem intoxicar.' },
    { titulo: 'Gestantes e quem tenta engravidar', texto: 'Ácido fólico e ferro costumam fazer parte do pré-natal. Siga a prescrição do obstetra e evite polivitamínicos por conta própria.' },
    { titulo: 'Informe tudo ao médico', texto: 'Suplementos podem interagir com medicamentos. Leve a lista do que você toma às consultas.' }
  ];
})();
