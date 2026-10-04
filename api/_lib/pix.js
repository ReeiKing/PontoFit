// PontoFit — código comum das funções de pagamento (Mercado Pago: Pix e cartão).
// Pastas que começam com "_" não viram rotas na Vercel.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   NEXT_PUBLIC_SUPABASE_URL   mesma URL que o site já usa
//   SUPABASE_SECRET_KEY        chave secreta (sb_secret_...). Só no servidor!
//   MP_ACCESS_TOKEN            Access Token do Mercado Pago (TEST-... ou APP_USR-...)
//   SITE_URL                   opcional, ex.: https://seudominio.com.br
'use strict';

const { createClient } = require('@supabase/supabase-js');

// Preço e período decididos aqui, nunca pelo valor que vem do navegador.
// Mude o preço aqui e em js/plano.js (a duração fica em private.duracao_plano()).
const PLANOS = {
  semanal: { valor: 4.99, item: 'Plano 7 dias' },
  mensal: { valor: 15, item: 'Plano 30 dias' },
  semestral: { valor: 50, item: 'Plano 6 meses' }
};

const MP_API = 'https://api.mercadopago.com';

function exigirEnv(nome) {
  const v = (process.env[nome] || '').trim();
  if (!v) throw new Error('Variável de ambiente ausente: ' + nome);
  return v;
}

let admin = null;
function supabaseAdmin() {
  if (!admin) {
    admin = createClient(exigirEnv('NEXT_PUBLIC_SUPABASE_URL'), exigirEnv('SUPABASE_SECRET_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return admin;
}

function urlDoSite() {
  const site = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  if (site) return site;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  throw new Error('Defina SITE_URL (ex.: https://seudominio.com.br).');
}

async function mercadoPago(caminho, opcoes) {
  opcoes = opcoes || {};
  const r = await fetch(MP_API + caminho, {
    method: opcoes.method || 'GET',
    headers: Object.assign({
      Authorization: 'Bearer ' + exigirEnv('MP_ACCESS_TOKEN'),
      'Content-Type': 'application/json'
    }, opcoes.headers || {}),
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error('Mercado Pago ' + r.status + ': ' + (dados.message || JSON.stringify(dados)));
    e.status = r.status;
    throw e;
  }
  return dados;
}

/** Usuário logado a partir do "Authorization: Bearer <token da sessão Supabase>". */
async function usuarioDaRequisicao(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(m[1]);
  if (error || !data || !data.user) return null;
  return data.user;
}

/**
 * Consulta o pagamento direto no Mercado Pago (nunca confia só no aviso do
 * webhook) e, se aprovado com o valor certo, confirma no banco.
 * → status atual do pagamento ('approved', 'pending', 'expired'...)
 */
async function sincronizarPagamento(id) {
  const db = supabaseAdmin();
  const { data: pg, error } = await db.from('pagamentos_pix')
    .select('id, valor, status, aprovado_em').eq('id', String(id)).maybeSingle();
  if (error) throw error;
  if (!pg) return null; // pagamento que não foi criado pelo PontoFit
  if (pg.aprovado_em) return 'approved';

  const mp = await mercadoPago('/v1/payments/' + encodeURIComponent(pg.id));
  const valorOk = mp.currency_id === 'BRL' && Number(mp.transaction_amount) >= Number(pg.valor);

  if (mp.status === 'approved' && valorOk) {
    const { error: e } = await db.rpc('confirmar_pagamento_pix', { p_pagamento_id: pg.id });
    if (e) throw e;
    return 'approved';
  }

  const status = mp.status === 'approved' ? 'valor_divergente' : (mp.status || pg.status);
  if (status !== pg.status) {
    await db.from('pagamentos_pix').update({ status }).eq('id', pg.id);
  }
  return status;
}

function responder(res, status, corpo) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(corpo);
}

module.exports = { PLANOS, supabaseAdmin, urlDoSite, mercadoPago, usuarioDaRequisicao, sincronizarPagamento, responder };
