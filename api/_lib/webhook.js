// PontoFit — confere a assinatura (x-signature) dos avisos do Mercado Pago.
//
// Vale para os webhooks cadastrados no painel (Suas integrações → PontoFit →
// Webhooks), como o da assinatura no cartão. Os avisos do Pix chegam pela
// notification_url de cada pagamento e não vêm assinados.
//
// Variável de ambiente (Vercel → Settings → Environment Variables):
//   MP_WEBHOOK_SECRET   assinatura secreta mostrada em Webhooks → Configurar notificação
'use strict';

const { createHmac, timingSafeEqual } = require('node:crypto');

/**
 * → 'ok' | 'invalida' | 'sem_segredo'
 *
 * Manifest: "id:{data.id};request-id:{x-request-id};ts:{ts};"
 *   data.id vem da query da URL, em minúsculas. Um par ausente sai do
 *   manifest (regra da documentação do Mercado Pago).
 */
function conferirAssinatura(req) {
  const segredo = (process.env.MP_WEBHOOK_SECRET || '').trim();
  if (!segredo) return 'sem_segredo';

  const cabecalho = String(req.headers['x-signature'] || '');
  const partes = {};
  for (const par of cabecalho.split(',')) {
    const i = par.indexOf('=');
    if (i > 0) partes[par.slice(0, i).trim()] = par.slice(i + 1).trim();
  }
  if (!partes.ts || !partes.v1) return 'invalida';

  const dataId = String((req.query && req.query['data.id']) || '').toLowerCase();
  const requestId = String(req.headers['x-request-id'] || '');
  const manifest = (dataId ? 'id:' + dataId + ';' : '') +
    (requestId ? 'request-id:' + requestId + ';' : '') +
    'ts:' + partes.ts + ';';

  const esperado = Buffer.from(createHmac('sha256', segredo).update(manifest).digest('hex'));
  const recebido = Buffer.from(partes.v1);
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido) ? 'ok' : 'invalida';
}

module.exports = { conferirAssinatura };
