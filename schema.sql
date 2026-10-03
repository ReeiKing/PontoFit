-- PontoFit — schema do banco (FUTURO, Fase 11). Não está ativo nesta versão.
-- Postgres (Neon via Vercel Marketplace ou Supabase). gen_random_uuid() é nativo no Postgres 13+.

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

-- Assinatura e mensalidades (seção "Meu plano"). O PontoFit ainda não processa
-- pagamentos: pago_em é registrado pela própria pessoa.
CREATE TABLE assinaturas (
  usuario_id        UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  plano             TEXT NOT NULL CHECK (plano IN ('mensal','anual')),
  teste_gratis_ate  DATE NOT NULL
);

CREATE TABLE cobrancas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  numero        INTEGER NOT NULL,
  vencimento    DATE NOT NULL,
  plano         TEXT NOT NULL CHECK (plano IN ('mensal','anual')),
  valor         NUMERIC(8,2) NOT NULL,
  pago_em       DATE
);
