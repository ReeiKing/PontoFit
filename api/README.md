# /api — reservado para funções serverless

Hoje o PontoFit não precisa de backend próprio: o navegador conversa direto
com a **Supabase** (`js/storage.js`), e a segurança fica no banco:

- **Login e senhas:** Supabase Auth (hash da senha feito pelo serviço).
- **Dados dos clientes:** tabelas do schema `public`, todas com RLS (cada pessoa
  só lê e altera as próprias linhas). Ver `supabase/migrations/`.
- **Chave no navegador:** só a publicável (`sb_publishable_...`). A chave
  secreta nunca entra no site; o `npm run build` recusa se alguém tentar.

Use esta pasta só quando surgir algo que precise de segredo no servidor, por
exemplo receber o webhook de um meio de pagamento (Stripe, Mercado Pago).
Ela está no `.vercelignore`: ao criar a primeira função, tire a linha `api/` de lá.
