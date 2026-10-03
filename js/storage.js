/* ==========================================================================
   PontoFit — storage.js
   ÚNICA camada de dados do site. Todo o resto chama PF.storage.* e nunca
   toca no localStorage diretamente.

   Hoje:   localStorage / sessionStorage do navegador.
   Amanhã: fetch('/api/...') (Fase 11). Por isso TODAS as funções já
           retornam Promise, como uma API real — quem usa sempre faz `await`.
           Para migrar, basta reescrever o corpo de cada função aqui.

   ⚠️  PROTÓTIPO — NÃO É SEGURO.
   Login com localStorage serve só para demonstrar o fluxo: os dados ficam
   no próprio navegador e qualquer pessoa com acesso ao dispositivo consegue
   lê-los ou alterá-los. O hash de senha abaixo NÃO protege nada de verdade.
   Na fase da Vercel, trocar por autenticação real (Auth.js, Supabase Auth
   ou Clerk), com a senha guardada como hash (bcrypt/argon2) NO SERVIDOR e a
   sessão em cookie httpOnly. Dados de saúde são sensíveis pela LGPD.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  var CHAVE_USUARIOS = 'pf:usuarios';
  var CHAVE_SESSAO = 'pf:sessao';
  var PREFIXO_DADOS = 'pf:dados:';

  /* ---------- Utilitários internos ---------- */
  function ler(armazem, chave, padrao) {
    try {
      var v = armazem.getItem(chave);
      return v ? JSON.parse(v) : padrao;
    } catch (e) {
      return padrao;
    }
  }
  function gravar(armazem, chave, valor) {
    armazem.setItem(chave, JSON.stringify(valor));
  }
  function remover(armazem, chave) {
    try { armazem.removeItem(chave); } catch (e) { /* armazenamento bloqueado */ }
  }

  function erro(codigo, mensagem) {
    var e = new Error(mensagem);
    e.codigo = codigo;
    return e;
  }

  // Simula a latência de uma requisição, para os estados de "carregando"
  // se comportarem como vão se comportar com a API. Remover na Fase 11.
  function latencia(ms) {
    return new Promise(function (r) { setTimeout(r, ms || 350); });
  }

  function gerarId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function gerarSalt() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return paraHex(bytes);
  }

  function paraHex(bytes) {
    return Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  // Só para não guardar a senha em texto puro no protótipo (ver aviso no topo).
  async function hashSenha(senha, salt) {
    var texto = salt + ':' + senha;
    if (window.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
      return paraHex(new Uint8Array(buf));
    }
    // Navegadores sem crypto.subtle (contexto não seguro): hash simples FNV-1a.
    var h = 0x811c9dc5;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return 'fnv-' + h.toString(16);
  }

  /** Data local 'AAAA-MM-DD' daqui a N dias. */
  function diasAFrente(n) {
    var d = new Date();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function normalizarEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function usuarioPublico(u) {
    return { id: u.id, nome: u.nome, email: u.email, criadoEm: u.criadoEm, plano: u.plano || null, testeGratisAte: u.testeGratisAte || null };
  }

  function lerUsuarios() { return ler(localStorage, CHAVE_USUARIOS, []); }

  function lerSessao() {
    return ler(sessionStorage, CHAVE_SESSAO, null) || ler(localStorage, CHAVE_SESSAO, null);
  }

  function criarSessao(usuarioId, lembrar) {
    remover(sessionStorage, CHAVE_SESSAO);
    remover(localStorage, CHAVE_SESSAO);
    // "Lembrar de mim" → continua logado ao fechar o navegador.
    gravar(lembrar ? localStorage : sessionStorage, CHAVE_SESSAO, {
      usuarioId: usuarioId,
      criadaEm: new Date().toISOString()
    });
  }

  function usuarioAtualId() {
    var s = lerSessao();
    if (!s) throw erro('SEM_SESSAO', 'Sua sessão expirou. Entre novamente.');
    return s.usuarioId;
  }

  // Dados do paciente logado: { ficha, pesos, medicamentos, aplicacoes, cesta, assinatura }
  function lerDados() {
    var id = usuarioAtualId();
    return ler(localStorage, PREFIXO_DADOS + id, { ficha: {}, pesos: [], medicamentos: [], nomesMedicamentos: [], aplicacoes: [], cesta: [] });
  }
  function gravarDados(dados) {
    gravar(localStorage, PREFIXO_DADOS + usuarioAtualId(), dados);
  }

  function porData(a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; }

  /* ---------- Medicamentos: nomes padrão e migração ----------
     Versões anteriores guardavam um único "produto". Na primeira leitura
     ele vira o primeiro medicamento e as aplicações passam a apontar
     para ele. */
  var NOMES_PADRAO = ['Mounjaro', 'Testosterona'];

  function migrarMedicamentos(dados) {
    if (Array.isArray(dados.medicamentos)) {
      dados.nomesMedicamentos = dados.nomesMedicamentos || [];
      return dados;
    }
    dados.medicamentos = [];
    dados.nomesMedicamentos = [];
    dados.aplicacoes = dados.aplicacoes || [];
    var p = dados.produto;
    if (p && p.intervaloDias) {
      var med = Object.assign({ id: gerarId(), criadoEm: new Date().toISOString() }, p, { nome: p.nome || 'Mounjaro' });
      dados.medicamentos.push(med);
      dados.aplicacoes.forEach(function (a) { if (!a.medicamentoId) a.medicamentoId = med.id; });
    }
    delete dados.produto;
    gravarDados(dados);
    return dados;
  }

  /* ---------- Conta de teste (só em ambiente local) ----------
     admin@admin.com / admin, criada direto aqui porque a senha não passa
     na regra do cadastro (8+ caracteres com letras e números). Nunca é
     criada em domínio público, onde uma senha fixa seria uma porta aberta. */
  var CONTA_TESTE = { nome: 'Administrador', email: 'admin@admin.com', senha: 'admin' };

  function ambienteLocal() {
    var h = location.hostname;
    return location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }

  async function garantirContaTeste() {
    if (!ambienteLocal()) return;
    var usuarios = lerUsuarios();
    if (usuarios.some(function (u) { return u.email === CONTA_TESTE.email; })) return;
    var salt = gerarSalt();
    var usuario = {
      id: gerarId(),
      nome: CONTA_TESTE.nome,
      email: CONTA_TESTE.email,
      senhaHash: await hashSenha(CONTA_TESTE.senha, salt),
      salt: salt,
      criadoEm: new Date().toISOString(),
      aceiteAvisoSaude: true
    };
    usuarios.push(usuario);
    gravar(localStorage, CHAVE_USUARIOS, usuarios);
    gravar(localStorage, PREFIXO_DADOS + usuario.id, {
      ficha: { nome: usuario.nome, email: usuario.email }, pesos: [], medicamentos: [], nomesMedicamentos: [], aplicacoes: [], cesta: []
    });
  }

  // Login e cadastro esperam a conta de teste existir antes de consultar.
  var contaTestePronta = garantirContaTeste().catch(function () { /* armazenamento bloqueado */ });

  /* ======================================================================
     API pública — os nomes espelham os endpoints previstos em /api
     ====================================================================== */
  PF.storage = {

    /* ---------- Autenticação (POST /api/auth/...) ---------- */

    /** Cria a conta e já inicia a sessão. → usuário */
    cadastrar: async function (dados) {
      await latencia();
      await contaTestePronta;
      var nome = String(dados.nome || '').trim();
      var email = normalizarEmail(dados.email);
      var senha = String(dados.senha || '');
      if (!nome || !email || !senha) throw erro('DADOS_INVALIDOS', 'Preencha todos os campos.');

      var usuarios = lerUsuarios();
      if (usuarios.some(function (u) { return u.email === email; })) {
        throw erro('EMAIL_EM_USO', 'Já existe uma conta com este e-mail.');
      }

      var salt = gerarSalt();
      var usuario = {
        id: gerarId(),
        nome: nome,
        email: email,
        senhaHash: await hashSenha(senha, salt),
        salt: salt,
        criadoEm: new Date().toISOString(),
        aceiteAvisoSaude: !!dados.aceiteAvisoSaude,
        plano: dados.plano === 'anual' ? 'anual' : 'mensal',
        testeGratisAte: diasAFrente(30) // teste grátis de 30 dias
      };
      usuarios.push(usuario);
      gravar(localStorage, CHAVE_USUARIOS, usuarios);

      criarSessao(usuario.id, false);
      gravarDados({ ficha: { nome: nome, email: email }, pesos: [], medicamentos: [], nomesMedicamentos: [], aplicacoes: [], cesta: [] });
      return usuarioPublico(usuario);
    },

    /** Faz login. → usuário. Erro com codigo 'CREDENCIAIS' se não bater. */
    entrar: async function (email, senha, lembrar) {
      await latencia();
      await contaTestePronta;
      var alvo = normalizarEmail(email);
      var usuario = lerUsuarios().find(function (u) { return u.email === alvo; });
      // Mesma mensagem para e-mail inexistente e senha errada (não revela quem tem conta).
      if (!usuario || (await hashSenha(String(senha || ''), usuario.salt)) !== usuario.senhaHash) {
        throw erro('CREDENCIAIS', 'E-mail ou senha incorretos.');
      }
      criarSessao(usuario.id, !!lembrar);
      return usuarioPublico(usuario);
    },

    sair: async function () {
      remover(sessionStorage, CHAVE_SESSAO);
      remover(localStorage, CHAVE_SESSAO);
    },

    /** Usuário logado ou null. */
    getUser: async function () {
      var s = lerSessao();
      if (!s) return null;
      var usuario = lerUsuarios().find(function (u) { return u.id === s.usuarioId; });
      if (!usuario) { await PF.storage.sair(); return null; }
      return usuarioPublico(usuario);
    },

    /* ---------- Ficha (GET/PUT /api/ficha) ---------- */

    getFicha: async function () {
      return lerDados().ficha || {};
    },

    /** Mescla os campos enviados com a ficha atual. → ficha completa */
    saveFicha: async function (campos) {
      await latencia();
      var dados = lerDados();
      dados.ficha = Object.assign({}, dados.ficha, campos, { atualizadoEm: new Date().toISOString() });
      gravarDados(dados);

      // Mantém o nome do usuário em dia com a ficha.
      if (campos.nome) {
        var id = usuarioAtualId();
        var usuarios = lerUsuarios();
        usuarios.forEach(function (u) { if (u.id === id) u.nome = String(campos.nome).trim(); });
        gravar(localStorage, CHAVE_USUARIOS, usuarios);
      }
      return dados.ficha;
    },

    /* ---------- Peso (GET/POST/DELETE /api/peso) ---------- */

    /** Registros em ordem de data: [{ id, data:'AAAA-MM-DD', pesoKg, cinturaCm }] */
    getPesos: async function () {
      return lerDados().pesos.slice().sort(porData);
    },

    addPeso: async function (registro) {
      var dados = lerDados();
      var novo = {
        id: gerarId(),
        data: registro.data,
        pesoKg: Number(registro.pesoKg),
        cinturaCm: registro.cinturaCm == null || registro.cinturaCm === '' ? null : Number(registro.cinturaCm)
      };
      dados.pesos.push(novo);
      gravarDados(dados);
      return novo;
    },

    removePeso: async function (id) {
      var dados = lerDados();
      dados.pesos = dados.pesos.filter(function (p) { return p.id !== id; });
      gravarDados(dados);
    },

    /* ---------- Medicamentos (GET/PUT/DELETE /api/medicamentos) ----------
       [{ id, nome, doseMl, doseMg, intervaloValor, intervaloUnidade,
          intervaloDias, dataUltimaAplicacao, observacoes, criadoEm }] */
    getMedicamentos: async function () {
      return migrarMedicamentos(lerDados()).medicamentos.slice();
    },

    /** Cria (sem id) ou atualiza (com id). → medicamento salvo */
    saveMedicamento: async function (med) {
      await latencia();
      var dados = migrarMedicamentos(lerDados());
      var salvo;
      if (med.id) {
        dados.medicamentos = dados.medicamentos.map(function (m) {
          if (m.id !== med.id) return m;
          salvo = Object.assign({}, m, med);
          return salvo;
        });
      }
      if (!salvo) {
        salvo = Object.assign({ id: gerarId(), criadoEm: new Date().toISOString() }, med);
        dados.medicamentos.push(salvo);
      }
      // Nomes criados pela pessoa ficam disponíveis para os próximos cadastros.
      var nome = String(salvo.nome || '').trim();
      if (nome && NOMES_PADRAO.indexOf(nome) < 0 && dados.nomesMedicamentos.indexOf(nome) < 0) {
        dados.nomesMedicamentos.push(nome);
      }
      gravarDados(dados);
      return salvo;
    },

    /** Remove o medicamento e as aplicações dele. → { medicamento, aplicacoes } (para desfazer) */
    removeMedicamento: async function (id) {
      var dados = migrarMedicamentos(lerDados());
      var removido = {
        medicamento: dados.medicamentos.find(function (m) { return m.id === id; }) || null,
        aplicacoes: dados.aplicacoes.filter(function (a) { return a.medicamentoId === id; })
      };
      dados.medicamentos = dados.medicamentos.filter(function (m) { return m.id !== id; });
      dados.aplicacoes = dados.aplicacoes.filter(function (a) { return a.medicamentoId !== id; });
      gravarDados(dados);
      return removido;
    },

    /** Desfaz removeMedicamento. */
    restaurarMedicamento: async function (removido) {
      var dados = migrarMedicamentos(lerDados());
      if (removido.medicamento) dados.medicamentos.push(removido.medicamento);
      dados.aplicacoes = dados.aplicacoes.concat(removido.aplicacoes || []);
      gravarDados(dados);
    },

    /** Nomes para escolher: os padrão e os que a pessoa já criou. */
    getNomesMedicamentos: async function () {
      return NOMES_PADRAO.concat(migrarMedicamentos(lerDados()).nomesMedicamentos);
    },

    /* ---------- Aplicações (GET/POST/DELETE /api/aplicacoes) ---------- */

    /** [{ id, medicamentoId, data:'AAAA-MM-DD', doseMl }] em ordem de data */
    getAplicacoes: async function (medicamentoId) {
      return migrarMedicamentos(lerDados()).aplicacoes.filter(function (a) {
        return !medicamentoId || a.medicamentoId === medicamentoId;
      }).sort(porData);
    },

    addAplicacao: async function (aplicacao) {
      var dados = migrarMedicamentos(lerDados());
      var nova = { id: gerarId(), medicamentoId: aplicacao.medicamentoId, data: aplicacao.data, doseMl: Number(aplicacao.doseMl) };
      dados.aplicacoes.push(nova);
      gravarDados(dados);
      return nova;
    },

    removeAplicacao: async function (id) {
      var dados = migrarMedicamentos(lerDados());
      dados.aplicacoes = dados.aplicacoes.filter(function (a) { return a.id !== id; });
      gravarDados(dados);
    },

    /* ---------- Cesta de compras (GET/PUT /api/cesta) ----------
       [{ id, texto, receitaId, receitaTitulo, comprado, criadoEm }] */
    getCesta: async function () {
      return (lerDados().cesta || []).slice();
    },

    saveCesta: async function (itens) {
      var dados = lerDados();
      dados.cesta = itens;
      gravarDados(dados);
      return itens;
    },

    /* ---------- Assinatura (GET/PUT /api/assinatura) ----------
       { plano: 'mensal'|'anual', testeGratisAte: 'AAAA-MM-DD',
         cobrancas: [{ id, numero, offsetMeses, vencimento, plano, valor, pagoEm }] }
       Contas antigas (sem plano) começam no mensal, com teste de 30 dias
       contado da criação da conta. */
    getAssinatura: async function () {
      var dados = lerDados();
      if (dados.assinatura) return dados.assinatura;
      var id = usuarioAtualId();
      var u = lerUsuarios().find(function (x) { return x.id === id; }) || {};
      var criada = u.criadoEm ? new Date(u.criadoEm) : new Date();
      criada.setDate(criada.getDate() + 30);
      return {
        plano: u.plano === 'anual' ? 'anual' : 'mensal',
        testeGratisAte: u.testeGratisAte || (criada.getFullYear() + '-' + String(criada.getMonth() + 1).padStart(2, '0') + '-' + String(criada.getDate()).padStart(2, '0')),
        cobrancas: []
      };
    },

    saveAssinatura: async function (assinatura) {
      var dados = lerDados();
      dados.assinatura = assinatura;
      gravarDados(dados);
      return assinatura;
    }
  };
})();
