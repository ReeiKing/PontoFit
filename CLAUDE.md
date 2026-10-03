# PontoFit — Instruções para o Claude Code

> Cole este arquivo na raiz do projeto (pode renomear para `CLAUDE.md`) e peça ao Claude Code:
> **"Leia o CLAUDE.md e construa o site PontoFit seguindo as fases, uma de cada vez."**

---

## 1. Visão geral

**PontoFit** é um site de saúde e bem-estar com:

1. **Landing page pública** — copy informativa sobre saúde, legumes e hábitos, com animações ligadas ao scroll (copo d'água que enche, etc.).
2. **Área de login / cadastro.**
3. **Área do paciente** (após login) com **menu lateral esquerdo**:
   - **Minha ficha** — dados do paciente
   - **Minha evolução** — peso inicial x atual, gráfico, meta
   - **Meus produtos** — Mounjaro (feminino) ou Testosterona (masculino), dose em mL, intervalo e contagem regressiva para a próxima dose

Deve funcionar perfeitamente em **desktop e celular** (mobile-first).

---

## 2. Stack e regras técnicas

- **HTML5 + CSS3 puros**, sem frameworks de CSS.
- **JavaScript vanilla** é obrigatório para: login, salvar dados, gráfico, contagem de dias e animações de scroll. (HTML e CSS sozinhos não fazem isso.) Nada de React/Vue.
- Gráfico: **Chart.js via CDN** (`https://cdn.jsdelivr.net/npm/chart.js`). Alternativa: SVG desenhado em JS puro.
- Ícones: **Lucide via CDN** ou SVGs inline.
- Fontes (Google Fonts): **Poppins** (títulos) + **Inter** (texto).
- **Persistência por enquanto:** `localStorage`, isolada em um único arquivo `js/storage.js`. Toda leitura/escrita de dados passa por funções desse arquivo (`getUser`, `saveFicha`, `addPeso`, `saveProduto`…), para que depois seja trocado por chamadas `fetch('/api/...')` sem mexer no resto do site.
- **Banco futuro na Vercel:** Postgres pelo Marketplace da Vercel (ex.: Neon) ou Supabase. Deixar a pasta `/api` com arquivos de exemplo (Vercel Serverless Functions) e o `schema.sql` (seção 9) prontos, mas **sem ativar** nesta primeira versão.
- Acessibilidade: contraste AA, `alt` em todas as imagens, labels nos inputs, navegação por teclado, respeitar `prefers-reduced-motion` (desligar animações pesadas).
- Sem dependências de build: deve abrir com duplo clique no `index.html` ou com `npx serve`.

---

## 3. Estrutura de pastas

```
pontofit/
├── index.html              # Landing page
├── login.html              # Login + cadastro (abas)
├── app.html                # Área do paciente (menu lateral + seções)
├── css/
│   ├── base.css            # reset, variáveis, tipografia
│   ├── landing.css
│   ├── auth.css
│   └── app.css
├── js/
│   ├── storage.js          # camada de dados (localStorage hoje, API amanhã)
│   ├── auth.js             # login, cadastro, logout, proteção de rota
│   ├── scroll-animations.js
│   ├── ficha.js
│   ├── evolucao.js
│   └── produtos.js         # inclui lembrete / contagem regressiva
├── assets/
│   ├── img/                # fotos baixadas
│   └── svg/                # copo, folhas, balança etc.
├── api/                    # (futuro) funções serverless da Vercel
│   └── README.md
├── schema.sql              # (futuro) tabelas do banco
└── vercel.json
```

---

## 4. Identidade visual

| Token | Valor | Uso |
|---|---|---|
| `--verde` | `#2E9D6A` | cor principal, botões |
| `--verde-escuro` | `#1F6E4A` | hover, títulos |
| `--agua` | `#4FB3E8` | copo d'água, destaques de hidratação |
| `--laranja` | `#F59E42` | alertas, CTA secundário, lembrete de dose |
| `--fundo` | `#F7FBF8` | fundo geral |
| `--texto` | `#1E2A24` | texto |
| `--cinza` | `#6B7A72` | texto secundário |

- Cantos arredondados (`16px` cards, `999px` botões), sombras suaves.
- Modo escuro opcional via `prefers-color-scheme`.
- Logo: texto "Ponto**Fit**" com um ponto verde em forma de gota/folha antes do nome (SVG simples).

### Botões interativos (padrão para o site todo)
- Hover: leve elevação (`translateY(-2px)`) + sombra maior.
- Clique: efeito *ripple* (onda) a partir do ponto do toque.
- Foco visível (outline verde) para teclado.
- Estado de carregamento: spinner dentro do botão ao enviar formulários.
- Toggle de sexo (Feminino/Masculino) como botões segmentados animados.

---

## 5. Landing page (`index.html`)

### Estrutura das seções
1. **Header fixo** — logo, links âncora (Benefícios, Legumes, Hábitos), botão "Entrar". No celular vira menu hambúrguer com animação.
2. **Hero** — título, subtítulo, 2 botões ("Começar agora" → login, "Saiba mais" → rola até benefícios). Foto de fundo com sobreposição verde.
3. **Hidratação** — **o copo d'água que enche com o scroll** fica no fundo desta copy.
4. **Benefícios dos legumes** — cards com ícones que aparecem em sequência.
5. **Prato equilibrado** — prato dividido em fatias que se montam ao rolar.
6. **Hábitos simples** — números animados (contadores).
7. **CTA final + rodapé** (com aviso de saúde).

### Copy (usar exatamente este texto)

**Hero**
- Título: **Sua saúde começa no próximo ponto.**
- Subtítulo: Pequenas escolhas diárias — um copo d'água, um prato colorido, uma caminhada — somam grandes resultados. O PontoFit ajuda você a acompanhar cada passo.
- Botões: `Começar agora` · `Saiba mais`

**Hidratação**
- Título: **Água: o hábito mais simples (e mais esquecido)**
- Texto: Cerca de 60% do corpo é água. Ela regula a temperatura, ajuda na digestão, transporta nutrientes e mantém a energia em dia. Muitas vezes, aquela fome fora de hora ou o cansaço no meio da tarde são sinais de que você bebeu pouca água.
- Dica: Deixe uma garrafa sempre à vista e beba um copo ao acordar e antes de cada refeição.

**Benefícios dos legumes**
- Título: **Por que colocar mais legumes no prato?**
- Cards:
  - 🥦 **Fibras que dão saciedade** — ajudam você a se sentir satisfeito por mais tempo e a manter o intestino regulado.
  - 🥕 **Vitaminas e minerais** — vitamina A, C, potássio e ferro que fortalecem a imunidade e a disposição.
  - 🍅 **Antioxidantes** — os legumes coloridos ajudam a proteger as células do desgaste do dia a dia.
  - 🥒 **Poucas calorias, muito volume** — você come bem, com o prato cheio, sem exagerar nas calorias.
  - ❤️ **Coração mais saudável** — uma alimentação rica em vegetais está associada a melhor controle da pressão e do colesterol.

**Prato equilibrado**
- Título: **Monte um prato que trabalha por você**
- Texto: Uma forma prática de equilibrar as refeições: **metade do prato com legumes e verduras**, **um quarto com proteína** (frango, peixe, ovos, feijão) e **um quarto com carboidrato**, de preferência integral (arroz, batata, mandioca).
- Rótulos do prato: Legumes e verduras 50% · Proteínas 25% · Carboidratos 25%

**Hábitos simples**
- Título: **Pequenos números, grandes mudanças**
- Contadores:
  - **30 min** de caminhada por dia
  - **7–9 h** de sono por noite
  - **5 cores** diferentes no prato
  - **2 L** de água como referência diária (varia de pessoa para pessoa)

**CTA final**
- Título: **Acompanhe sua evolução de perto**
- Texto: Registre seus dados, acompanhe seu peso e nunca mais esqueça uma dose. Tudo em um só lugar.
- Botão: `Criar minha conta`

**Rodapé**
- © 2026 PontoFit. Todos os direitos reservados.
- Aviso: *As informações deste site têm caráter educativo e não substituem a orientação de um médico ou nutricionista.*

---

## 6. Animações de scroll

Implementar em `js/scroll-animations.js` usando **IntersectionObserver** + cálculo de progresso por seção (0 a 1) com `requestAnimationFrame`. Onde o navegador suportar, pode usar CSS `animation-timeline: view()` com fallback em JS. Todas desligadas com `prefers-reduced-motion: reduce`.

### 6.1 Copo d'água que enche (obrigatório)
- SVG de um copo (contorno de vidro levemente transparente) posicionado **atrás do texto da seção de Hidratação** (`position: sticky` ou absoluto, opacidade ~0.25 no desktop e atrás do texto no mobile).
- Dentro do copo, um `<rect>` de água com `clip-path` no formato do copo. A altura da água = progresso de scroll da seção (0% → 100%).
- **Funciona nos dois sentidos**: rolando para baixo enche, rolando para cima esvazia.
- Superfície da água com **onda animada** (path SVG com `animation` horizontal infinita).
- Bolhas pequenas subindo quando o copo passar de 30%.
- Um texto "💧 0% → 100%" ao lado indicando o nível (opcional).

### 6.2 Outros exemplos espalhados pela página
- **Hero:** leve *parallax* na foto de fundo; folhas SVG flutuando lentamente.
- **Barra de progresso de leitura** fina no topo do header (verde → azul água).
- **Cards de legumes:** entram com *fade + slide-up* em cascata (atraso de 100ms entre cada).
- **Prato equilibrado:** gráfico de pizza em SVG que se "desenha" (`stroke-dashoffset`) conforme o scroll; as fatias se preenchem uma a uma.
- **Legumes caindo no prato:** 3–4 ícones SVG (cenoura, brócolis, tomate) que descem e "pousam" no prato quando a seção entra na tela.
- **Contadores:** números sobem de 0 até o valor quando ficam visíveis.
- **Balança/fita métrica** na seção CTA: ponteiro que gira suavemente com o scroll.
- **Header:** fica com fundo sólido e sombra após rolar 50px; esconde ao rolar para baixo e reaparece ao rolar para cima (no mobile).
- **Botão "voltar ao topo"** que aparece após 60% da página, com um anel de progresso ao redor.

---

## 7. Login e cadastro (`login.html`)

- Abas animadas: **Entrar** | **Criar conta**.
- **Entrar:** e-mail, senha (com botão de mostrar/ocultar), "Lembrar de mim", "Esqueci minha senha" (por enquanto só mostra mensagem).
- **Criar conta:** nome, e-mail, senha, confirmar senha, aceite do aviso de saúde.
- Validação em tempo real com mensagens em português.
- Ao entrar → redireciona para `app.html`. `app.html` deve redirecionar para `login.html` se não houver sessão.
- **Importante (comentar no código):** o login com `localStorage` é apenas protótipo e **não é seguro**. Na fase da Vercel, trocar por autenticação real (ex.: Auth.js, Supabase Auth ou Clerk), com senha guardada como *hash* no servidor.
- Imagem lateral no desktop (some no mobile).

---

## 8. Área do paciente (`app.html`)

### Layout
- **Menu lateral esquerdo fixo** (largura ~260px) com: logo, foto/iniciais + nome do paciente, itens **Minha ficha**, **Minha evolução**, **Meus produtos**, e **Sair** no rodapé.
- Item ativo destacado com barra verde e fundo suave; transição ao trocar de seção.
- **Mobile:** menu vira gaveta (abre por botão hambúrguer, com fundo escurecido) **ou** barra inferior com 3 ícones. Escolher a gaveta.
- Navegação por hash (`#ficha`, `#evolucao`, `#produtos`) sem recarregar a página.
- Selo/badge no item **Meus produtos** mostrando os dias para a próxima dose (ex.: "3d"), ficando laranja quando faltar ≤ 1 dia.

### 8.1 Minha ficha
Formulário em cards, com botão **Editar / Salvar** e mensagem de sucesso (toast).

**Dados pessoais**
- Nome completo
- Data de nascimento → **idade calculada automaticamente**
- Sexo (Feminino / Masculino) — define o produto em "Meus produtos"
- Telefone / WhatsApp
- E-mail
- Cidade / Estado

**Dados corporais**
- Altura (cm)
- Peso inicial (kg) + data da medição
- Circunferência da cintura (cm) — opcional
- **IMC calculado automaticamente** com faixa (abaixo do peso, normal, sobrepeso, obesidade) em cor

**Saúde**
- Objetivo (emagrecer, ganhar massa, manter peso, mais disposição)
- Nível de atividade física (sedentário, leve, moderado, intenso)
- Condições de saúde (diabetes, hipertensão, tireoide, outras — checkboxes + campo livre)
- Alergias
- Medicamentos em uso
- Profissional responsável (nome do médico/nutricionista e contato)
- Observações

### 8.2 Minha evolução
- **Cards de resumo no topo:**
  - Peso inicial
  - Peso atual (último registro)
  - **Diferença** (ex.: "−6,4 kg", verde se perdeu, laranja se ganhou quando o objetivo é emagrecer)
  - Meta de peso
  - Quanto falta para a meta
- **Barra de progresso até a meta** (% do caminho percorrido entre peso inicial e meta), animada ao abrir.
- **Gráfico de linha** (Chart.js) com o peso ao longo do tempo + **linha tracejada horizontal da meta**. Filtros: 30 dias, 90 dias, tudo.
- **Registrar novo peso:** data + peso (+ cintura opcional) → atualiza cards e gráfico na hora.
- **Histórico** em tabela (data, peso, variação em relação ao registro anterior), com opção de excluir registro.
- **Definir/alterar meta** de peso e data desejada; mostrar ritmo médio (kg/semana) e estimativa de quando a meta será atingida.
- IMC atual x IMC inicial.
- Mensagem motivacional quando atingir marcos (−1 kg, −5 kg, 50% da meta, meta atingida → confete).

### 8.3 Meus produtos
- Mostrar o produto conforme o **sexo da ficha**:
  - **Feminino → Mounjaro**
  - **Masculino → Testosterona**
  - Se a ficha não tiver sexo preenchido, mostrar aviso com botão "Completar minha ficha".
- Formulário (as duas perguntas obrigatórias):
  - **Quantos mL por aplicação?** (número com decimais, ex.: 0,5)
  - **Intervalo entre uma aplicação e outra** (número + unidade: dias / semanas)
  - Data da última aplicação (obrigatória para o cálculo)
  - Campo opcional de concentração/dose em mg e de observações
- Botão **"Registrar aplicação de hoje"** → salva no histórico e reinicia a contagem.
- **Histórico de aplicações** (data, mL) em lista.
- Aviso fixo no card: *"Use somente conforme prescrição médica. O PontoFit apenas ajuda a lembrar suas doses."*

### 8.4 Lembrete interno de dose (contagem regressiva)
- Cálculo: `próxima dose = data da última aplicação + intervalo`. `dias restantes = próxima dose − hoje` (comparar só datas, sem horário).
- **Ao abrir o menu "Meus produtos"**, exibir no topo um card grande de destaque com animação de entrada:
  - Anel circular (SVG) que mostra quanto do intervalo já passou
  - Número grande: **"Faltam 3 dias para sua próxima dose"**
  - Data da próxima dose por extenso (ex.: "sábado, 10 de outubro")
- Estados:
  - **Faltam ≥ 2 dias:** verde
  - **Falta 1 dia:** laranja — "Sua próxima dose é amanhã"
  - **Hoje:** laranja pulsando — "Hoje é dia da sua dose" + botão "Registrar aplicação"
  - **Atrasada:** vermelho suave — "Sua dose está atrasada há X dias"
- **Ao fazer login/abrir o app**, se faltar ≤ 1 dia ou estiver atrasada, mostrar um toast/banner no topo com link para "Meus produtos".
- O badge do menu lateral (seção 8) usa o mesmo cálculo.

---

## 9. Banco de dados (fase futura — Vercel)

Deixar `schema.sql` pronto:

```sql
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  senha_hash    TEXT NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fichas (
  usuario_id        UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  data_nascimento   DATE,
  sexo              TEXT CHECK (sexo IN ('F','M')),
  telefone          TEXT,
  cidade            TEXT,
  estado            TEXT,
  altura_cm         NUMERIC(5,1),
  peso_inicial_kg   NUMERIC(5,1),
  data_peso_inicial DATE,
  cintura_cm        NUMERIC(5,1),
  objetivo          TEXT,
  nivel_atividade   TEXT,
  condicoes_saude   TEXT[],
  alergias          TEXT,
  medicamentos      TEXT,
  profissional      TEXT,
  observacoes       TEXT,
  meta_peso_kg      NUMERIC(5,1),
  meta_data         DATE,
  atualizado_em     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE registros_peso (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  peso_kg     NUMERIC(5,1) NOT NULL,
  cintura_cm  NUMERIC(5,1)
);

CREATE TABLE produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,          -- 'Mounjaro' | 'Testosterona'
  dose_ml         NUMERIC(5,2) NOT NULL,
  dose_mg         NUMERIC(6,2),
  intervalo_dias  INTEGER NOT NULL,
  observacoes     TEXT
);

CREATE TABLE aplicacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id  UUID REFERENCES produtos(id) ON DELETE CASCADE,
  data        DATE NOT NULL,
  dose_ml     NUMERIC(5,2) NOT NULL
);
```

Endpoints previstos em `/api`: `POST /api/auth/login`, `POST /api/auth/cadastro`, `GET/PUT /api/ficha`, `GET/POST/DELETE /api/peso`, `GET/PUT /api/produto`, `POST /api/aplicacoes`.

> Dados de saúde são **dados pessoais sensíveis pela LGPD**. Antes de ir para produção: HTTPS, senhas com hash, consentimento explícito no cadastro, política de privacidade e opção de excluir a conta.

---

## 10. Imagens

Baixar para `assets/img/`, converter para **WebP**, largura máx. 1920px (hero) / 900px (demais), `loading="lazy"` em tudo que não for o hero. Usar fotos gratuitas do **Unsplash** (licença livre; **não** usar fotos marcadas como "Unsplash+", que são pagas) ou **Pexels**. Colocar crédito do fotógrafo no rodapé.

| Onde | O que buscar | Sugestão |
|---|---|---|
| Hero | Pessoa correndo ao ar livre ao amanhecer / estilo de vida saudável | buscar "woman jogging sunrise" ou "healthy lifestyle outdoor" no Unsplash |
| Benefícios dos legumes | Legumes e frutas frescos sobre tábua de madeira | Foto de engin akyurt: https://unsplash.com/photos/Y5n8mCpvlZU (download: `https://unsplash.com/photos/Y5n8mCpvlZU/download?force=true`) |
| Prato equilibrado | Prato colorido visto de cima (salada, proteína, grãos) | "healthy plate top view" / "salad bowl" |
| Hábitos | Copo/garrafa d'água, pessoa caminhando, dormindo | "water bottle", "walking park", "sleep" |
| Login (lateral) | Pessoa sorrindo comendo salada ou alongando | "woman eating salad", "stretching" |
| CTA final | Fita métrica + maçã / balança | "measuring tape apple" |

Copo d'água, folhas, legumes caindo, balança e logo: **desenhar em SVG** (não usar foto), para animar com leveza.

Se alguma imagem não puder ser baixada, usar um gradiente verde→azul como fundo provisório e deixar `<!-- TODO: imagem -->`.

---

## 11. Responsividade

- Breakpoints: **< 640px** (celular), **640–1024px** (tablet), **> 1024px** (desktop).
- Mobile-first; tipografia fluida com `clamp()`.
- Áreas de toque com no mínimo 44×44px.
- Nenhuma rolagem horizontal em 360px de largura.
- Gráfico redimensiona; tabelas viram cards empilhados no celular.
- No celular, o copo d'água fica centralizado atrás do texto com opacidade menor para não atrapalhar a leitura.

---

## 12. Fases de construção (pedir ao Claude Code uma por vez)

1. **Base:** estrutura de pastas, `base.css` com variáveis, fontes, componentes de botão (com ripple), toast, cards.
2. **Landing page:** HTML + CSS de todas as seções com a copy da seção 5.
3. **Animações de scroll:** copo d'água + demais efeitos da seção 6.
4. **Login/cadastro** + `storage.js` + `auth.js` + proteção do `app.html`.
5. **Layout do app** com menu lateral e navegação por hash (desktop e mobile).
6. **Minha ficha.**
7. **Minha evolução** com gráfico.
8. **Meus produtos** + lembrete/contagem regressiva + badge + toast no login.
9. **Imagens** (baixar, otimizar, créditos).
10. **Revisão final:** testar em 360px, 768px e 1440px; checar acessibilidade, `prefers-reduced-motion` e console sem erros.
11. **(Futuro) Vercel:** `schema.sql`, funções em `/api`, trocar `storage.js` para `fetch`, autenticação real, variáveis de ambiente.

---

## 13. Checklist de aceite

- [ ] Abre e funciona em desktop e celular
- [ ] Copo d'água enche ao descer e esvazia ao subir
- [ ] Pelo menos 5 outras animações de scroll funcionando
- [ ] Cadastro, login e logout funcionando; `app.html` protegido
- [ ] Ficha salva e recarrega os dados; idade e IMC automáticos
- [ ] Evolução mostra diferença de peso, meta, progresso e gráfico com linha da meta
- [ ] Produto correto conforme sexo (Mounjaro / Testosterona), com mL e intervalo
- [ ] Contagem de dias aparece ao abrir "Meus produtos", com estados (normal, amanhã, hoje, atrasada)
- [ ] Badge no menu + aviso ao entrar quando a dose estiver próxima
- [ ] Todo acesso a dados passa por `storage.js`
- [ ] Avisos de saúde visíveis no rodapé e em "Meus produtos"
