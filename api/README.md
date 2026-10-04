# /api — funções serverless (Vercel)

O navegador conversa direto com a **Supabase** (`js/storage.js`) e a segurança
fica no banco (RLS). Esta pasta só tem o que precisa de segredo no servidor:
os **pagamentos do Mercado Pago** (Pix e cartão).

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/pix/criar` | `{ plano }` gera (ou reaproveita) o Pix do plano para a pessoa logada |
| GET | `/api/pix/status?id=` | a tela do QR consulta a cada 5 s; confere no Mercado Pago |
| POST | `/api/pix/webhook` | o Mercado Pago avisa quando um Pix muda |
| POST | `/api/cartao/criar` | `{ plano }` cria a preferência do Checkout Pro e devolve o `init_point` |
| GET | `/api/cartao/status?id=` | na volta do Checkout Pro, procura o pagamento da compra e libera o acesso |
| POST | `/api/cartao/webhook` | o Mercado Pago avisa quando um pagamento no cartão muda |

`_lib/pix.js` (planos, Supabase, chamada à API) e `_lib/cartao.js` têm o
código comum (pastas com `_` não viram rotas).

## Planos

Pagamento único, sem renovação automática:

| Plano | Acesso | Preço |
|---|---|---|
| `semanal` | 7 dias | R$ 4,99 |
| `mensal` | 30 dias | R$ 15,00 |
| `semestral` | 6 meses | R$ 50,00 |

Preço: mude em `PLANOS` (`_lib/pix.js`) **e** em `js/plano.js`. Duração:
`private.duracao_plano()` no banco.

## Como o acesso é liberado

1. O app manda só o plano escolhido. O servidor define o valor por `PLANOS` e
   cria o Pix (`/v1/payments`) ou a preferência do Checkout Pro
   (`/checkout/preferences`), sempre com `external_reference` e
   `notification_url`.
2. Pagamento aprovado → webhook (ou a consulta da tela / volta do Checkout
   Pro) → o servidor busca o pagamento **na API do Mercado Pago**, confere
   status, moeda e valor e chama `confirmar_pagamento_pix()` ou
   `confirmar_pagamento_cartao()` no banco.
3. A função soma o período do plano a `perfis.acesso_ate`, a partir do fim do
   acesso atual (se ainda houver dias) ou de hoje. Repetir o aviso não soma de
   novo.
4. Sem teste grátis e sem tolerância: conta nova nasce sem acesso. As tabelas
   de dados têm políticas RLS que exigem `acesso_ate >= hoje`; sem acesso, o
   app só abre a seção **Assinaturas**.

No Checkout Pro ficam só cartão e saldo do Mercado Pago (Pix tem fluxo
próprio no site; boleto demoraria dias para liberar).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Nome | Valor |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (`sb_secret_...`) |
| `MP_ACCESS_TOKEN` | Mercado Pago → Suas integrações → aplicação → Credenciais (produção no site; teste no `.env` local) |
| `SITE_URL` | `https://www.pontofit.site` (sem barra no fim) |

`NEXT_PUBLIC_SUPABASE_URL` já existe e é reaproveitada. Nunca use o prefixo
`NEXT_PUBLIC_` nas chaves secretas.

Os avisos chegam pela `notification_url` de cada pagamento (não usam o
webhook cadastrado no painel nem a assinatura secreta). Por isso os dois
webhooks nunca liberam nada com base no corpo do aviso: sempre consultam o
pagamento na API.

Para testar localmente as funções é preciso `vercel dev`; `npm run dev` só
serve os arquivos estáticos.
