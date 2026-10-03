# /api — funções serverless (futuro, Fase 11)

**Inativo nesta versão.** A pasta inteira está no `.vercelignore`, então não vai para o site publicado; ao ativar o backend, tire a linha `api/` de lá. Hoje todos os dados ficam no `localStorage`, acessados só por `js/storage.js`.

Na fase da Vercel, cada arquivo aqui vira uma Vercel Serverless Function, e `js/storage.js`
passa a chamar estes endpoints com `fetch` — o resto do site não muda.

Observação: a ficha guarda também `condicoesOutras`, `profissionalNome`/`profissionalContato` e
`marcosVistos`, e o produto guarda `intervaloValor`/`intervaloUnidade` e `dataUltimaAplicacao` —
ao ativar, acrescente essas colunas ao `schema.sql` (ou combine-as, como no exemplo).

| Método | Rota | Função |
|---|---|---|
| POST | `/api/auth/login` | autenticar e criar sessão |
| POST | `/api/auth/cadastro` | criar usuário (senha com hash) |
| GET / PUT | `/api/ficha` | ler / salvar a ficha |
| GET / POST / DELETE | `/api/peso` | registros de peso |
| GET / PUT | `/api/produto` | produto, dose e intervalo |
| GET / POST / DELETE | `/api/aplicacoes` | histórico de aplicações |
| GET / PUT | `/api/assinatura` | plano, teste grátis e mensalidades (pagamento registrado pela pessoa) |

Exemplo pronto (inativo): [`_exemplos/ficha.js`](_exemplos/ficha.js). Pastas e arquivos que começam com `_`
não viram funções na Vercel — para ativar, mova para `api/ficha.js`.

### Como `js/storage.js` muda

Só o corpo das funções; a assinatura (Promise) continua igual e o resto do site não muda:

```js
getFicha: async function () {
  var r = await fetch('/api/ficha', { credentials: 'include' });
  if (r.status === 401) throw erro('SEM_SESSAO', 'Sua sessão expirou. Entre novamente.');
  return r.json();
},
```

Banco: Postgres via Marketplace da Vercel (ex.: Neon) ou Supabase — tabelas em `../schema.sql`.
Autenticação real: Auth.js, Supabase Auth ou Clerk. Segredos em variáveis de ambiente (nunca no código).

> Dados de saúde são **dados pessoais sensíveis (LGPD)**. Antes de produção: HTTPS, senhas com hash,
> consentimento explícito no cadastro, política de privacidade e opção de excluir a conta.
