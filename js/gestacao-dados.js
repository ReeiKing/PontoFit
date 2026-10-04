/* ==========================================================================
   PontoFit — gestacao-dados.js
   Conteúdo do acompanhamento da gestação (estático, igual para todo mundo).
   Caráter educativo: não substitui o pré-natal. Os textos sempre orientam a
   conversar com o obstetra antes de qualquer decisão.
   Fontes de referência: IOM/NAM 2009 (ganho de peso), Ministério da Saúde
   (pré-natal e vacinas), FDA/ANVISA (alertas de medicamentos).
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* Semana a semana: fruta de comparação, tamanho e peso médios aproximados
     (até a 19ª semana, medida cabeça-nádega; a partir da 20ª, cabeça-calcanhar)
     e o que acontece com o bebê. */
  var semanas = [
    [4, 'uma semente de papoula', '1 mm', null, 'O embrião acabou de se implantar no útero e a placenta começa a se formar.'],
    [5, 'uma semente de gergelim', '2 mm', null, 'O coração e o tubo neural (que vai virar cérebro e medula) começam a se formar.'],
    [6, 'uma lentilha', '5 mm', null, 'Os batimentos do coração já podem aparecer no ultrassom.'],
    [7, 'um mirtilo', '1 cm', null, 'Braços e pernas aparecem como pequenos brotos e o cérebro cresce rápido.'],
    [8, 'uma framboesa', '1,6 cm', '1 g', 'Os dedinhos começam a se separar e o bebê já se mexe, mas ainda não dá para sentir.'],
    [9, 'uma uva', '2,3 cm', '2 g', 'Os órgãos principais estão formados e agora vão amadurecer.'],
    [10, 'um morango', '3 cm', '4 g', 'Começam a se formar as unhas e os ossos começam a calcificar.'],
    [11, 'um figo', '4 cm', '7 g', 'O bebê já boceja, se espreguiça e abre e fecha as mãos.'],
    [12, 'um limão', '5,4 cm', '14 g', 'Os reflexos aparecem e os rins começam a produzir urina.'],
    [13, 'um pêssego', '7,4 cm', '23 g', 'Começam a se formar as impressões digitais. Fim do primeiro trimestre.'],
    [14, 'uma laranja', '8,7 cm', '43 g', 'O rosto ganha expressões: o bebê faz caretas e franze a testa.'],
    [15, 'uma maçã', '10 cm', '70 g', 'Os ossos ficam mais firmes e o bebê já percebe a luz através da barriga.'],
    [16, 'um abacate', '11,6 cm', '100 g', 'Os olhos se movem e a coluna fica mais firme.'],
    [17, 'uma pera', '13 cm', '140 g', 'O bebê começa a acumular gordura, que vai ajudar a manter a temperatura depois do nascimento.'],
    [18, 'um pimentão', '14,2 cm', '190 g', 'As orelhas estão no lugar e o bebê pode começar a ouvir sons.'],
    [19, 'uma manga', '15,3 cm', '240 g', 'Uma camada protetora chamada vérnix cobre a pele do bebê.'],
    [20, 'uma banana', '25,6 cm', '300 g', 'Metade da gestação! Muitas mães sentem os primeiros chutes entre a 18ª e a 22ª semana.'],
    [21, 'uma cenoura', '26,7 cm', '360 g', 'Os movimentos ficam mais coordenados e o bebê engole líquido amniótico.'],
    [22, 'um mamão papaia', '27,8 cm', '430 g', 'Surgem as sobrancelhas e o tato se desenvolve.'],
    [23, 'uma toranja', '28,9 cm', '500 g', 'O bebê ouve sua voz e as batidas do seu coração.'],
    [24, 'uma espiga de milho', '30 cm', '600 g', 'Os pulmões se desenvolvem e começam a produzir surfactante, que ajuda a respirar.'],
    [25, 'uma couve-flor', '34,6 cm', '660 g', 'O cabelo cresce e o bebê reage a sons e ao toque na barriga.'],
    [26, 'um pé de alface', '35,6 cm', '760 g', 'Os olhos começam a se abrir e o bebê "treina" a respiração.'],
    [27, 'um repolho pequeno', '36,6 cm', '875 g', 'Começa o terceiro trimestre. O bebê já tem ciclos de sono e de vigília.'],
    [28, 'uma berinjela', '37,6 cm', '1 kg', 'O bebê pisca e o cérebro ganha mais dobras.'],
    [29, 'uma abóbora pequena', '38,6 cm', '1,15 kg', 'Músculos e pulmões amadurecem e os chutes ficam mais fortes.'],
    [30, 'um repolho', '39,9 cm', '1,3 kg', 'A medula óssea passa a produzir os glóbulos vermelhos.'],
    [31, 'um coco', '41,1 cm', '1,5 kg', 'O bebê vira a cabeça de um lado para o outro e ganha peso rápido.'],
    [32, 'um melão pequeno', '42,4 cm', '1,7 kg', 'As unhas dos pés estão formadas e o bebê pratica a respiração.'],
    [33, 'um abacaxi', '43,7 cm', '1,9 kg', 'Os ossos endurecem, mas o crânio continua flexível para o parto.'],
    [34, 'um melão', '45 cm', '2,1 kg', 'O sistema nervoso amadurece e a vérnix fica mais espessa.'],
    [35, 'um melão cantalupo', '46,2 cm', '2,4 kg', 'Os rins estão completamente desenvolvidos e o espaço na barriga fica apertado.'],
    [36, 'um mamão formosa', '47,4 cm', '2,6 kg', 'Muitos bebês já ficam de cabeça para baixo, posição para o parto.'],
    [37, 'um maço de acelga', '48,6 cm', '2,9 kg', 'Os pulmões estão quase prontos. A partir daqui, o bebê é considerado a termo.'],
    [38, 'uma abóbora', '49,8 cm', '3,1 kg', 'O bebê já agarra com força e pode nascer a qualquer momento.'],
    [39, 'uma melancia pequena', '50,7 cm', '3,3 kg', 'Termo completo. O cérebro continua crescendo rápido.'],
    [40, 'uma melancia', '51,2 cm', '3,4 kg', 'Data provável do parto! Só cerca de 5% dos bebês nascem exatamente nesse dia.']
  ];

  PF.gestacao = {
    semanas: semanas.map(function (s) {
      return { semana: s[0], fruta: s[1], tamanho: s[2], peso: s[3], bebe: s[4] };
    }),

    /* Dicas para a mãe, por trimestre. */
    dicasTrimestre: {
      1: [
        'Tome o ácido fólico prescrito: ele protege a formação do cérebro e da coluna do bebê.',
        'Enjoo? Coma pouco, várias vezes ao dia, e tenha uma bolacha de água e sal por perto ao acordar.',
        'Marque a primeira consulta de pré-natal o quanto antes e leve a lista dos seus medicamentos.',
        'Descanse quando puder: o cansaço do primeiro trimestre é muito comum.'
      ],
      2: [
        'É o trimestre em que muitas mulheres se sentem melhor. Bom momento para atividade física leve, se liberada.',
        'Hidrate a pele da barriga e use roupas confortáveis.',
        'Converse e cante para o bebê: ele já começa a ouvir.',
        'Capriche no ferro e no cálcio: carnes, feijão, folhas verde-escuras, leite e derivados.'
      ],
      3: [
        'Durma de lado, de preferência do lado esquerdo, com um travesseiro entre as pernas.',
        'Conheça o padrão de movimentos do bebê e avise o médico se perceber que ele está se mexendo menos.',
        'Prepare a mala da maternidade a partir da 34ª semana.',
        'Inchaço leve nos pés é comum, mas inchaço repentino no rosto e nas mãos precisa de avaliação.'
      ]
    },

    /* Exames e marcos comuns no pré-natal (o obstetra define o calendário). */
    marcos: [
      { de: 4, ate: 12, texto: 'Primeira consulta de pré-natal e exames de sangue e urina iniciais.' },
      { de: 11, ate: 14, texto: 'Ultrassom morfológico do 1º trimestre (translucência nucal).' },
      { de: 20, ate: 24, texto: 'Ultrassom morfológico do 2º trimestre.' },
      { de: 20, ate: 36, texto: 'Vacina dTpa (difteria, tétano e coqueluche), indicada a partir da 20ª semana em toda gestação.' },
      { de: 24, ate: 28, texto: 'Teste de tolerância à glicose (curva glicêmica) para diabetes gestacional.' },
      { de: 35, ate: 37, texto: 'Exame para estreptococo do grupo B.' }
    ],

    /* Ganho de peso recomendado (IOM 2009), pelo IMC de antes da gravidez.
       1º trimestre: 0,5 a 2 kg no total; depois, kg por semana. */
    ganhoPeso: [
      { ate: 18.5, faixa: 'Abaixo do peso', total: [12.5, 18], semanal: [0.44, 0.58] },
      { ate: 25, faixa: 'Peso adequado', total: [11.5, 16], semanal: [0.35, 0.50] },
      { ate: 30, faixa: 'Sobrepeso', total: [7, 11.5], semanal: [0.23, 0.33] },
      { ate: Infinity, faixa: 'Obesidade', total: [5, 9], semanal: [0.17, 0.27] }
    ],

    /* Medicamentos e substâncias que pedem cuidado na gestação.
       termos: nomes e marcas comuns (sem acento, minúsculas) para alertar
       quando aparecem nos medicamentos cadastrados pela gestante. */
    medicamentos: [
      { nome: 'Isotretinoína (Roacutan)', nivel: 'contraindicado', termos: ['isotretinoina', 'roacutan', 'roacutane'],
        texto: 'Causa malformações graves. Contraindicada na gestação.' },
      { nome: 'Acitretina', nivel: 'contraindicado', termos: ['acitretina', 'neotigason'],
        texto: 'Contraindicada na gestação e por anos antes de engravidar.' },
      { nome: 'Talidomida', nivel: 'contraindicado', termos: ['talidomida'],
        texto: 'Causa malformações graves. Contraindicada.' },
      { nome: 'Misoprostol (Cytotec)', nivel: 'contraindicado', termos: ['misoprostol', 'cytotec'],
        texto: 'Pode provocar aborto e malformações. Contraindicado.' },
      { nome: 'Metotrexato', nivel: 'contraindicado', termos: ['metotrexato', 'methotrexate'],
        texto: 'Contraindicado na gestação.' },
      { nome: 'Varfarina', nivel: 'contraindicado', termos: ['varfarina', 'marevan', 'coumadin'],
        texto: 'Em geral é trocada por outro anticoagulante. Não pare sozinha: fale com o médico.' },
      { nome: 'Tirzepatida (Mounjaro), semaglutida (Ozempic, Wegovy) e liraglutida', nivel: 'contraindicado',
        termos: ['mounjaro', 'tirzepatida', 'ozempic', 'wegovy', 'rybelsus', 'semaglutida', 'liraglutida', 'saxenda', 'victoza'],
        texto: 'Não são recomendados na gestação. O médico orienta quando suspender, de preferência antes de engravidar.' },
      { nome: 'Testosterona e anabolizantes', nivel: 'contraindicado', termos: ['testosterona', 'durateston', 'deposteron', 'nandrolona', 'deca', 'oxandrolona', 'anabolizante'],
        texto: 'Contraindicados na gestação.' },
      { nome: 'Finasterida e dutasterida', nivel: 'contraindicado', termos: ['finasterida', 'dutasterida', 'propecia', 'avodart'],
        texto: 'Contraindicadas. A gestante não deve nem manusear comprimidos quebrados.' },
      { nome: 'Ácido valproico (valproato)', nivel: 'cuidado', termos: ['valproico', 'valproato', 'depakene', 'depakote', 'divalproato'],
        texto: 'Alto risco para o bebê. Nunca pare sozinha: crises também são perigosas. O neurologista ajusta o tratamento.' },
      { nome: 'Enalapril, captopril, losartana e similares', nivel: 'cuidado',
        termos: ['enalapril', 'captopril', 'lisinopril', 'ramipril', 'losartana', 'valsartana', 'olmesartana', 'candesartana', 'irbesartana', 'telmisartana'],
        texto: 'Contraindicados principalmente no 2º e 3º trimestres. O médico troca por remédios seguros para a pressão.' },
      { nome: 'Estatinas (sinvastatina, atorvastatina, rosuvastatina)', nivel: 'cuidado',
        termos: ['sinvastatina', 'atorvastatina', 'rosuvastatina', 'pravastatina', 'estatina'],
        texto: 'Costumam ser suspensas durante a gestação, com orientação médica.' },
      { nome: 'Tetraciclinas (doxiciclina, minociclina)', nivel: 'cuidado', termos: ['tetraciclina', 'doxiciclina', 'minociclina'],
        texto: 'Evitadas a partir do segundo trimestre: podem afetar dentes e ossos do bebê.' },
      { nome: 'Anti-inflamatórios (ibuprofeno, diclofenaco, nimesulida)', nivel: 'cuidado',
        termos: ['ibuprofeno', 'diclofenaco', 'nimesulida', 'naproxeno', 'cetoprofeno', 'meloxicam', 'piroxicam', 'advil', 'alivium', 'voltaren', 'cataflam'],
        texto: 'Evite principalmente a partir da 20ª semana, salvo orientação médica.' },
      { nome: 'Lítio', nivel: 'cuidado', termos: ['litio', 'carbolitium'],
        texto: 'Exige acompanhamento próximo do psiquiatra e do obstetra. Não interrompa sozinha.' },
      { nome: 'Vitamina A em altas doses (retinol)', nivel: 'cuidado', termos: ['retinol', 'vitamina a'],
        texto: 'Doses altas podem causar malformações. Use só o que o médico prescrever.' }
    ],

    alimentosEvitar: [
      { titulo: 'Álcool', texto: 'Não existe quantidade segura na gestação.' },
      { titulo: 'Carnes, peixes e ovos crus ou malpassados', texto: 'Risco de toxoplasmose, salmonela e listeria. Sushi cru, carpaccio e gemada estão fora.' },
      { titulo: 'Leite e queijos não pasteurizados', texto: 'Prefira os pasteurizados. Queijos artesanais crus podem ter listeria.' },
      { titulo: 'Peixes com muito mercúrio', texto: 'Evite cação, peixe-espada e tubarão. Sardinha, tilápia e salmão são boas opções, bem cozidos.' },
      { titulo: 'Excesso de cafeína', texto: 'Até cerca de 200 mg por dia, que equivale a duas xícaras pequenas de café coado.' },
      { titulo: 'Chás e fitoterápicos sem orientação', texto: 'Vários chás e ervas não são seguros na gestação. Pergunte ao médico antes.' },
      { titulo: 'Frutas e verduras mal lavadas', texto: 'Lave bem e deixe de molho em água com hipoclorito para evitar toxoplasmose.' }
    ],

    sinaisAlerta: [
      'Sangramento vaginal',
      'Perda de líquido pela vagina',
      'Dor de cabeça forte, visão embaçada ou pontos de luz',
      'Inchaço repentino no rosto, nas mãos ou nos pés',
      'Febre ou ardência forte ao urinar',
      'Bebê se mexendo bem menos que o normal',
      'Contrações regulares antes da 37ª semana',
      'Dor forte na barriga'
    ],

    dicasBebe: [
      { titulo: 'Converse e cante', texto: 'A partir da 18ª semana o bebê começa a ouvir. Sua voz é o som que ele mais vai reconhecer ao nascer.' },
      { titulo: 'Leia em voz alta', texto: 'Escolha um livrinho e leia sempre o mesmo. Depois do parto, ele pode acalmar o bebê.' },
      { titulo: 'Música calma', texto: 'Músicas tranquilas em volume moderado relaxam você, e o bebê sente.' },
      { titulo: 'Toque na barriga', texto: 'A partir do 2º trimestre, o bebê reage ao toque. Um carinho é um bom momento a dois (ou a três).' },
      { titulo: 'Prato colorido', texto: 'O que você come nutre o bebê. Frutas, verduras, feijão, ovos e carnes magras fornecem o que ele precisa para crescer.' },
      { titulo: 'Água ao longo do dia', texto: 'A hidratação ajuda a manter o líquido amniótico e previne infecção urinária.' },
      { titulo: 'Movimente-se', texto: 'Caminhada, hidroginástica e alongamento costumam ser liberados e fazem bem aos dois. Confirme com o médico.' },
      { titulo: 'Durma bem', texto: 'Descanso de qualidade ajuda o bebê a crescer. No 3º trimestre, durma de lado.' },
      { titulo: 'Cuide das emoções', texto: 'Ansiedade é comum. Converse, peça ajuda e conte ao médico se a tristeza durar dias.' },
      { titulo: 'Pré-natal em dia', texto: 'Cada consulta acompanha o crescimento do bebê. Não falte e leve suas dúvidas anotadas.' }
    ]
  };
})();
