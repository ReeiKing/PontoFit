/* ==========================================================================
   PontoFit — storage.js
   ÚNICA camada de dados do site. O resto do código chama PF.storage.* e não
   sabe onde os dados moram.

   Agora: Supabase.
   - Login, senha e sessão: Supabase Auth (a senha é guardada com hash pelo
     serviço e nunca passa pelas nossas tabelas).
   - Dados de cada cliente: tabelas do schema public, protegidas por RLS
     (cada pessoa só lê e altera o que é dela). Ver supabase/migrations/.

   Precisa, antes deste arquivo:
     js/vendor/supabase.js  (cópia de @supabase/supabase-js, feita pelo build)
     js/config.js           (URL e chave publicável, geradas do .env pelo build)
   Rode `npm run build` depois de clonar ou de mudar o .env.

   Todas as funções retornam Promise e mantêm os mesmos nomes e formatos
   (camelCase) da versão anterior, que usava localStorage.
   ========================================================================== */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* ---------- UUID v4 (formato das chaves no banco) ---------- */
  PF.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };

  /* ---------- Configuração ---------- */
  var cfg = window.PF_CONFIG;
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) {
    var aviso = 'Configuração da Supabase ausente. Rode "npm run build" (ele lê o .env e gera js/config.js).';
    console.error(aviso);
    PF.storage = null;
    PF.storageErro = aviso;
    document.addEventListener('DOMContentLoaded', function () {
      var faixa = document.createElement('p');
      faixa.setAttribute('role', 'alert');
      faixa.style.cssText = 'position:fixed;inset:auto 0 0 0;z-index:9999;margin:0;padding:12px 16px;background:#B03A32;color:#fff;font:600 14px/1.4 system-ui';
      faixa.textContent = aviso;
      document.body.appendChild(faixa);
    });
    return;
  }

  // O link de "esqueci minha senha" volta com #...type=recovery; a Supabase
  // apaga o hash ao ler, então guardamos a informação antes de criar o cliente.
  PF.recuperacaoDeSenha = /(^|[#&])type=recovery(&|$)/.test(location.hash);

  /* ---------- Sessão: "Lembrar de mim" ----------
     Marcado: sessão no localStorage (continua ao fechar o navegador).
     Desmarcado: sessionStorage (termina ao fechar a aba). */
  var CHAVE_LEMBRAR = 'pf:lembrar';
  function lembrar() {
    try { return localStorage.getItem(CHAVE_LEMBRAR) === '1'; } catch (e) { return false; }
  }
  function definirLembrar(valor) {
    try { localStorage.setItem(CHAVE_LEMBRAR, valor ? '1' : '0'); } catch (e) { /* bloqueado */ }
  }
  var armazenamentoSessao = {
    getItem: function (k) {
      try { return sessionStorage.getItem(k) || localStorage.getItem(k); } catch (e) { return null; }
    },
    setItem: function (k, v) {
      try {
        if (lembrar()) { localStorage.setItem(k, v); sessionStorage.removeItem(k); }
        else { sessionStorage.setItem(k, v); localStorage.removeItem(k); }
      } catch (e) { /* bloqueado */ }
    },
    removeItem: function (k) {
      try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (e) { /* bloqueado */ }
    }
  };

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: {
      storage: armazenamentoSessao,
      storageKey: 'pontofit-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  PF.supabase = sb;

  /* ---------- Utilitários ---------- */
  function erro(codigo, mensagem, original) {
    var e = new Error(mensagem);
    e.codigo = codigo;
    if (original) e.original = original;
    return e;
  }

  // Erros da Supabase em português, com código estável para as telas.
  var ERROS_AUTH = {
    invalid_credentials: ['CREDENCIAIS', 'E-mail ou senha incorretos.'],
    email_not_confirmed: ['EMAIL_NAO_CONFIRMADO', 'Confirme seu e-mail antes de entrar. Procure o link que enviamos para a sua caixa de entrada.'],
    user_already_exists: ['EMAIL_EM_USO', 'Já existe uma conta com este e-mail. Entre com ela ou use "Esqueci minha senha".'],
    email_exists: ['EMAIL_EM_USO', 'Já existe uma conta com este e-mail. Entre com ela ou use "Esqueci minha senha".'],
    weak_password: ['SENHA_FRACA', 'Essa senha é fraca demais. Use pelo menos 8 caracteres, com letras e números.'],
    over_email_send_rate_limit: ['LIMITE_EMAIL', 'Muitos e-mails enviados em pouco tempo. Espere alguns minutos e tente de novo.'],
    over_request_rate_limit: ['LIMITE', 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.'],
    email_address_invalid: ['EMAIL_INVALIDO', 'Esse e-mail não foi aceito. Confira se está certo.'],
    signup_disabled: ['CADASTRO_FECHADO', 'Novos cadastros estão desativados no momento.'],
    same_password: ['SENHA_IGUAL', 'A nova senha precisa ser diferente da atual.']
  };

  function traduzirAuth(e) {
    var m = e && e.code && ERROS_AUTH[e.code];
    if (m) return erro(m[0], m[1], e);
    if (e && /Invalid login credentials/i.test(e.message)) return erro('CREDENCIAIS', ERROS_AUTH.invalid_credentials[1], e);
    if (e && /Email not confirmed/i.test(e.message)) return erro('EMAIL_NAO_CONFIRMADO', ERROS_AUTH.email_not_confirmed[1], e);
    if (e && /fetch|network/i.test(e.message)) return erro('REDE', 'Sem conexão com o servidor. Verifique sua internet e tente de novo.', e);
    return erro('AUTH', 'Não foi possível concluir. Tente de novo em instantes.', e);
  }

  function traduzirDados(e) {
    if (!e) return erro('DADOS', 'Não foi possível salvar. Tente de novo.');
    if (e.code === '23505') return erro('DUPLICADO', 'Esse registro já existe.', e);
    if (e.code === 'PGRST301' || /jwt expired/i.test(e.message || '')) return erro('SEM_SESSAO', 'Sua sessão expirou. Entre novamente.', e);
    if (e.code === '42501') return erro('SEM_PERMISSAO', 'Não foi possível carregar esta parte agora. Atualize a página e, se continuar, fale com o suporte.', e);
    if (/fetch|network/i.test(e.message || '')) return erro('REDE', 'Sem conexão com o servidor. Verifique sua internet e tente de novo.', e);
    return erro('DADOS', 'Não foi possível salvar. Tente de novo.', e);
  }

  /** Executa uma consulta da Supabase e devolve só os dados (ou lança erro em português). */
  async function q(promessa) {
    var r = await promessa;
    if (r.error) throw traduzirDados(r.error);
    return r.data;
  }

  async function uid() {
    var r = await sb.auth.getSession();
    var id = r.data && r.data.session && r.data.session.user && r.data.session.user.id;
    if (!id) throw erro('SEM_SESSAO', 'Sua sessão expirou. Entre novamente.');
    return id;
  }

  function mensagemDe(m, eu) {
    return { id: m.id, autorId: m.autor_id, texto: m.texto || '', anexo: m.anexo_path || null, criadoEm: m.criado_em, lidaEm: m.lida_em, minha: m.autor_id === eu };
  }

  function vazioParaNulo(v) {
    return v === '' || v === undefined ? null : v;
  }
  function num(v) {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  function urlDe(pagina) {
    // Em file:// não há origem válida; a Supabase usa então a Site URL do projeto.
    return location.protocol.indexOf('http') === 0 ? location.origin + location.pathname.replace(/[^/]*$/, '') + pagina : undefined;
  }

  /* ---------- Conversão entre o banco (snake_case) e o app (camelCase) ---------- */
  // [campo no app, coluna no banco, tipo]
  var CAMPOS_FICHA = [
    ['nome', 'nome'], ['dataNascimento', 'data_nascimento'], ['sexo', 'sexo'], ['telefone', 'telefone'],
    ['cidade', 'cidade'], ['estado', 'estado'], ['alturaCm', 'altura_cm', 'n'], ['pesoInicialKg', 'peso_inicial_kg', 'n'],
    ['dataPesoInicial', 'data_peso_inicial'], ['cinturaCm', 'cintura_cm', 'n'], ['objetivo', 'objetivo'],
    ['nivelAtividade', 'nivel_atividade'], ['condicoesSaude', 'condicoes_saude', 'a'], ['condicoesOutras', 'condicoes_outras'],
    ['alergias', 'alergias'], ['medicamentos', 'medicamentos_em_uso'], ['profissionalNome', 'profissional_nome'],
    ['profissionalContato', 'profissional_contato'], ['observacoes', 'observacoes'], ['metaPesoKg', 'meta_peso_kg', 'n'],
    ['metaData', 'meta_data'], ['marcosVistos', 'marcos_vistos', 'a'], ['atualizadoEm', 'atualizado_em'],
    ['gestante', 'gestante', 'b'], ['gestacaoDum', 'gestacao_dum'], ['gestacaoDpp', 'gestacao_dpp'],
    ['pesoPreGestacionalKg', 'peso_pre_gestacional_kg', 'n'], ['recipienteMl', 'recipiente_ml', 'n']
  ];
  var CAMPOS_MED = [
    ['nome', 'nome'], ['doseMl', 'dose_ml', 'n'], ['doseMg', 'dose_mg', 'n'], ['intervaloValor', 'intervalo_valor', 'n'],
    ['intervaloUnidade', 'intervalo_unidade'], ['intervaloDias', 'intervalo_dias', 'n'],
    ['dataUltimaAplicacao', 'data_ultima_aplicacao'], ['observacoes', 'observacoes'], ['criadoEm', 'criado_em']
  ];

  function doBanco(linha, campos) {
    var o = {};
    if (!linha) return o;
    campos.forEach(function (c) {
      var v = linha[c[1]];
      if (c[2] === 'n') o[c[0]] = num(v);
      else if (c[2] === 'b') o[c[0]] = !!v;
      else if (c[2] === 'a') o[c[0]] = v || [];
      else o[c[0]] = v === null ? '' : v;
    });
    return o;
  }

  /** Só os campos enviados viram colunas (atualização parcial). */
  function paraBanco(objeto, campos) {
    var linha = {};
    campos.forEach(function (c) {
      if (!Object.prototype.hasOwnProperty.call(objeto, c[0]) || c[0] === 'atualizadoEm' || c[0] === 'criadoEm') return;
      var v = objeto[c[0]];
      if (c[2] === 'n') linha[c[1]] = num(v);
      else if (c[2] === 'b') linha[c[1]] = !!v;
      else if (c[2] === 'a') linha[c[1]] = Array.isArray(v) ? v : [];
      else linha[c[1]] = vazioParaNulo(typeof v === 'string' ? v.trim() : v);
    });
    return linha;
  }

  function medDoBanco(l) {
    var m = doBanco(l, CAMPOS_MED);
    m.id = l.id;
    return m;
  }
  function aplicacaoDoBanco(l) {
    return { id: l.id, medicamentoId: l.medicamento_id, data: l.data, doseMl: num(l.dose_ml) };
  }
  function pesoDoBanco(l) {
    return { id: l.id, data: l.data, pesoKg: num(l.peso_kg), cinturaCm: num(l.cintura_cm) };
  }
  function itemCestaDoBanco(l) {
    return { id: l.id, texto: l.texto, receitaId: l.receita_id, receitaTitulo: l.receita_titulo || '', comprado: !!l.comprado, criadoEm: l.criado_em };
  }
  function pagamentoDoBanco(l, meio) {
    return { id: l.id, meio: meio, plano: l.plano, valor: num(l.valor), status: l.status, criadoEm: l.criado_em, aprovadoEm: l.aprovado_em };
  }

  var NOMES_PADRAO = ['Mounjaro', 'Testosterona'];

  /* ======================================================================
     API pública
     ====================================================================== */
  PF.storage = {

    /* ---------- Autenticação ---------- */

    /**
     * Cria a conta. → { usuario, precisaConfirmar }
     * Com a confirmação de e-mail ligada no projeto, a pessoa só entra
     * depois de clicar no link (precisaConfirmar = true).
     */
    cadastrar: async function (dados) {
      definirLembrar(false);
      var r = await sb.auth.signUp({
        email: String(dados.email || '').trim().toLowerCase(),
        password: String(dados.senha || ''),
        options: {
          // Só preenche o perfil (nome e plano); não é usado para autorização.
          data: dados.tipo === 'profissional' ? {
            // Profissional: CPF opcional; o banco cria o painel profissional junto.
            tipo: 'profissional',
            nome: String(dados.nome || '').trim(),
            profissao: String(dados.profissao || 'outro'),
            registro: String(dados.registro || '').trim(),
            empresa: String(dados.empresa || '').trim(),
            cpf: String(dados.cpf || '').replace(/\D/g, ''),
            aceite_aviso_saude: !!dados.aceiteAvisoSaude
          } : {
            nome: String(dados.nome || '').trim(),
            plano: ['semanal', 'mensal', 'semestral'].indexOf(dados.plano) !== -1 ? dados.plano : 'mensal',
            cpf: String(dados.cpf || '').replace(/\D/g, ''), // o banco valida e exige CPF único
            aceite_aviso_saude: !!dados.aceiteAvisoSaude
          },
          emailRedirectTo: urlDe(dados.tipo === 'profissional' ? 'profissional.html' : 'app.html')
        }
      });
      // O gatilho do banco recusa CPF repetido (ou inválido); a Supabase devolve
      // "Database error saving new user". O app já validou os dígitos, então
      // o motivo é CPF já cadastrado.
      if (r.error && /database error saving new user/i.test(r.error.message || '')) {
        throw erro('CPF_EM_USO', 'Já existe uma conta com este CPF. Entre com ela ou use "Esqueci minha senha".', r.error);
      }
      if (r.error) throw traduzirAuth(r.error);
      var user = r.data.user;
      // Com confirmação ligada, e-mail já cadastrado volta sem erro e sem identidades.
      if (user && Array.isArray(user.identities) && user.identities.length === 0) {
        throw erro('EMAIL_EM_USO', ERROS_AUTH.user_already_exists[1]);
      }
      return {
        usuario: user ? { id: user.id, nome: String(dados.nome || '').trim(), email: user.email } : null,
        precisaConfirmar: !r.data.session
      };
    },

    /** Reenvia o e-mail de confirmação do cadastro. */
    reenviarConfirmacao: async function (email) {
      var r = await sb.auth.resend({ type: 'signup', email: String(email || '').trim().toLowerCase(), options: { emailRedirectTo: urlDe('app.html') } });
      if (r.error) throw traduzirAuth(r.error);
    },

    /** Faz login. → usuário. Erro com codigo 'CREDENCIAIS' se não bater. */
    entrar: async function (email, senha, lembrarDeMim) {
      definirLembrar(!!lembrarDeMim);
      var r = await sb.auth.signInWithPassword({ email: String(email || '').trim().toLowerCase(), password: String(senha || '') });
      if (r.error) throw traduzirAuth(r.error);
      return PF.storage.getUser();
    },

    /** Envia o link para criar uma nova senha (não revela se o e-mail existe). */
    recuperarSenha: async function (email) {
      var r = await sb.auth.resetPasswordForEmail(String(email || '').trim().toLowerCase(), { redirectTo: urlDe('login.html') });
      if (r.error && r.error.code !== 'user_not_found') throw traduzirAuth(r.error);
    },

    /** Define a nova senha (depois de abrir o link de recuperação). */
    definirNovaSenha: async function (senha) {
      var r = await sb.auth.updateUser({ password: String(senha || '') });
      if (r.error) throw traduzirAuth(r.error);
    },

    sair: async function () {
      await sb.auth.signOut();
    },

    /** Usuário logado ou null. → { id, nome, email, plano, testeGratisAte, criadoEm } */
    getUser: async function () {
      var r = await sb.auth.getSession();
      var user = r.data && r.data.session && r.data.session.user;
      if (!user) return null;
      var perfil = null;
      try {
        var p = await sb.from('perfis').select('nome, plano, teste_gratis_ate, criado_em').eq('id', user.id).maybeSingle();
        perfil = p.data;
      } catch (e) { perfil = null; }
      var meta = user.user_metadata || {};
      return {
        id: user.id,
        nome: (perfil && perfil.nome) || meta.nome || user.email,
        email: user.email,
        plano: (perfil && perfil.plano) || meta.plano || 'mensal',
        testeGratisAte: perfil ? perfil.teste_gratis_ate : null,
        criadoEm: (perfil && perfil.criado_em) || user.created_at
      };
    },

    /** Avisa quando a sessão muda (ex.: saiu em outra aba). */
    aoMudarSessao: function (callback) {
      sb.auth.onAuthStateChange(function (evento, sessao) { callback(evento, sessao); });
    },

    /* ---------- Ficha ---------- */

    getFicha: async function () {
      var id = await uid();
      var linha = await q(sb.from('fichas').select('*').eq('usuario_id', id).maybeSingle());
      return doBanco(linha, CAMPOS_FICHA);
    },

    /** Grava só os campos enviados. → ficha completa */
    saveFicha: async function (campos) {
      var id = await uid();
      var linha = paraBanco(campos, CAMPOS_FICHA);
      linha.usuario_id = id;
      var salva = await q(sb.from('fichas').upsert(linha, { onConflict: 'usuario_id' }).select('*').single());
      // O nome também aparece no perfil (menu, saudação).
      if (Object.prototype.hasOwnProperty.call(campos, 'nome') && String(campos.nome || '').trim()) {
        await q(sb.from('perfis').update({ nome: String(campos.nome).trim() }).eq('id', id));
      }
      return doBanco(salva, CAMPOS_FICHA);
    },

    /* ---------- Peso ---------- */

    getPesos: async function () {
      var linhas = await q(sb.from('registros_peso').select('id, data, peso_kg, cintura_cm').order('data', { ascending: true }));
      return linhas.map(pesoDoBanco);
    },

    addPeso: async function (registro) {
      var id = await uid();
      var l = await q(sb.from('registros_peso').insert({
        usuario_id: id,
        data: registro.data,
        peso_kg: num(registro.pesoKg),
        cintura_cm: num(registro.cinturaCm)
      }).select('id, data, peso_kg, cintura_cm').single());
      return pesoDoBanco(l);
    },

    removePeso: async function (idRegistro) {
      await q(sb.from('registros_peso').delete().eq('id', idRegistro));
    },

    /* ---------- Medicamentos ---------- */

    getMedicamentos: async function () {
      var linhas = await q(sb.from('medicamentos').select('*').order('criado_em', { ascending: true }));
      return linhas.map(medDoBanco);
    },

    /** Cria (sem id) ou atualiza só os campos enviados (com id). → medicamento salvo */
    saveMedicamento: async function (med) {
      var id = await uid();
      var linha = paraBanco(med, CAMPOS_MED);
      var salvo;
      try {
        if (med.id) {
          salvo = await q(sb.from('medicamentos').update(linha).eq('id', med.id).select('*').single());
        } else {
          linha.usuario_id = id;
          salvo = await q(sb.from('medicamentos').insert(linha).select('*').single());
        }
      } catch (e) {
        if (e.codigo === 'DUPLICADO') throw erro('NOME_REPETIDO', 'Você já tem ' + med.nome + ' cadastrado.', e.original);
        throw e;
      }
      // Nome criado pela pessoa vira opção nos próximos cadastros.
      var nome = String(salvo.nome || '').trim();
      if (nome && NOMES_PADRAO.indexOf(nome) < 0) {
        await q(sb.from('nomes_medicamentos').upsert({ usuario_id: id, nome: nome }, { onConflict: 'usuario_id,nome', ignoreDuplicates: true }));
      }
      return medDoBanco(salvo);
    },

    /** Remove o medicamento e as aplicações dele. → { medicamento, aplicacoes } (para desfazer) */
    removeMedicamento: async function (idMed) {
      var med = await q(sb.from('medicamentos').select('*').eq('id', idMed).maybeSingle());
      var apl = await q(sb.from('aplicacoes').select('*').eq('medicamento_id', idMed));
      await q(sb.from('medicamentos').delete().eq('id', idMed)); // aplicações saem em cascata
      return { medicamento: med, aplicacoes: apl };
    },

    /** Desfaz removeMedicamento (recria com os mesmos ids). */
    restaurarMedicamento: async function (removido) {
      if (!removido || !removido.medicamento) return;
      await q(sb.from('medicamentos').insert(removido.medicamento));
      if (removido.aplicacoes && removido.aplicacoes.length) {
        await q(sb.from('aplicacoes').insert(removido.aplicacoes));
      }
    },

    /** Nomes para escolher: os padrão e os que a pessoa já criou. */
    getNomesMedicamentos: async function () {
      var linhas = await q(sb.from('nomes_medicamentos').select('nome').order('criado_em', { ascending: true }));
      return NOMES_PADRAO.concat(linhas.map(function (l) { return l.nome; }).filter(function (n) { return NOMES_PADRAO.indexOf(n) < 0; }));
    },

    /* ---------- Aplicações ---------- */

    getAplicacoes: async function (medicamentoId) {
      var consulta = sb.from('aplicacoes').select('id, medicamento_id, data, dose_ml').order('data', { ascending: true });
      if (medicamentoId) consulta = consulta.eq('medicamento_id', medicamentoId);
      var linhas = await q(consulta);
      return linhas.map(aplicacaoDoBanco);
    },

    addAplicacao: async function (aplicacao) {
      var id = await uid();
      var l = await q(sb.from('aplicacoes').insert({
        usuario_id: id,
        medicamento_id: aplicacao.medicamentoId,
        data: aplicacao.data,
        dose_ml: num(aplicacao.doseMl)
      }).select('id, medicamento_id, data, dose_ml').single());
      return aplicacaoDoBanco(l);
    },

    removeAplicacao: async function (idAplicacao) {
      await q(sb.from('aplicacoes').delete().eq('id', idAplicacao));
    },

    /* ---------- Cesta de compras ---------- */

    getCesta: async function () {
      var linhas = await q(sb.from('cesta_itens').select('*').order('posicao', { ascending: true }).order('criado_em', { ascending: true }));
      return linhas.map(itemCestaDoBanco);
    },

    /** Grava a lista inteira (ordem incluída): atualiza/insere os itens e apaga os que saíram. */
    saveCesta: async function (itens) {
      var id = await uid();
      var linhas = itens.map(function (i, pos) {
        return {
          id: i.id, usuario_id: id, texto: i.texto, receita_id: i.receitaId || null,
          receita_titulo: i.receitaTitulo || null, comprado: !!i.comprado, posicao: pos
        };
      });
      if (linhas.length) await q(sb.from('cesta_itens').upsert(linhas, { onConflict: 'id' }));
      var apagar = sb.from('cesta_itens').delete().eq('usuario_id', id);
      if (linhas.length) apagar = apagar.not('id', 'in', '(' + linhas.map(function (l) { return l.id; }).join(',') + ')');
      await q(apagar);
      return itens;
    },

    /* ---------- Água do dia ---------- */

    /** Registros desde uma data (AAAA-MM-DD). → [{ data, ml, meta }] em mililitros (mais recente primeiro) */
    getAgua: async function (desde) {
      var linhas = await q(sb.from('registros_agua').select('data, ml, meta_ml').gte('data', desde).order('data', { ascending: false }));
      return linhas.map(function (l) { return { data: l.data, ml: l.ml, meta: l.meta_ml }; });
    },

    /** Grava a água de um dia em ml (cria ou atualiza). copos/meta guardam o equivalente em copos de 250 ml. */
    saveAgua: async function (data, ml, metaMl) {
      var id = await uid();
      await q(sb.from('registros_agua').upsert({
        usuario_id: id, data: data, ml: ml, meta_ml: metaMl,
        copos: Math.min(40, Math.round(ml / 250)), meta: Math.max(1, Math.min(40, Math.round(metaMl / 250))),
        atualizado_em: new Date().toISOString()
      }, { onConflict: 'usuario_id,data' }));
    },

    /* ---------- Exames de sangue ---------- */

    /** → [{ id, data, laboratorio, observacoes, arquivo, resultados: [{ marcador, nome, valor, unidade, refMin, refMax }] }] (mais recente primeiro) */
    getExames: async function () {
      var linhas = await q(sb.from('exames')
        .select('id, data, laboratorio, observacoes, arquivo_path, exame_resultados (marcador, nome, valor, unidade, ref_min, ref_max, posicao)')
        .order('data', { ascending: false }));
      return linhas.map(function (e) {
        return {
          id: e.id, data: e.data, laboratorio: e.laboratorio, observacoes: e.observacoes, arquivo: e.arquivo_path,
          resultados: (e.exame_resultados || []).sort(function (a, b) { return a.posicao - b.posicao; }).map(function (r) {
            return { marcador: r.marcador, nome: r.nome, valor: num(r.valor), unidade: r.unidade, refMin: num(r.ref_min), refMax: num(r.ref_max) };
          })
        };
      });
    },

    /**
     * Cria ou substitui um exame. campos: { id?, data, laboratorio, observacoes, resultados, arquivo?: File, removerArquivo?: bool, arquivoAtual? }
     * O laudo (PDF ou imagem, até 10 MB) vai para o bucket privado "exames" em <usuario>/<uuid>.<ext>.
     */
    saveExame: async function (campos) {
      var eu = await uid();
      var caminho = campos.removerArquivo ? null : (campos.arquivoAtual || null);
      if (campos.arquivo) {
        var ext = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[campos.arquivo.type];
        if (!ext) throw erro('ANEXO', 'Envie o laudo em PDF ou foto (JPG, PNG ou WebP).');
        if (campos.arquivo.size > 10 * 1024 * 1024) throw erro('ANEXO', 'O laudo passou de 10 MB. Envie um arquivo menor.');
        caminho = eu + '/' + crypto.randomUUID() + '.' + ext;
        var up = await sb.storage.from('exames').upload(caminho, campos.arquivo, { contentType: campos.arquivo.type, upsert: false });
        if (up.error) throw erro('ANEXO', 'Não foi possível enviar o laudo. Tente de novo.', up.error);
      }
      var linha = { data: campos.data, laboratorio: vazioParaNulo(campos.laboratorio), observacoes: vazioParaNulo(campos.observacoes), arquivo_path: caminho };
      var id = campos.id;
      if (id) {
        await q(sb.from('exames').update(linha).eq('id', id));
        await q(sb.from('exame_resultados').delete().eq('exame_id', id));
      } else {
        id = crypto.randomUUID();
        await q(sb.from('exames').insert(Object.assign({ id: id, usuario_id: eu }, linha)));
      }
      var resultados = (campos.resultados || []).map(function (r, i) {
        return { exame_id: id, usuario_id: eu, marcador: r.marcador, nome: r.nome, valor: r.valor, unidade: vazioParaNulo(r.unidade), ref_min: r.refMin, ref_max: r.refMax, posicao: i };
      });
      if (resultados.length) await q(sb.from('exame_resultados').insert(resultados));
      // Laudo antigo trocado ou removido: apaga o arquivo.
      if (campos.arquivoAtual && campos.arquivoAtual !== caminho) await sb.storage.from('exames').remove([campos.arquivoAtual]);
      return id;
    },

    excluirExame: async function (id, arquivo) {
      await q(sb.from('exames').delete().eq('id', id));
      if (arquivo) await sb.storage.from('exames').remove([arquivo]);
    },

    /** Endereço temporário (1 hora) do laudo. */
    urlLaudo: async function (caminho) {
      var r = await sb.storage.from('exames').createSignedUrl(caminho, 3600);
      if (r.error) throw erro('ANEXO', 'Não foi possível abrir o laudo.', r.error);
      return r.data.signedUrl;
    },

    /* ---------- Receitas favoritas ---------- */

    /** → [id da receita, ...] */
    getFavoritas: async function () {
      var linhas = await q(sb.from('receitas_favoritas').select('receita_id'));
      return linhas.map(function (l) { return l.receita_id; });
    },

    /** Marca (favorita = true) ou desmarca uma receita. */
    alternarFavorita: async function (receitaId, favorita) {
      var id = await uid();
      if (favorita) {
        await q(sb.from('receitas_favoritas').upsert({ usuario_id: id, receita_id: receitaId }, { onConflict: 'usuario_id,receita_id', ignoreDuplicates: true }));
      } else {
        await q(sb.from('receitas_favoritas').delete().eq('usuario_id', id).eq('receita_id', receitaId));
      }
    },

    /* ---------- Assinaturas (planos avulsos) ---------- */

    /** → { plano (preferido), acessoAte, descontoPrimeiraCompra, pagamentos: [{ id, meio, plano, valor, status, criadoEm, aprovadoEm }] } */
    getAssinatura: async function () {
      var id = await uid();
      var res = await Promise.all([
        q(sb.from('perfis').select('plano, acesso_ate').eq('id', id).maybeSingle()),
        q(sb.from('pagamentos_pix').select('id, plano, valor, status, criado_em, aprovado_em')),
        q(sb.from('pagamentos_cartao').select('id, plano, valor, status, criado_em, aprovado_em')),
        q(sb.rpc('desconto_disponivel'))
      ]);
      var perfil = res[0];
      var pagamentos = res[1].map(function (l) { return pagamentoDoBanco(l, 'pix'); })
        .concat(res[2].map(function (l) { return pagamentoDoBanco(l, 'cartao'); }))
        .sort(function (x, y) { return x.criadoEm < y.criadoEm ? 1 : -1; });
      return {
        plano: (perfil && perfil.plano) || 'mensal',
        acessoAte: (perfil && perfil.acesso_ate) || null,
        descontoPrimeiraCompra: res[3] === true, // 50% no plano de 30 dias (o servidor confirma)
        pagamentos: pagamentos
      };
    },

    /** Só o fim do acesso pago (usado pelo app.js para bloquear o menu). */
    getAcessoAte: async function () {
      var id = await uid();
      var perfil = await q(sb.from('perfis').select('acesso_ate').eq('id', id).maybeSingle());
      return perfil && perfil.acesso_ate;
    },

    /** Lembra o plano escolhido (só preferência; o acesso só muda com pagamento aprovado). */
    savePlanoPreferido: async function (plano) {
      var id = await uid();
      await q(sb.from('perfis').update({ plano: plano }).eq('id', id));
    },

    /* ---------- Pagamentos (funções /api na Vercel) ---------- */

    /** Gera ou reaproveita o Pix de um plano. → { id, plano, valor, qrCode, qrCodeBase64, expiraEm } */
    criarPix: function (plano) {
      return chamarApi('/api/pix/criar', { method: 'POST', body: JSON.stringify({ plano: plano }) });
    },

    /** → { status: 'approved' | 'pending' | 'expired' | ... } */
    statusPix: function (pagamentoId) {
      return chamarApi('/api/pix/status?id=' + encodeURIComponent(pagamentoId));
    },

    /** Cria o pagamento no cartão (Checkout Pro). → { id, initPoint } */
    criarPagamentoCartao: function (plano) {
      return chamarApi('/api/cartao/criar', { method: 'POST', body: JSON.stringify({ plano: plano }) });
    },

    /* ---------- Profissionais e vínculos com pacientes ---------- */

    /** Convite público (não precisa estar logado). → { nome, profissao, profissaoNome, registro, empresa } */
    getConvite: async function (codigo) {
      var resp;
      try {
        resp = await fetch('/api/vinculos?convite=' + encodeURIComponent(codigo), { headers: { Accept: 'application/json' } });
      } catch (e) {
        throw erro('REDE', 'Sem conexão. Verifique sua internet e tente de novo.');
      }
      var dados = await resp.json().catch(function () { return {}; });
      if (!resp.ok) throw erro('CONVITE', dados.erro || 'Convite não encontrado.');
      return dados;
    },

    /** Profissionais que acompanham a pessoa logada. → { profissionais: [...] } */
    getVinculos: function () {
      // Várias partes do app pedem ao mesmo tempo (menu, ficha, painel): uma chamada só.
      if (!cacheVinculos) cacheVinculos = chamarApi('/api/vinculos').catch(function (e) { cacheVinculos = null; throw e; });
      setTimeout(function () { cacheVinculos = null; }, 30000);
      return cacheVinculos;
    },
    aceitarConvite: function (codigo, compartilha) {
      cacheVinculos = null;
      return chamarApi('/api/vinculos', { method: 'POST', body: JSON.stringify({ acao: 'aceitar', codigo: codigo, compartilha: compartilha }) });
    },
    atualizarVinculo: function (id, compartilha) {
      cacheVinculos = null;
      return chamarApi('/api/vinculos', { method: 'POST', body: JSON.stringify({ acao: 'atualizar', id: id, compartilha: compartilha }) });
    },
    revogarVinculo: function (id) {
      cacheVinculos = null;
      return chamarApi('/api/vinculos', { method: 'POST', body: JSON.stringify({ acao: 'revogar', id: id }) });
    },

    /** Painel profissional da conta logada. → { profissional: {...} | null } */
    getProfissional: function () { return chamarApi('/api/prof?acao=eu'); },
    ativarProfissional: function (campos) {
      return chamarApi('/api/prof', { method: 'POST', body: JSON.stringify(Object.assign({ acao: 'ativar' }, campos)) });
    },
    atualizarProfissional: function (campos) {
      return chamarApi('/api/prof', { method: 'POST', body: JSON.stringify(Object.assign({ acao: 'atualizar' }, campos)) });
    },
    trocarCodigoProfissional: function () {
      return chamarApi('/api/prof', { method: 'POST', body: JSON.stringify({ acao: 'trocar-codigo' }) });
    },
    getPacientesProf: function () { return chamarApi('/api/prof?acao=pacientes'); },
    getPacienteProf: function (id) { return chamarApi('/api/prof?acao=paciente&id=' + encodeURIComponent(id)); },
    /** Metas e plano alimentar do profissional para um paciente. → { orientacoes } */
    salvarOrientacoes: function (pacienteId, campos) {
      return chamarApi('/api/prof', { method: 'POST', body: JSON.stringify(Object.assign({ acao: 'orientacoes', pacienteId: pacienteId }, campos)) });
    },

    /* ---------- Conversa profissional ↔ paciente (por vínculo) ----------
       O banco só deixa ler quem participa do vínculo ativo e só deixa enviar
       com o plano do paciente em dia (políticas em public.mensagens). */

    /** Últimas mensagens da conversa, da mais antiga para a mais nova. → [{ id, autorId, texto, criadoEm, lidaEm, minha }] */
    getMensagens: async function (vinculoId) {
      var eu = await uid();
      var linhas = await q(sb.from('mensagens').select('id, autor_id, texto, anexo_path, criado_em, lida_em')
        .eq('vinculo_id', vinculoId).order('criado_em', { ascending: false }).limit(200));
      return linhas.reverse().map(function (m) { return mensagemDe(m, eu); });
    },

    /**
     * Envia texto e/ou uma imagem (Blob já reduzido, JPEG/PNG/WebP até 5 MB).
     * A imagem vai para o bucket privado "chat" em <vinculo>/<uuid>.<ext>.
     */
    enviarMensagem: async function (vinculoId, texto, imagem) {
      var eu = await uid();
      var caminho = null;
      if (imagem) {
        var ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[imagem.type];
        if (!ext) throw erro('ANEXO', 'Envie uma foto em JPG, PNG ou WebP.');
        if (imagem.size > 5 * 1024 * 1024) throw erro('ANEXO', 'A imagem passou de 5 MB. Escolha outra.');
        caminho = vinculoId + '/' + crypto.randomUUID() + '.' + ext;
        var up = await sb.storage.from('chat').upload(caminho, imagem, { contentType: imagem.type, upsert: false });
        if (up.error) {
          if (/row-level security|unauthorized|403/i.test(up.error.message || '')) {
            throw erro('SEM_PLANO', 'Não foi possível enviar: o plano do paciente não está ativo ou o acesso foi removido.', up.error);
          }
          throw erro('ANEXO', 'Não foi possível enviar a imagem. Tente de novo.', up.error);
        }
      }
      var r = await sb.from('mensagens').insert({ vinculo_id: vinculoId, autor_id: eu, texto: String(texto || '').trim().slice(0, 2000), anexo_path: caminho })
        .select('id, autor_id, texto, anexo_path, criado_em, lida_em').single();
      if (r.error && r.error.code === '42501') {
        throw erro('SEM_PLANO', 'Não foi possível enviar: o plano do paciente não está ativo ou o acesso foi removido.', r.error);
      }
      if (r.error) throw traduzirDados(r.error);
      return mensagemDe(r.data, eu);
    },

    /** Endereço temporário (1 hora) para mostrar uma imagem da conversa. */
    urlAnexo: async function (caminho) {
      var r = await sb.storage.from('chat').createSignedUrl(caminho, 3600);
      if (r.error) throw erro('ANEXO', 'Não foi possível abrir a imagem.', r.error);
      return r.data.signedUrl;
    },

    /** Marca como lidas as mensagens que a outra pessoa enviou nesta conversa. */
    marcarLidas: async function (vinculoId) {
      var eu = await uid();
      await q(sb.from('mensagens').update({ lida_em: new Date().toISOString() })
        .eq('vinculo_id', vinculoId).neq('autor_id', eu).is('lida_em', null));
    },

    /** Mensagens não lidas por conversa. → { [vinculoId]: quantidade } */
    getNaoLidas: async function () {
      var eu = await uid();
      var linhas = await q(sb.from('mensagens').select('vinculo_id').neq('autor_id', eu).is('lida_em', null).limit(1000));
      var porVinculo = {};
      linhas.forEach(function (m) { porVinculo[m.vinculo_id] = (porVinculo[m.vinculo_id] || 0) + 1; });
      return porVinculo;
    },

    /**
     * Avisa em tempo real a cada mensagem nova recebida ou enviada.
     * @param {function(object, string)} aoReceber  (mensagem, vinculoId)
     * @returns {function} cancela a escuta
     */
    ouvirMensagens: function (aoReceber) {
      var canal = null;
      var cancelado = false;
      uid().then(function (eu) {
        if (cancelado) return;
        canal = sb.channel('mensagens-' + eu)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, function (p) {
            if (p.new) aoReceber(mensagemDe(p.new, eu), p.new.vinculo_id);
          })
          .subscribe();
      }).catch(function () { /* sem sessão: nada a ouvir */ });
      return function () { cancelado = true; if (canal) sb.removeChannel(canal); };
    },

    /* ---------- Administração (só administradores; o servidor confere) ---------- */

    /** → true se a conta logada é administradora. */
    souAdmin: async function () {
      try {
        var r = await chamarApi('/api/admin/eu');
        return !!r.admin;
      } catch (e) {
        return false;
      }
    },

    /** Painel de administração. → { numeros, assinantes, pagamentos, liberacoes, hoje } */
    getPainelAdmin: function () {
      return chamarApi('/api/admin/resumo');
    },

    /** Dados de um cliente para o painel "Gerenciar". */
    getClienteAdmin: function (usuarioId) {
      return chamarApi('/api/admin/cliente?id=' + encodeURIComponent(usuarioId));
    },

    /** Executa uma ação no cliente (dados, senha, cortesia, acesso, plano...). → dados atualizados */
    alterarClienteAdmin: function (usuarioId, acao, campos) {
      return chamarApi('/api/admin/cliente', { method: 'POST', body: JSON.stringify(Object.assign({ id: usuarioId, acao: acao }, campos || {})) });
    },


    /** Volta do Checkout Pro: confere no Mercado Pago. → { status } */
    statusPagamentoCartao: function (compraId) {
      return chamarApi('/api/cartao/status?id=' + encodeURIComponent(compraId));
    }
  };

  var cacheVinculos = null;

  async function chamarApi(caminho, opcoes) {
    var r = await sb.auth.getSession();
    var token = r.data && r.data.session && r.data.session.access_token;
    if (!token) throw erro('SEM_SESSAO', 'Sua sessão expirou. Entre novamente.');
    opcoes = opcoes || {};
    opcoes.headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    var resp;
    try {
      resp = await fetch(caminho, opcoes);
    } catch (e) {
      throw erro('REDE', 'Sem conexão. Verifique sua internet e tente de novo.');
    }
    var dados = await resp.json().catch(function () { return {}; });
    if (resp.status === 401) throw erro('SEM_SESSAO', dados.erro || 'Sua sessão expirou. Entre novamente.');
    if (!resp.ok) throw erro('API', dados.erro || 'Não foi possível concluir agora. Tente de novo.');
    return dados;
  }
})();
