# /api — funções serverless (Vercel)

O navegador conversa direto com a **Supabase** (`js/storage.js`) e a segurança
fica no banco (RLS). Esta pasta só tem o que precisa de segredo no servidor:
o **Pix** e a **assinatura no cartão** do Mercado Pago.

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/pix/criar` | gera (ou reaproveita) o Pix de uma mensalidade da pessoa logada |
| GET | `/api/pix/status?id=` | a tela do QR consulta a cada 5 s; confere no Mercado Pago |
| POST | `/api/pix/webhook` | o Mercado Pago avisa quando o pagamento muda |

| POST | `/api/subscriptions` | cria a assinatura no cartão (plano do perfil) e devolve o link do Mercado Pago |
| GET | `/api/subscriptions/:id` | consulta a assinatura no Mercado Pago e atualiza o status |
| POST | `/api/subscriptions/:id` | `{ acao: 'pause' \| 'reactivate' \| 'cancel' }` |
| POST | `/api/subscriptions/webhook` | avisos `subscription_preapproval` e `subscription_authorized_payment` |

`_lib/pix.js` e `_lib/assinatura.js` têm o código comum (pastas com `_` não viram rotas).

## Assinatura no cartão

Modelo do Mercado Pago: **assinatura sem plano, com pagamento pendente**.

1. O app chama `/api/subscriptions`. O servidor lê o plano do perfil, monta
   valor e frequência a partir de `SUBSCRIPTION_OFFERS` (`_lib/assinatura.js`)
   e marca a primeira cobrança para o fim do teste grátis ou do período já
   pago (`start_date`). O navegador não manda preço nem plano.
2. A pessoa vai para o `init_point` e informa o cartão no Mercado Pago. Na
   volta (`app.html?assinatura=retorno#plano`) a tela consulta o status.
3. A cada cobrança, o webhook busca a fatura (`/authorized_payments/{id}`) e o
   pagamento (`/v1/payments/{id}`), confere status, moeda e valor e chama
   `confirmar_pagamento_assinatura()`: marca a mensalidade em aberto mais
   antiga como paga e estende `acesso_ate`. Aviso repetido não estende de novo.
4. Com o cartão ativo, as mensalidades futuras não mostram o botão de Pix.

Webhook: cadastre `https://SEU-SITE/api/subscriptions/webhook` no painel do
Mercado Pago (Suas integrações → PontoFit → Webhooks) com os tópicos
`subscription_preapproval` e `subscription_authorized_payment`.

Os avisos desse webhook vêm assinados (`x-signature`). A rota confere a
assinatura com `MP_WEBHOOK_SECRET` (`_lib/webhook.js`) e recusa com 401 o que
não bater. Sem a variável configurada, recusa com 500 e o Mercado Pago reenvia
depois. A chave fica em Webhooks → Configurar notificação → assinatura secreta.
Os avisos do Pix chegam pela `notification_url` de cada pagamento e não são
assinados; por isso o Pix continua conferindo tudo direto na API.

## Como o acesso é liberado

1. O app chama `/api/pix/criar` com o token da sessão. O servidor confere a
   mensalidade, define o valor pelo plano (`PLANOS` em `_lib/pix.js`) e cria o
   pagamento no Mercado Pago.
2. Pagamento aprovado → webhook (ou a consulta da tela) → o servidor busca o
   pagamento **na API do Mercado Pago**, confere status e valor e chama
   `confirmar_pagamento_pix()` no banco.
3. A função marca a mensalidade como paga e estende `perfis.acesso_ate`
   (1 ou 12 meses). Repetir o aviso não estende de novo.
4. As tabelas de dados têm políticas RLS que exigem `acesso_ate + 3 dias >= hoje`.
   Vencido → bloqueado; pagou → liberado na hora.

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Nome | Valor |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key (`sb_secret_...`) |
| `MP_ACCESS_TOKEN` | Mercado Pago → Suas integrações → aplicação → Credenciais |
| `SITE_URL` | `https://seudominio.com.br` (sem barra no fim) |

`NEXT_PUBLIC_SUPABASE_URL` já existe e é reaproveitada. Nunca use o prefixo
`NEXT_PUBLIC_` nas chaves secretas.

Preço: mude em `PLANOS` (`_lib/pix.js`), em `SUBSCRIPTION_OFFERS`
(`_lib/assinatura.js`) **e** em `js/plano.js`.

Para testar localmente as funções é preciso `vercel dev`; o Herd só serve os
arquivos estáticos.
