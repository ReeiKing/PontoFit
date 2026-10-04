/* ==========================================================================
   PontoFit — receitas-dados.js
   Conteúdo do livro de receitas (estático, igual para todo mundo).
   Não é dado do paciente, por isso não passa pelo storage.js.
   Para incluir uma receita, acrescente um objeto na lista.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  PF.receitasCategorias = [
    { id: 'cafe', nome: 'Café da manhã', descricao: 'Para começar o dia com energia e saciedade.' },
    { id: 'salgadas', nome: 'Almoço e jantar', descricao: 'Refeições do dia a dia, com legumes no prato.' },
    { id: 'lanches', nome: 'Lanches', descricao: 'Para a tarde, o trabalho ou a lancheira.' },
    { id: 'doces', nome: 'Doces', descricao: 'Sobremesas com fruta e pouco ou nenhum açúcar.' },
    { id: 'sucos', nome: 'Sucos', descricao: 'Para acompanhar a refeição ou o lanche da tarde.' },
    { id: 'vitaminas', nome: 'Vitaminas', descricao: 'Batidas no liquidificador, boas para o café da manhã.' }
  ];

  // Etiquetas para filtrar. "rapida" é calculada pelo tempo (até 15 min).
  PF.receitasEtiquetas = [
    { id: 'rapida', nome: 'Até 15 min' },
    { id: 'proteica', nome: 'Proteica' },
    { id: 'low-carb', nome: 'Low carb' },
    { id: 'vegetariana', nome: 'Vegetariana' },
    { id: 'sem-lactose', nome: 'Sem lactose' },
    { id: 'sem-gluten', nome: 'Sem glúten' }
  ];

  PF.receitas = [
    /* ---------------- Salgadas ---------------- */
    {
      id: 'omelete-espinafre',
      categoria: 'salgadas',
      titulo: 'Omelete de espinafre com queijo branco',
      tempo: '10 min',
      porcoes: '1 porção',
      tags: ['proteica', 'low-carb', 'vegetariana', 'sem-gluten'],
      ingredientes: [
        '2 ovos',
        '1 xícara de folhas de espinafre picadas',
        '2 colheres (sopa) de queijo branco ralado',
        '1/4 de cebola picada',
        '1 colher (chá) de azeite',
        'Sal e pimenta a gosto'
      ],
      preparo: [
        'Bata os ovos com uma pitada de sal e pimenta até ficarem bem misturados.',
        'Aqueça o azeite numa frigideira antiaderente e refogue a cebola por 2 minutos.',
        'Junte o espinafre e mexa até murchar, o que leva menos de um minuto.',
        'Despeje os ovos por cima, espalhe o queijo e cozinhe em fogo baixo com a frigideira tampada.',
        'Quando a parte de cima firmar, dobre ao meio e sirva.'
      ],
      dica: 'Sobrou legume do almoço? Abobrinha, tomate e brócolis também funcionam no lugar do espinafre.'
    },
    {
      id: 'frango-legumes',
      categoria: 'salgadas',
      titulo: 'Frango na frigideira com legumes',
      tempo: '25 min',
      porcoes: '2 porções',
      tags: ['proteica', 'low-carb', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '300 g de peito de frango em cubos',
        '1 abobrinha em rodelas cortadas ao meio',
        '1 cenoura em rodelas finas',
        '1/2 pimentão vermelho em tiras',
        '1 dente de alho picado',
        'Suco de 1/2 limão',
        '1 colher (sopa) de azeite',
        'Sal, páprica e cheiro verde a gosto'
      ],
      preparo: [
        'Tempere o frango com sal, páprica, alho e o suco de limão e deixe descansar enquanto corta os legumes.',
        'Aqueça o azeite numa frigideira grande e doure o frango em fogo alto, sem mexer o tempo todo, por uns 8 minutos.',
        'Tire o frango, coloque a cenoura e deixe 3 minutos. Depois entram a abobrinha e o pimentão.',
        'Volte o frango para a frigideira, acerte o sal e cozinhe mais 2 minutos.',
        'Finalize com cheiro verde e sirva com arroz integral ou salada.'
      ],
      dica: 'Os legumes ficam mais gostosos ainda um pouco firmes. Se cozinhar demais, eles soltam água e o frango perde a cor.'
    },
    {
      id: 'escondidinho-mandioca',
      categoria: 'salgadas',
      titulo: 'Escondidinho de mandioca com carne moída',
      tempo: '50 min',
      porcoes: '4 porções',
      tags: ['proteica', 'sem-gluten'],
      ingredientes: [
        '500 g de mandioca descascada',
        '400 g de patinho moído',
        '1 cebola picada',
        '2 tomates picados',
        '1 dente de alho',
        '1/2 xícara de leite',
        '3 colheres (sopa) de queijo ralado',
        'Sal, pimenta e salsinha a gosto'
      ],
      preparo: [
        'Cozinhe a mandioca em água com sal até ficar bem macia. Retire os fios do meio e amasse ainda quente com o leite.',
        'Enquanto isso, refogue a cebola e o alho, junte a carne e deixe dourar.',
        'Acrescente os tomates, tempere e cozinhe até formar um molho grosso.',
        'Num refratário, coloque a carne, cubra com o purê de mandioca e espalhe o queijo.',
        'Leve ao forno a 200 °C por 15 minutos, até dourar por cima.'
      ],
      dica: 'Dá para trocar metade da mandioca por abóbora cabotiá. O purê fica mais leve e com uma cor bonita.'
    },
    {
      id: 'salada-lentilha',
      categoria: 'salgadas',
      titulo: 'Salada morna de lentilha com tomate e pepino',
      tempo: '30 min',
      porcoes: '2 porções',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de lentilha',
        '1 tomate em cubos',
        '1 pepino em cubos',
        '1/4 de cebola roxa fatiada fina',
        'Suco de 1 limão',
        '2 colheres (sopa) de azeite',
        'Sal, hortelã e salsinha a gosto'
      ],
      preparo: [
        'Cozinhe a lentilha em água por 15 a 20 minutos. Ela deve ficar macia, mas inteira.',
        'Escorra e tempere ainda morna com azeite, limão e sal.',
        'Misture o tomate, o pepino e a cebola.',
        'Finalize com as ervas picadas na hora de servir.'
      ],
      dica: 'Na geladeira ela aguenta dois dias, e no segundo dia o tempero fica ainda melhor.'
    },
    {
      id: 'sopa-abobora',
      categoria: 'salgadas',
      titulo: 'Sopa de abóbora com gengibre',
      tempo: '35 min',
      porcoes: '4 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '800 g de abóbora cabotiá em cubos',
        '1 cebola picada',
        '2 dentes de alho',
        '1 colher (chá) de gengibre ralado',
        '1 litro de água quente',
        '1 colher (sopa) de azeite',
        'Sal e cheiro verde a gosto'
      ],
      preparo: [
        'Refogue a cebola e o alho no azeite até ficarem transparentes.',
        'Junte a abóbora e o gengibre e mexa por 2 minutos.',
        'Cubra com a água quente, tempere com sal e cozinhe até a abóbora desmanchar, cerca de 20 minutos.',
        'Bata no liquidificador com cuidado, porque está quente, e volte para a panela para acertar o ponto.',
        'Sirva com cheiro verde por cima.'
      ],
      dica: 'Uma colher de sementes de abóbora torradas por cima dá crocância e não dá trabalho nenhum.'
    },

    /* ---------------- Doces ---------------- */
    {
      id: 'mousse-cacau-abacate',
      categoria: 'doces',
      titulo: 'Mousse de cacau com abacate',
      tempo: '10 min',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '1/2 abacate maduro',
        '2 colheres (sopa) de cacau em pó',
        '1 banana madura',
        '2 colheres (sopa) de leite',
        'Gotas de essência de baunilha (opcional)'
      ],
      preparo: [
        'Bata todos os ingredientes no processador ou no liquidificador até ficar liso.',
        'Prove e, se quiser mais doce, junte um pouco mais de banana.',
        'Leve à geladeira por pelo menos 30 minutos antes de servir.'
      ],
      dica: 'Ninguém percebe o abacate. Ele só deixa a textura cremosa, igual à da mousse tradicional.'
    },
    {
      id: 'banana-assada',
      categoria: 'doces',
      titulo: 'Banana assada com canela e aveia',
      tempo: '15 min',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-lactose'],
      ingredientes: [
        '2 bananas nanicas',
        '1 colher (chá) de canela em pó',
        '2 colheres (sopa) de aveia em flocos',
        '1 colher (sopa) de castanhas picadas'
      ],
      preparo: [
        'Corte as bananas ao meio no sentido do comprimento e coloque numa assadeira.',
        'Polvilhe a canela, a aveia e as castanhas.',
        'Asse a 200 °C por 10 minutos, ou até a banana ficar dourada e macia.'
      ],
      dica: 'Na air fryer fica pronta em 8 minutos. Com uma colher de iogurte natural por cima, vira sobremesa de domingo.'
    },
    {
      id: 'bolo-caneca',
      categoria: 'doces',
      titulo: 'Bolo de caneca de banana e aveia',
      tempo: '5 min',
      porcoes: '1 porção',
      tags: ['vegetariana', 'sem-lactose'],
      ingredientes: [
        '1 banana madura amassada',
        '1 ovo',
        '3 colheres (sopa) de farelo de aveia',
        '1 colher (sopa) de cacau em pó',
        '1/2 colher (chá) de fermento em pó'
      ],
      preparo: [
        'Misture a banana e o ovo numa caneca grande que possa ir ao micro-ondas.',
        'Junte a aveia e o cacau e mexa bem. Por último, o fermento.',
        'Leve ao micro-ondas por 2 minutos e 30 segundos. Espere esfriar um pouco antes de comer.'
      ],
      dica: 'Use caneca maior do que parece necessário: o bolo cresce bastante enquanto assa.'
    },
    {
      id: 'pudim-chia-manga',
      categoria: 'doces',
      titulo: 'Pudim de chia com manga',
      tempo: '10 min + 4 h de geladeira',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '4 colheres (sopa) de chia',
        '1 xícara de leite ou bebida vegetal',
        '1 manga madura',
        '1 colher (chá) de mel (opcional)'
      ],
      preparo: [
        'Misture a chia com o leite e o mel, espere 5 minutos e mexa de novo para não empelotar.',
        'Tampe e deixe na geladeira por 4 horas, ou de um dia para o outro.',
        'Bata metade da manga até virar um creme e pique o resto em cubos.',
        'Monte em copos: creme de manga, pudim de chia e manga em cubos por cima.'
      ],
      dica: 'Preparado à noite, vira café da manhã pronto no dia seguinte.'
    },

    /* ---------------- Sucos ---------------- */
    {
      id: 'suco-verde',
      categoria: 'sucos',
      titulo: 'Suco verde de couve, limão e gengibre',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 folhas de couve sem o talo grosso',
        'Suco de 1 limão',
        '1 maçã sem sementes',
        '1 pedaço pequeno de gengibre',
        '400 ml de água gelada',
        'Folhas de hortelã a gosto'
      ],
      preparo: [
        'Bata tudo no liquidificador por cerca de 1 minuto.',
        'Se preferir mais fino, passe por uma peneira.',
        'Sirva na hora, antes de a cor começar a escurecer.'
      ],
      dica: 'A maçã é que tira o amargor da couve. Se achar forte, aumente a maçã antes de pensar em açúcar.'
    },
    {
      id: 'suco-melancia',
      categoria: 'sucos',
      titulo: 'Suco de melancia com hortelã',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '3 xícaras de melancia em cubos',
        '6 folhas de hortelã',
        'Suco de 1/2 limão',
        'Gelo a gosto'
      ],
      preparo: [
        'Bata a melancia com a hortelã e o limão. Não precisa de água, a fruta já tem bastante.',
        'Sirva com gelo.'
      ],
      dica: 'Congele cubos de melancia e use no lugar do gelo. O suco fica gelado sem ficar aguado.'
    },
    {
      id: 'suco-laranja-cenoura',
      categoria: 'sucos',
      titulo: 'Suco de laranja, cenoura e beterraba',
      tempo: '10 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        'Suco de 4 laranjas',
        '1 cenoura pequena picada',
        '1/2 beterraba pequena picada',
        '1 pedaço de gengibre (opcional)'
      ],
      preparo: [
        'Bata a cenoura e a beterraba com o suco de laranja até ficar homogêneo.',
        'Coe se quiser uma textura mais leve.',
        'Sirva gelado.'
      ],
      dica: 'Comece com pouca beterraba. Ela tem gosto forte, e meia unidade já dá a cor.'
    },
    {
      id: 'limonada-morango',
      categoria: 'sucos',
      titulo: 'Limonada com morango',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 limão taiti com casca, lavado e cortado em 4',
        '6 morangos',
        '500 ml de água gelada',
        'Gelo a gosto'
      ],
      preparo: [
        'Bata o limão com a água por no máximo 10 segundos, senão a casca amarga.',
        'Coe, volte para o liquidificador e bata com os morangos.',
        'Sirva com gelo.'
      ],
      dica: 'O morango maduro adoça a limonada. Experimente antes de adicionar qualquer adoçante.'
    },

    /* ---------------- Vitaminas ---------------- */
    {
      id: 'vitamina-banana-aveia',
      categoria: 'vitaminas',
      titulo: 'Vitamina de banana com aveia',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana'],
      ingredientes: [
        '1 banana',
        '200 ml de leite',
        '2 colheres (sopa) de aveia em flocos',
        'Canela a gosto'
      ],
      preparo: [
        'Bata tudo no liquidificador até ficar cremoso.',
        'Sirva com uma pitada de canela por cima.'
      ],
      dica: 'Banana congelada em rodelas deixa a vitamina com textura de milk shake.'
    },
    {
      id: 'vitamina-morango',
      categoria: 'vitaminas',
      titulo: 'Vitamina de morango com iogurte natural',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '8 morangos',
        '1 pote de iogurte natural (170 g)',
        '100 ml de leite',
        '1 colher (chá) de mel (opcional)'
      ],
      preparo: [
        'Lave e tire as folhas dos morangos.',
        'Bata com o iogurte e o leite até ficar liso.',
        'Prove antes de colocar o mel. Morango maduro costuma dispensar.'
      ],
      dica: 'Fora da época do morango, o congelado funciona bem e sai mais barato.'
    },
    {
      id: 'vitamina-mamao',
      categoria: 'vitaminas',
      titulo: 'Vitamina de mamão com linhaça',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '1 fatia grande de mamão papaia',
        '200 ml de leite',
        '1 colher (sopa) de linhaça dourada',
        'Suco de 1/2 laranja'
      ],
      preparo: [
        'Tire as sementes do mamão e bata com o leite e o suco de laranja.',
        'Junte a linhaça e bata mais alguns segundos.',
        'Beba logo, porque o mamão engrossa a vitamina com o tempo.'
      ],
      dica: 'A laranja dá um toque ácido que equilibra o sabor doce do mamão.'
    },
    {
      id: 'vitamina-abacate-cacau',
      categoria: 'vitaminas',
      titulo: 'Vitamina de abacate com cacau',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '2 colheres (sopa) cheias de abacate',
        '200 ml de leite gelado',
        '1 colher (sopa) de cacau em pó',
        '1/2 banana'
      ],
      preparo: [
        'Bata tudo no liquidificador até ficar bem cremoso.',
        'Se ficar grosso demais, acrescente um pouco mais de leite.'
      ],
      dica: 'Abacate já é bem cremoso, então pouca quantidade basta para dar corpo à vitamina.'
    },
    {
      id: 'vitamina-acai-banana',
      categoria: 'vitaminas',
      titulo: 'Vitamina de açaí com banana',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '100 g de polpa de açaí sem açúcar',
        '1 banana',
        '150 ml de leite ou água de coco'
      ],
      preparo: [
        'Deixe a polpa de açaí 5 minutos fora do congelador para amolecer.',
        'Bata com a banana e o leite até ficar cremoso.'
      ],
      dica: 'Confira o rótulo: muita polpa vendida pronta já vem com xarope de guaraná e açúcar.'
    },
    /* ---------------- Café da manhã ---------------- */
    {
      id: 'tapioca-ovo-tomate',
      categoria: 'cafe',
      titulo: 'Tapioca com ovo mexido e tomate',
      tempo: '10 min',
      porcoes: '1 porção',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '3 colheres (sopa) de goma de tapioca hidratada',
        '1 ovo',
        '1/2 tomate sem sementes picado',
        'Orégano, sal e cheiro verde a gosto',
        '1 colher (chá) de azeite'
      ],
      preparo: [
        'Espalhe a goma numa frigideira antiaderente fria, ligue o fogo médio e espere a massa grudar e soltar das bordas.',
        'Vire a tapioca, deixe 30 segundos e reserve num prato.',
        'Na mesma frigideira, aqueça o azeite e mexa o ovo com sal até firmar.',
        'Junte o tomate e o orégano, recheie a tapioca, dobre e sirva com cheiro verde.'
      ],
      dica: 'Peneirar a goma antes de espalhar deixa a tapioca mais fina e sem bolotas.'
    },
    {
      id: 'crepioca-queijo',
      categoria: 'cafe',
      titulo: 'Crepioca de queijo branco',
      tempo: '10 min',
      porcoes: '1 porção',
      tags: ['proteica', 'vegetariana', 'sem-gluten'],
      ingredientes: [
        '1 ovo',
        '2 colheres (sopa) de goma de tapioca',
        '1 colher (sopa) de água',
        '2 fatias de queijo branco',
        'Sal e orégano a gosto'
      ],
      preparo: [
        'Bata o ovo com a goma, a água e uma pitada de sal até virar uma massa lisa.',
        'Despeje numa frigideira antiaderente untada e aquecida, espalhando bem.',
        'Quando firmar, vire, coloque o queijo e o orégano de um lado e dobre.',
        'Deixe mais 1 minuto para o queijo amolecer e sirva.'
      ],
      dica: 'Dá para variar o recheio com frango desfiado, espinafre ou tomate com manjericão.'
    },
    {
      id: 'aveia-dormida-frutas',
      categoria: 'cafe',
      titulo: 'Aveia dormida com frutas vermelhas',
      tempo: '5 min + 1 noite na geladeira',
      porcoes: '1 pote',
      tags: ['vegetariana'],
      ingredientes: [
        '4 colheres (sopa) de aveia em flocos',
        '1 pote de iogurte natural (170 g)',
        '50 ml de leite',
        '1 colher (sopa) de chia',
        '1/2 xícara de frutas vermelhas (frescas ou congeladas)',
        '1 colher (chá) de mel (opcional)'
      ],
      preparo: [
        'Num pote com tampa, misture a aveia, o iogurte, o leite e a chia.',
        'Cubra com as frutas vermelhas e o mel.',
        'Tampe e deixe na geladeira de um dia para o outro.',
        'De manhã, mexa e coma gelado.'
      ],
      dica: 'Prepare três potes no domingo e o café da manhã de metade da semana já está pronto.'
    },
    {
      id: 'torrada-abacate-ovo',
      categoria: 'cafe',
      titulo: 'Torrada integral com abacate e ovo',
      tempo: '10 min',
      porcoes: '1 porção',
      tags: ['proteica', 'vegetariana', 'sem-lactose'],
      ingredientes: [
        '2 fatias de pão integral',
        '1/4 de abacate maduro',
        '1 ovo',
        'Suco de 1/2 limão',
        'Sal, pimenta e gergelim a gosto'
      ],
      preparo: [
        'Cozinhe o ovo por 7 minutos em água fervente, passe para água fria e descasque.',
        'Toste o pão.',
        'Amasse o abacate com o limão, o sal e a pimenta.',
        'Espalhe o abacate nas torradas, cubra com o ovo em fatias e finalize com gergelim.'
      ],
      dica: 'O limão evita que o abacate escureça e realça o sabor.'
    },
    {
      id: 'iogurte-granola-caseira',
      categoria: 'cafe',
      titulo: 'Iogurte com granola caseira',
      tempo: '25 min',
      porcoes: '6 porções de granola',
      tags: ['vegetariana'],
      ingredientes: [
        '2 xícaras de aveia em flocos grossos',
        '1/2 xícara de castanhas picadas',
        '2 colheres (sopa) de sementes de girassol ou abóbora',
        '2 colheres (sopa) de mel',
        '1 colher (sopa) de óleo de coco derretido',
        '1 colher (chá) de canela',
        'Iogurte natural e frutas para servir'
      ],
      preparo: [
        'Misture a aveia, as castanhas, as sementes e a canela.',
        'Junte o mel e o óleo de coco e mexa até envolver tudo.',
        'Espalhe numa assadeira e asse a 180 °C por 15 minutos, mexendo na metade do tempo.',
        'Deixe esfriar (ela fica crocante ao esfriar) e guarde num pote fechado.',
        'Sirva 2 colheres (sopa) sobre o iogurte com frutas.'
      ],
      dica: 'A granola caseira tem bem menos açúcar que as de supermercado e dura até 2 semanas no pote.'
    },
    {
      id: 'panqueca-banana-aveia',
      categoria: 'cafe',
      titulo: 'Panqueca de banana e aveia',
      tempo: '15 min',
      porcoes: '4 panquecas pequenas',
      tags: ['vegetariana', 'sem-lactose'],
      ingredientes: [
        '1 banana madura',
        '1 ovo',
        '3 colheres (sopa) de aveia em flocos finos',
        '1/2 colher (chá) de canela',
        '1/2 colher (chá) de fermento em pó'
      ],
      preparo: [
        'Amasse bem a banana e misture com o ovo, a aveia, a canela e o fermento.',
        'Aqueça uma frigideira antiaderente untada em fogo baixo.',
        'Coloque colheradas da massa e deixe até aparecerem bolhinhas.',
        'Vire e doure o outro lado por 1 minuto.'
      ],
      dica: 'Fogo baixo é o segredo: a panqueca cozinha por dentro sem queimar por fora.'
    },
    {
      id: 'cuscuz-ovo',
      categoria: 'cafe',
      titulo: 'Cuscuz de milho com ovo',
      tempo: '15 min',
      porcoes: '2 porções',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de flocão de milho',
        '1/2 xícara de água',
        '1/2 colher (chá) de sal',
        '2 ovos',
        'Cheiro verde a gosto'
      ],
      preparo: [
        'Misture o flocão com o sal e a água aos poucos, até ficar úmido e soltinho. Deixe descansar 5 minutos.',
        'Coloque na cuscuzeira com água no fundo e cozinhe por 8 a 10 minutos depois que levantar vapor.',
        'Enquanto isso, prepare os ovos mexidos ou cozidos.',
        'Sirva o cuscuz com os ovos e cheiro verde.'
      ],
      dica: 'Sem cuscuzeira? Cozinhe a massa em uma tigela de vidro coberta no micro-ondas por 3 minutos.'
    },
    {
      id: 'mingau-aveia-cacau',
      categoria: 'cafe',
      titulo: 'Mingau de aveia com cacau e banana',
      tempo: '10 min',
      porcoes: '1 tigela',
      tags: ['vegetariana'],
      ingredientes: [
        '200 ml de leite',
        '3 colheres (sopa) de aveia em flocos',
        '1 colher (sopa) de cacau em pó',
        '1/2 banana em rodelas',
        'Canela a gosto'
      ],
      preparo: [
        'Leve o leite, a aveia e o cacau ao fogo baixo, mexendo sem parar.',
        'Cozinhe por 4 a 5 minutos, até engrossar.',
        'Sirva com a banana por cima e canela.'
      ],
      dica: 'A banana madura adoça o mingau, sem precisar de açúcar.'
    },

    /* ---------------- Lanches ---------------- */
    {
      id: 'homus-palitos',
      categoria: 'lanches',
      titulo: 'Homus com palitos de legumes',
      tempo: '15 min',
      porcoes: '4 porções',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 xícaras de grão-de-bico cozido',
        '2 colheres (sopa) de tahine',
        'Suco de 1 limão',
        '1 dente de alho',
        '3 colheres (sopa) de azeite',
        'Água gelada, sal e páprica a gosto',
        'Cenoura, pepino e pimentão em palitos'
      ],
      preparo: [
        'Bata no processador o grão-de-bico, o tahine, o limão, o alho e o sal.',
        'Com o aparelho ligado, junte o azeite e água gelada aos poucos até ficar cremoso.',
        'Sirva com um fio de azeite, páprica e os palitos de legumes.'
      ],
      dica: 'Na geladeira, o homus dura 4 dias em pote fechado. É um ótimo lanche para levar.'
    },
    {
      id: 'grao-de-bico-crocante',
      categoria: 'lanches',
      titulo: 'Grão-de-bico crocante assado',
      tempo: '35 min',
      porcoes: '3 porções',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 xícaras de grão-de-bico cozido e escorrido',
        '1 colher (sopa) de azeite',
        '1 colher (chá) de páprica defumada',
        '1/2 colher (chá) de cominho',
        'Sal a gosto'
      ],
      preparo: [
        'Seque bem o grão-de-bico com um pano limpo.',
        'Misture com o azeite e os temperos.',
        'Asse a 200 °C por 25 a 30 minutos (ou 15 minutos na airfryer), sacudindo na metade.',
        'Deixe esfriar para ficar crocante.'
      ],
      dica: 'Quanto mais seco o grão-de-bico entrar no forno, mais crocante ele fica.'
    },
    {
      id: 'chips-batata-doce',
      categoria: 'lanches',
      titulo: 'Chips de batata-doce assados',
      tempo: '30 min',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 batata-doce média com casca, bem lavada',
        '1 colher (sopa) de azeite',
        'Sal, alecrim e páprica a gosto'
      ],
      preparo: [
        'Corte a batata em fatias bem finas (o mais parecidas possível).',
        'Misture com o azeite e os temperos.',
        'Arrume sem sobrepor numa assadeira com papel-manteiga.',
        'Asse a 180 °C por 20 a 25 minutos, virando na metade, até dourar.'
      ],
      dica: 'Fatias da mesma espessura assam por igual. Um fatiador ajuda muito.'
    },
    {
      id: 'muffin-legumes',
      categoria: 'lanches',
      titulo: 'Muffin salgado de legumes',
      tempo: '30 min',
      porcoes: '6 unidades',
      tags: ['proteica', 'vegetariana'],
      ingredientes: [
        '3 ovos',
        '1 cenoura ralada',
        '1/2 abobrinha ralada e espremida',
        '3 colheres (sopa) de queijo ralado',
        '4 colheres (sopa) de farinha de aveia',
        '1 colher (chá) de fermento em pó',
        'Sal, orégano e cheiro verde a gosto'
      ],
      preparo: [
        'Bata os ovos com uma pitada de sal.',
        'Misture os legumes, o queijo, a farinha de aveia e os temperos. Por último, o fermento.',
        'Distribua em forminhas de muffin untadas, enchendo até 3/4.',
        'Asse a 180 °C por 20 minutos, até dourar e firmar.'
      ],
      dica: 'Congela bem: aqueça 1 minuto no micro-ondas para um lanche pronto.'
    },
    {
      id: 'sanduiche-natural-frango',
      categoria: 'lanches',
      titulo: 'Sanduíche natural de frango',
      tempo: '10 min',
      porcoes: '2 sanduíches',
      tags: ['proteica'],
      ingredientes: [
        '1 xícara de frango cozido e desfiado',
        '2 colheres (sopa) de ricota amassada ou iogurte natural',
        '1/2 cenoura ralada',
        'Cheiro verde, sal e limão a gosto',
        '4 fatias de pão integral',
        'Folhas de alface'
      ],
      preparo: [
        'Misture o frango, a ricota, a cenoura, o cheiro verde, o sal e umas gotas de limão.',
        'Monte os sanduíches com a alface e o recheio.',
        'Corte ao meio e sirva, ou embale em papel-filme para levar.'
      ],
      dica: 'O recheio dura 2 dias na geladeira. Monte o sanduíche na hora de comer para o pão não umedecer.'
    },
    {
      id: 'ovos-cozidos-temperados',
      categoria: 'lanches',
      titulo: 'Ovos cozidos com páprica e ervas',
      tempo: '12 min',
      porcoes: '2 porções',
      tags: ['proteica', 'low-carb', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '4 ovos',
        '1 colher (chá) de azeite',
        'Páprica, sal, pimenta e cebolinha a gosto'
      ],
      preparo: [
        'Coloque os ovos em água fervente e cozinhe por 9 minutos.',
        'Passe para água com gelo e descasque.',
        'Corte ao meio, regue com o azeite e tempere com páprica, sal, pimenta e cebolinha.'
      ],
      dica: 'Ovos cozidos e descascados duram 3 dias na geladeira. Um lanche proteico pronto.'
    },
    {
      id: 'pipoca-panela',
      categoria: 'lanches',
      titulo: 'Pipoca de panela com ervas',
      tempo: '10 min',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1/2 xícara de milho para pipoca',
        '1 colher (sopa) de azeite',
        'Sal, orégano e páprica a gosto'
      ],
      preparo: [
        'Aqueça o azeite com 3 grãos de milho na panela tampada.',
        'Quando os 3 estourarem, junte o resto do milho, tampe e sacuda de vez em quando.',
        'Desligue quando os estouros espaçarem e tempere em seguida.'
      ],
      dica: 'Pipoca feita em casa tem muito menos gordura e sal que a de micro-ondas de pacote.'
    },
    {
      id: 'maca-pasta-amendoim',
      categoria: 'lanches',
      titulo: 'Maçã com pasta de amendoim e canela',
      tempo: '5 min',
      porcoes: '1 porção',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 maçã',
        '1 colher (sopa) de pasta de amendoim integral',
        'Canela a gosto'
      ],
      preparo: [
        'Corte a maçã em fatias, sem as sementes.',
        'Sirva com a pasta de amendoim e polvilhe canela.'
      ],
      dica: 'Prefira pasta de amendoim só com amendoim no rótulo, sem açúcar nem óleo adicionado.'
    },

    /* ---------------- Salgadas (mais) ---------------- */
    {
      id: 'tilapia-assada-legumes',
      categoria: 'salgadas',
      titulo: 'Tilápia assada com legumes',
      tempo: '30 min',
      porcoes: '2 porções',
      tags: ['proteica', 'low-carb', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 filés de tilápia',
        '1 abobrinha em rodelas',
        '1 tomate em rodelas',
        '1/2 cebola em rodelas',
        'Suco de 1 limão',
        '1 colher (sopa) de azeite',
        'Sal, alho e salsinha a gosto'
      ],
      preparo: [
        'Tempere os filés com limão, sal e alho.',
        'Forre uma assadeira com os legumes, tempere com sal e azeite.',
        'Coloque os filés por cima e cubra com papel-alumínio.',
        'Asse a 200 °C por 15 minutos, retire o papel e deixe mais 5 a 8 minutos.',
        'Finalize com salsinha.'
      ],
      dica: 'O peixe está pronto quando lasca facilmente com o garfo. Passou disso, resseca.'
    },
    {
      id: 'strogonoff-frango-iogurte',
      categoria: 'salgadas',
      titulo: 'Strogonoff de frango com iogurte',
      tempo: '30 min',
      porcoes: '3 porções',
      tags: ['proteica', 'sem-gluten'],
      ingredientes: [
        '400 g de peito de frango em cubos',
        '1 cebola picada',
        '1 dente de alho',
        '1 xícara de cogumelos fatiados (opcional)',
        '3 colheres (sopa) de extrato de tomate',
        '1 colher (sopa) de mostarda',
        '1 pote de iogurte natural integral (170 g)',
        'Sal e salsinha a gosto'
      ],
      preparo: [
        'Doure o frango temperado com sal numa panela com um fio de azeite.',
        'Junte a cebola, o alho e os cogumelos e refogue até murchar.',
        'Acrescente o extrato de tomate, a mostarda e 1/2 xícara de água. Cozinhe por 5 minutos.',
        'Desligue o fogo, espere 1 minuto e misture o iogurte (fora do fogo para não talhar).',
        'Finalize com salsinha e sirva com arroz integral e salada.'
      ],
      dica: 'O iogurte substitui o creme de leite com bem menos gordura e um toque azedinho gostoso.'
    },
    {
      id: 'carne-panela-legumes',
      categoria: 'salgadas',
      titulo: 'Carne de panela com legumes',
      tempo: '1 h',
      porcoes: '4 porções',
      tags: ['proteica', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '600 g de patinho ou acém em cubos grandes',
        '1 cebola picada',
        '2 dentes de alho',
        '2 tomates picados',
        '2 cenouras em pedaços',
        '2 batatas em pedaços',
        '1 folha de louro',
        'Sal, pimenta e cheiro verde a gosto'
      ],
      preparo: [
        'Tempere a carne com sal e pimenta e doure aos poucos na panela de pressão com um fio de óleo.',
        'Junte a cebola, o alho, o tomate e o louro e refogue.',
        'Cubra com água quente, tampe e cozinhe por 35 minutos depois de pegar pressão.',
        'Tire a pressão, junte a cenoura e a batata e cozinhe sem tampa por 15 minutos, até ficarem macias.',
        'Finalize com cheiro verde.'
      ],
      dica: 'Dourar a carne em pouca quantidade de cada vez é o que deixa o molho escuro e saboroso.'
    },
    {
      id: 'abobrinha-recheada',
      categoria: 'salgadas',
      titulo: 'Abobrinha recheada com carne moída',
      tempo: '35 min',
      porcoes: '2 porções',
      tags: ['proteica', 'low-carb', 'sem-gluten'],
      ingredientes: [
        '2 abobrinhas',
        '250 g de patinho moído',
        '1/2 cebola picada',
        '1 tomate picado',
        '2 colheres (sopa) de queijo ralado',
        'Sal, alho e orégano a gosto'
      ],
      preparo: [
        'Corte as abobrinhas ao meio no comprimento e retire o miolo com uma colher. Pique o miolo.',
        'Refogue a carne com cebola e alho, junte o tomate, o miolo picado e tempere.',
        'Recheie as metades, cubra com o queijo.',
        'Asse a 200 °C por 20 minutos.'
      ],
      dica: 'Aproveitar o miolo da abobrinha no recheio evita desperdício e deixa tudo mais suculento.'
    },
    {
      id: 'arroz-integral-brocolis',
      categoria: 'salgadas',
      titulo: 'Arroz integral com brócolis',
      tempo: '40 min',
      porcoes: '4 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de arroz integral',
        '2 1/2 xícaras de água quente',
        '1 maço pequeno de brócolis em floretes',
        '2 dentes de alho picados',
        '1 colher (sopa) de azeite',
        'Sal a gosto'
      ],
      preparo: [
        'Refogue metade do alho no azeite, junte o arroz e mexa por 1 minuto.',
        'Acrescente a água e o sal, tampe e cozinhe em fogo baixo por 30 a 35 minutos.',
        'Enquanto isso, refogue o brócolis com o resto do alho por 3 minutos, deixando firme.',
        'Misture ao arroz pronto.'
      ],
      dica: 'Deixar o arroz integral de molho por 2 horas antes encurta o cozimento.'
    },
    {
      id: 'feijao-caseiro',
      categoria: 'salgadas',
      titulo: 'Feijão caseiro temperado',
      tempo: '1 h (com remolho)',
      porcoes: '6 porções',
      tags: ['proteica', 'vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 xícaras de feijão carioca',
        '2 folhas de louro',
        '1 cebola picada',
        '3 dentes de alho amassados',
        '1 colher (sopa) de azeite',
        'Sal e cheiro verde a gosto'
      ],
      preparo: [
        'Deixe o feijão de molho em água por 8 a 12 horas e descarte essa água.',
        'Cozinhe na pressão com água nova e o louro por 25 minutos depois de pegar pressão.',
        'Refogue a cebola e o alho no azeite, junte 2 conchas do feijão, amasse e devolva à panela.',
        'Acerte o sal e cozinhe sem tampa por 10 minutos para engrossar.'
      ],
      dica: 'O remolho deixa o feijão mais fácil de digerir. Congele em porções para a semana toda.'
    },
    {
      id: 'quibe-abobora',
      categoria: 'salgadas',
      titulo: 'Quibe de abóbora assado',
      tempo: '50 min',
      porcoes: '6 porções',
      tags: ['vegetariana', 'sem-lactose'],
      ingredientes: [
        '1 xícara de trigo para quibe',
        '500 g de abóbora cabotiá cozida e amassada',
        '1/2 cebola ralada',
        'Hortelã picada a gosto',
        '2 colheres (sopa) de azeite',
        'Sal e pimenta síria a gosto'
      ],
      preparo: [
        'Deixe o trigo de molho em água quente por 30 minutos e esprema bem.',
        'Misture com a abóbora, a cebola, a hortelã, o sal e a pimenta síria.',
        'Espalhe numa assadeira untada, alise e risque losangos com a faca.',
        'Regue com o azeite e asse a 200 °C por 25 a 30 minutos.'
      ],
      dica: 'Sirva com coalhada seca ou salada de folhas e tomate.'
    },
    {
      id: 'fritada-forno-legumes',
      categoria: 'salgadas',
      titulo: 'Fritada de forno com legumes',
      tempo: '30 min',
      porcoes: '4 porções',
      tags: ['proteica', 'low-carb', 'vegetariana', 'sem-gluten'],
      ingredientes: [
        '6 ovos',
        '1 xícara de brócolis picado',
        '1 tomate picado',
        '1/2 pimentão picado',
        '1/2 cebola picada',
        '3 colheres (sopa) de queijo ralado',
        'Sal, pimenta e orégano a gosto'
      ],
      preparo: [
        'Bata os ovos com sal, pimenta e orégano.',
        'Misture os legumes e metade do queijo.',
        'Despeje num refratário untado e cubra com o resto do queijo.',
        'Asse a 180 °C por 20 a 25 minutos, até firmar no centro.'
      ],
      dica: 'Ótima para usar os legumes que estão sobrando na geladeira.'
    },
    {
      id: 'salada-grao-de-bico-atum',
      categoria: 'salgadas',
      titulo: 'Salada de grão-de-bico com atum',
      tempo: '10 min',
      porcoes: '2 porções',
      tags: ['proteica', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de grão-de-bico cozido',
        '1 lata de atum em água, escorrido',
        '1 tomate em cubos',
        '1/2 pepino em cubos',
        '1/4 de cebola roxa picada',
        'Suco de 1 limão',
        '1 colher (sopa) de azeite',
        'Sal e salsinha a gosto'
      ],
      preparo: [
        'Misture todos os ingredientes numa tigela.',
        'Tempere com limão, azeite, sal e salsinha.',
        'Deixe 10 minutos na geladeira antes de servir.'
      ],
      dica: 'Prefira atum em água: tem menos gordura e menos sal que o em óleo.'
    },
    {
      id: 'frango-desfiado-tomate',
      categoria: 'salgadas',
      titulo: 'Frango desfiado ao molho de tomate',
      tempo: '40 min',
      porcoes: '4 porções',
      tags: ['proteica', 'low-carb', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '500 g de peito de frango',
        '1 cebola picada',
        '2 dentes de alho',
        '3 tomates maduros picados',
        '1 colher (sopa) de extrato de tomate',
        'Sal, páprica e cheiro verde a gosto'
      ],
      preparo: [
        'Cozinhe o frango em água com sal por 20 minutos (ou 10 na pressão) e desfie.',
        'Refogue a cebola e o alho, junte os tomates e o extrato e cozinhe até desmanchar.',
        'Misture o frango, tempere com páprica e cozinhe mais 5 minutos.',
        'Finalize com cheiro verde.'
      ],
      dica: 'Serve como prato principal, recheio de tapioca, sanduíche ou omelete.'
    },
    {
      id: 'espaguete-abobrinha-bolonhesa',
      categoria: 'salgadas',
      titulo: 'Espaguete de abobrinha à bolonhesa',
      tempo: '25 min',
      porcoes: '2 porções',
      tags: ['proteica', 'low-carb', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 abobrinhas',
        '250 g de patinho moído',
        '1/2 cebola picada',
        '1 dente de alho',
        '1 xícara de molho de tomate caseiro',
        'Sal, orégano e manjericão a gosto'
      ],
      preparo: [
        'Corte as abobrinhas em tiras finas, como espaguete (com fatiador ou descascador).',
        'Refogue a carne com cebola e alho, junte o molho e tempere. Cozinhe por 10 minutos.',
        'Salteie a abobrinha numa frigideira quente por 2 minutos, só para amornar.',
        'Sirva o molho sobre a abobrinha com manjericão.'
      ],
      dica: 'Não cozinhe demais a abobrinha: ela solta água e perde a textura de macarrão.'
    },
    {
      id: 'caldo-verde',
      categoria: 'salgadas',
      titulo: 'Caldo verde caseiro',
      tempo: '40 min',
      porcoes: '4 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '4 batatas médias em pedaços',
        '1 cebola picada',
        '2 dentes de alho',
        '1 maço de couve cortada bem fina',
        '1 litro de água quente',
        '2 colheres (sopa) de azeite',
        'Sal a gosto'
      ],
      preparo: [
        'Refogue a cebola e o alho em 1 colher de azeite.',
        'Junte a batata e a água e cozinhe até ficar bem macia, uns 20 minutos.',
        'Bata no liquidificador e volte à panela.',
        'Acrescente a couve e cozinhe só 3 minutos. Acerte o sal e regue com o resto do azeite.'
      ],
      dica: 'Quem come carne pode juntar rodelas de linguiça magra douradas à parte.'
    },

    /* ---------------- Doces (mais) ---------------- */
    {
      id: 'maca-assada-canela',
      categoria: 'doces',
      titulo: 'Maçã assada com canela e castanhas',
      tempo: '25 min',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '2 maçãs',
        '1 colher (chá) de canela',
        '2 colheres (sopa) de castanhas picadas',
        '1 colher (chá) de mel (opcional)'
      ],
      preparo: [
        'Retire o miolo das maçãs com uma faca pequena, sem furar o fundo.',
        'Recheie com as castanhas e a canela e regue com o mel.',
        'Asse a 180 °C por 20 minutos, até ficarem macias.'
      ],
      dica: 'Fica ótima morna, com uma colher de iogurte natural por cima.'
    },
    {
      id: 'sorvete-banana',
      categoria: 'doces',
      titulo: 'Sorvete de banana com cacau',
      tempo: '5 min + 6 h no congelador',
      porcoes: '2 porções',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '3 bananas maduras em rodelas, congeladas',
        '1 colher (sopa) de cacau em pó',
        '1 colher (sopa) de pasta de amendoim (opcional)'
      ],
      preparo: [
        'Congele as rodelas de banana por pelo menos 6 horas.',
        'Bata no processador, raspando as laterais, até virar um creme liso.',
        'Junte o cacau e a pasta de amendoim e bata mais um pouco. Sirva na hora.'
      ],
      dica: 'Quanto mais madura a banana, mais doce e cremoso fica o sorvete.'
    },
    {
      id: 'docinho-tamara-cacau',
      categoria: 'doces',
      titulo: 'Docinho de tâmara com cacau',
      tempo: '15 min',
      porcoes: '12 docinhos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de tâmaras sem caroço',
        '1/2 xícara de castanha-de-caju ou amêndoas',
        '2 colheres (sopa) de cacau em pó',
        'Coco ralado sem açúcar para enrolar'
      ],
      preparo: [
        'Se as tâmaras estiverem secas, deixe 10 minutos em água morna e escorra.',
        'Processe as castanhas até virar farofa, junte as tâmaras e o cacau e processe até formar uma massa.',
        'Enrole bolinhas e passe no coco ralado.',
        'Guarde na geladeira.'
      ],
      dica: 'Doce de verdade, sem açúcar adicionado. Mesmo assim, 1 ou 2 por vez já bastam.'
    },
    {
      id: 'cookies-aveia-banana',
      categoria: 'doces',
      titulo: 'Cookies de aveia e banana',
      tempo: '25 min',
      porcoes: '10 cookies',
      tags: ['vegetariana', 'sem-lactose'],
      ingredientes: [
        '2 bananas maduras amassadas',
        '1 1/2 xícara de aveia em flocos',
        '2 colheres (sopa) de uva-passa ou gotas de chocolate 70%',
        '1 colher (chá) de canela'
      ],
      preparo: [
        'Misture a banana com a aveia e a canela até formar uma massa.',
        'Junte as uvas-passas ou o chocolate.',
        'Faça bolinhas, achate numa assadeira com papel-manteiga.',
        'Asse a 180 °C por 15 a 18 minutos, até dourar as bordas.'
      ],
      dica: 'Só dois ingredientes principais e nenhum açúcar adicionado. Ótimo para a lancheira.'
    },

    /* ---------------- Sucos (mais) ---------------- */
    {
      id: 'suco-abacaxi-hortela',
      categoria: 'sucos',
      titulo: 'Suco de abacaxi com hortelã',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '3 fatias de abacaxi maduro',
        '8 folhas de hortelã',
        '400 ml de água gelada',
        'Gelo a gosto'
      ],
      preparo: [
        'Bata o abacaxi, a hortelã e a água no liquidificador.',
        'Coe se preferir e sirva com gelo.'
      ],
      dica: 'Abacaxi bem maduro dispensa açúcar: ele já é naturalmente doce.'
    },
    {
      id: 'agua-saborizada',
      categoria: 'sucos',
      titulo: 'Água saborizada de pepino, limão e gengibre',
      tempo: '5 min + 1 h na geladeira',
      porcoes: '1 litro',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 litro de água gelada',
        '1/2 pepino em rodelas finas',
        '1 limão em rodelas',
        '3 rodelas finas de gengibre',
        'Folhas de hortelã'
      ],
      preparo: [
        'Coloque tudo numa jarra com a água.',
        'Deixe na geladeira por pelo menos 1 hora.',
        'Beba ao longo do dia, completando com água.'
      ],
      dica: 'Um jeito fácil de beber mais água para quem não gosta de água pura.'
    },
    {
      id: 'suco-maracuja',
      categoria: 'sucos',
      titulo: 'Suco de maracujá',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        'Polpa de 2 maracujás',
        '500 ml de água gelada',
        '1 colher (chá) de mel (opcional)',
        'Gelo a gosto'
      ],
      preparo: [
        'Bata a polpa com a água rapidamente, só para soltar as sementes (pulsando).',
        'Coe, adoce se quiser e sirva com gelo.'
      ],
      dica: 'Bater pouco evita que as sementes quebrem e deixem o suco amargo.'
    },
    {
      id: 'suco-acerola-laranja',
      categoria: 'sucos',
      titulo: 'Suco de acerola com laranja',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de acerolas (frescas ou polpa congelada)',
        'Suco de 3 laranjas',
        '200 ml de água gelada'
      ],
      preparo: [
        'Bata a acerola com o suco de laranja e a água.',
        'Coe e beba logo em seguida.'
      ],
      dica: 'Acerola é uma das frutas mais ricas em vitamina C. Beba na hora, porque a vitamina se perde com o tempo.'
    },

    /* ---------------- Vitaminas (mais) ---------------- */
    {
      id: 'vitamina-banana-amendoim',
      categoria: 'vitaminas',
      titulo: 'Vitamina de banana com pasta de amendoim',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['proteica', 'vegetariana'],
      ingredientes: [
        '1 banana',
        '200 ml de leite',
        '1 colher (sopa) de pasta de amendoim',
        '1 colher (sopa) de aveia',
        'Canela a gosto'
      ],
      preparo: [
        'Bata tudo no liquidificador até ficar cremoso.',
        'Sirva gelado.'
      ],
      dica: 'Boa opção para depois do treino: tem carboidrato, proteína e gordura boa.'
    },
    {
      id: 'vitamina-verde',
      categoria: 'vitaminas',
      titulo: 'Vitamina verde com água de coco',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-lactose', 'sem-gluten'],
      ingredientes: [
        '1 xícara de folhas de espinafre',
        '1 banana congelada',
        '1/2 maçã',
        '250 ml de água de coco'
      ],
      preparo: [
        'Bata tudo no liquidificador até ficar liso.',
        'Sirva na hora.'
      ],
      dica: 'A banana congelada deixa a vitamina cremosa sem precisar de gelo nem leite.'
    },
    {
      id: 'vitamina-frutas-vermelhas',
      categoria: 'vitaminas',
      titulo: 'Vitamina de frutas vermelhas com iogurte',
      tempo: '5 min',
      porcoes: '1 copo',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '1 xícara de frutas vermelhas congeladas',
        '1 pote de iogurte natural (170 g)',
        '100 ml de leite',
        '1 colher (chá) de mel (opcional)'
      ],
      preparo: [
        'Bata tudo no liquidificador.',
        'Sirva em seguida.'
      ],
      dica: 'Frutas vermelhas congeladas são mais baratas que as frescas e mantêm os nutrientes.'
    },
    {
      id: 'vitamina-manga-maracuja',
      categoria: 'vitaminas',
      titulo: 'Vitamina de manga com maracujá',
      tempo: '5 min',
      porcoes: '2 copos',
      tags: ['vegetariana', 'sem-gluten'],
      ingredientes: [
        '1 manga madura em cubos',
        'Polpa de 1 maracujá',
        '1 pote de iogurte natural (170 g)',
        '200 ml de água gelada'
      ],
      preparo: [
        'Bata a manga, o iogurte e a água até ficar cremoso.',
        'Junte a polpa do maracujá e pulse rapidamente.',
        'Sirva gelada.'
      ],
      dica: 'Pulsar o maracujá no fim evita quebrar as sementes e deixar a vitamina amarga.'
    }
  ];
})();
