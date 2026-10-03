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
    { id: 'salgadas', nome: 'Salgadas', descricao: 'Refeições do dia a dia, com legumes no prato.' },
    { id: 'doces', nome: 'Doces', descricao: 'Sobremesas com fruta e pouco ou nenhum açúcar.' },
    { id: 'sucos', nome: 'Sucos', descricao: 'Para acompanhar a refeição ou o lanche da tarde.' },
    { id: 'vitaminas', nome: 'Vitaminas', descricao: 'Batidas no liquidificador, boas para o café da manhã.' }
  ];

  PF.receitas = [
    /* ---------------- Salgadas ---------------- */
    {
      id: 'omelete-espinafre',
      categoria: 'salgadas',
      titulo: 'Omelete de espinafre com queijo branco',
      tempo: '10 min',
      porcoes: '1 porção',
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
    }
  ];
})();
