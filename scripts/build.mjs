// PontoFit — build do site estático com Supabase.
//
// 1. Lê NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY do
//    ambiente (Vercel) ou do .env / .env.local (máquina local).
// 2. Gera js/config.js (window.PF_CONFIG) e copia a biblioteca instalada
//    (@supabase/supabase-js, versão travada no package-lock) para js/vendor/.
// 3. Monta dist/ só com o que vai para o ar.
//
// Uso: npm run build   (rode de novo sempre que mudar o .env)
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const falhar = (msg) => { console.error('\n✘ ' + msg + '\n'); process.exit(1); };

// ---------- Variáveis de ambiente ----------
function lerEnv(arquivo) {
  const caminho = join(raiz, arquivo);
  if (!existsSync(caminho)) return {};
  const vars = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return vars;
}
// Prioridade: ambiente (Vercel) > .env.local > .env
const env = { ...lerEnv('.env'), ...lerEnv('.env.local'), ...process.env };
const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const chave = (env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

if (!url || !chave) {
  falhar('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.\n' +
    '  Na sua máquina: copie .env.example para .env e preencha.\n' +
    '  Na Vercel: Project → Settings → Environment Variables.');
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  falhar('NEXT_PUBLIC_SUPABASE_URL deve ser algo como https://SEU-PROJETO.supabase.co (recebido: ' + url + ').');
}
// A chave vai para o navegador: só a publicável (ou a anon antiga) é aceitável.
const pareceSecreta = /^sb_secret_/.test(chave) ||
  (chave.split('.').length === 3 && (() => {
    try { return JSON.parse(Buffer.from(chave.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch { return false; }
  })());
if (pareceSecreta) {
  falhar('A chave informada é SECRETA (secret/service_role). Ela daria acesso total ao banco para qualquer visitante.\n' +
    '  Use a chave publicável (sb_publishable_...) em NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
}

// ---------- CSP precisa liberar o projeto ----------
const vercel = JSON.parse(readFileSync(join(raiz, 'vercel.json'), 'utf8'));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy');
if (csp && !csp.value.includes(url)) {
  falhar('A Content-Security-Policy do vercel.json não libera ' + url + ' em connect-src.\n' +
    '  Sem isso o navegador bloqueia o acesso à Supabase. Atualize o vercel.json.');
}

// ---------- Arquivos gerados ----------
writeFileSync(join(raiz, 'js/config.js'),
  '/* Gerado por scripts/build.mjs a partir do .env. Não edite à mão. */\n' +
  'window.PF_CONFIG = Object.freeze(' + JSON.stringify({ supabaseUrl: url, supabaseKey: chave }) + ');\n');

const umd = join(raiz, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js');
if (!existsSync(umd)) falhar('Biblioteca não encontrada. Rode "npm install" antes do build.');
mkdirSync(join(raiz, 'js/vendor'), { recursive: true });
copyFileSync(umd, join(raiz, 'js/vendor/supabase.js'));
const versao = JSON.parse(readFileSync(join(raiz, 'node_modules/@supabase/supabase-js/package.json'), 'utf8')).version;

// ---------- dist/: só o que vai para o ar ----------
const dist = join(raiz, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const item of ['index.html', 'login.html', 'app.html', '404.html', 'css', 'js', 'assets']) {
  cpSync(join(raiz, item), join(dist, item), { recursive: true });
}

console.log('✔ Build pronto');
console.log('  Supabase:   ' + url);
console.log('  Chave:      ' + chave.slice(0, 16) + '… (publicável)');
console.log('  supabase-js ' + versao + ' copiada para js/vendor/');
console.log('  Saída:      dist/');
