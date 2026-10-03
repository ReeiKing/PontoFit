-- ============================================================================
-- PontoFit — schema inicial
--
-- Separação dos dados:
--   auth.*     login e senhas (Supabase Auth; senha guardada com hash pelo serviço)
--   public.*   dados de cada cliente, uma linha por dono, protegidos por RLS
--   private.*  funções internas, fora da API (não expostas pelo Data API)
--
-- Regras seguidas: RLS em todas as tabelas expostas, políticas com
-- (select auth.uid()) e WITH CHECK nos updates, índice em toda chave
-- estrangeira, GRANT explícito só para "authenticated" (anon não acessa nada).
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public;

-- ----------------------------------------------------------------------------
-- Perfil: dados da conta que o app mostra (nome, plano, teste grátis).
-- Criado automaticamente no cadastro pelo trigger lá embaixo.
-- ----------------------------------------------------------------------------
create table public.perfis (
  id                 uuid primary key references auth.users (id) on delete cascade,
  nome               text not null default '' check (char_length(nome) <= 120),
  email              text not null default '',
  plano              text not null default 'mensal' check (plano in ('mensal', 'anual')),
  teste_gratis_ate   date not null default (current_date + 30),
  aceite_aviso_saude boolean not null default false,
  criado_em          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Ficha do paciente (uma por usuário)
-- ----------------------------------------------------------------------------
create table public.fichas (
  usuario_id           uuid primary key references auth.users (id) on delete cascade,
  nome                 text check (char_length(nome) <= 120),
  data_nascimento      date,
  sexo                 text check (sexo in ('F', 'M')),
  telefone             text check (char_length(telefone) <= 30),
  cidade               text check (char_length(cidade) <= 80),
  estado               text check (char_length(estado) <= 2),
  altura_cm            numeric(5,1) check (altura_cm between 50 and 250),
  peso_inicial_kg      numeric(5,1) check (peso_inicial_kg between 20 and 400),
  data_peso_inicial    date,
  cintura_cm           numeric(5,1) check (cintura_cm between 30 and 250),
  objetivo             text check (objetivo in ('emagrecer', 'ganhar-massa', 'manter', 'disposicao')),
  nivel_atividade      text check (nivel_atividade in ('sedentario', 'leve', 'moderado', 'intenso')),
  condicoes_saude      text[] not null default '{}',
  condicoes_outras     text check (char_length(condicoes_outras) <= 300),
  alergias             text check (char_length(alergias) <= 1000),
  medicamentos_em_uso  text check (char_length(medicamentos_em_uso) <= 1000),
  profissional_nome    text check (char_length(profissional_nome) <= 120),
  profissional_contato text check (char_length(profissional_contato) <= 120),
  observacoes          text check (char_length(observacoes) <= 2000),
  meta_peso_kg         numeric(5,1) check (meta_peso_kg between 20 and 400),
  meta_data            date,
  marcos_vistos        text[] not null default '{}',
  atualizado_em        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Registros de peso (um por dia)
-- ----------------------------------------------------------------------------
create table public.registros_peso (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data        date not null,
  peso_kg     numeric(5,1) not null check (peso_kg between 20 and 400),
  cintura_cm  numeric(5,1) check (cintura_cm between 30 and 250),
  criado_em   timestamptz not null default now(),
  unique (usuario_id, data)          -- também serve de índice para usuario_id
);

-- ----------------------------------------------------------------------------
-- Medicamentos e aplicações
-- ----------------------------------------------------------------------------
create table public.medicamentos (
  id                    uuid primary key default gen_random_uuid(),
  usuario_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome                  text not null check (char_length(btrim(nome)) between 2 and 80),
  dose_ml               numeric(5,2) check (dose_ml > 0 and dose_ml <= 10),
  dose_mg               numeric(6,2) check (dose_mg > 0 and dose_mg <= 1000),
  intervalo_valor       integer check (intervalo_valor between 1 and 365),
  intervalo_unidade     text not null default 'dias' check (intervalo_unidade in ('dias', 'semanas')),
  intervalo_dias        integer check (intervalo_dias between 1 and 365),
  data_ultima_aplicacao date,
  observacoes           text check (char_length(observacoes) <= 1000),
  criado_em             timestamptz not null default now(),
  unique (id, usuario_id)            -- alvo da FK composta em aplicacoes
);
-- Um nome por usuário (sem diferenciar maiúsculas); também indexa usuario_id
create unique index medicamentos_usuario_nome_idx on public.medicamentos (usuario_id, lower(nome));

-- Nomes de medicamento criados pela pessoa (aparecem como opção nos próximos cadastros)
create table public.nomes_medicamentos (
  usuario_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome        text not null check (char_length(btrim(nome)) between 2 and 80),
  criado_em   timestamptz not null default now(),
  primary key (usuario_id, nome)
);

create table public.aplicacoes (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medicamento_id  uuid not null,
  data            date not null,
  dose_ml         numeric(5,2) check (dose_ml > 0 and dose_ml <= 10),
  criado_em       timestamptz not null default now(),
  -- A aplicação só pode apontar para um medicamento do MESMO usuário
  foreign key (medicamento_id, usuario_id) references public.medicamentos (id, usuario_id) on delete cascade
);
create index aplicacoes_medicamento_idx on public.aplicacoes (medicamento_id, usuario_id);
create index aplicacoes_usuario_idx on public.aplicacoes (usuario_id);

-- ----------------------------------------------------------------------------
-- Cesta de compras
-- ----------------------------------------------------------------------------
create table public.cesta_itens (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  texto           text not null check (char_length(btrim(texto)) between 1 and 200),
  receita_id      text check (char_length(receita_id) <= 80),
  receita_titulo  text check (char_length(receita_titulo) <= 160),
  comprado        boolean not null default false,
  posicao         integer not null default 0,
  criado_em       timestamptz not null default now()
);
create index cesta_itens_usuario_posicao_idx on public.cesta_itens (usuario_id, posicao);

-- ----------------------------------------------------------------------------
-- Mensalidades (o PontoFit ainda não cobra: a pessoa registra o que pagou)
-- ----------------------------------------------------------------------------
create table public.cobrancas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero        integer not null check (numero >= 1),
  offset_meses  integer not null check (offset_meses >= 0),
  vencimento    date not null,
  plano         text not null check (plano in ('mensal', 'anual')),
  valor         numeric(8,2) not null check (valor >= 0),
  pago_em       date,
  unique (usuario_id, numero)        -- também serve de índice para usuario_id
);

-- ============================================================================
-- Row Level Security: cada pessoa só enxerga e altera o que é dela
-- ============================================================================
alter table public.perfis              enable row level security;
alter table public.fichas              enable row level security;
alter table public.registros_peso      enable row level security;
alter table public.medicamentos        enable row level security;
alter table public.nomes_medicamentos  enable row level security;
alter table public.aplicacoes          enable row level security;
alter table public.cesta_itens         enable row level security;
alter table public.cobrancas           enable row level security;

-- Perfil: ler e alterar o próprio (criação só pelo trigger; sem DELETE pelo app)
create policy perfis_select_proprio on public.perfis for select to authenticated
  using ((select auth.uid()) = id);
create policy perfis_update_proprio on public.perfis for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Ficha: ler, criar e alterar a própria
create policy fichas_select_propria on public.fichas for select to authenticated
  using ((select auth.uid()) = usuario_id);
create policy fichas_insert_propria on public.fichas for insert to authenticated
  with check ((select auth.uid()) = usuario_id);
create policy fichas_update_propria on public.fichas for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- Tabelas de lista: acesso completo, sempre restrito ao dono
do $$
declare
  t text;
begin
  foreach t in array array['registros_peso', 'medicamentos', 'nomes_medicamentos', 'aplicacoes', 'cesta_itens', 'cobrancas']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = usuario_id)', t || '_select_proprio', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = usuario_id)', t || '_insert_proprio', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id)', t || '_update_proprio', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = usuario_id)', t || '_delete_proprio', t);
  end loop;
end
$$;

-- ============================================================================
-- Permissões (Data API). Tabelas novas não são expostas automaticamente desde
-- abril de 2026, e projetos antigos ainda podem ter grants padrão: por isso
-- tudo é revogado e só o necessário é concedido, e apenas a "authenticated".
-- ============================================================================
revoke all on table
  public.perfis, public.fichas, public.registros_peso, public.medicamentos,
  public.nomes_medicamentos, public.aplicacoes, public.cesta_itens, public.cobrancas
from public, anon, authenticated;

-- Perfil: o app pode trocar só o nome e o plano (e-mail e teste grátis não)
grant select on table public.perfis to authenticated;
grant update (nome, plano) on table public.perfis to authenticated;

grant select, insert, update on table public.fichas to authenticated;

grant select, insert, update, delete on table
  public.registros_peso, public.medicamentos, public.nomes_medicamentos,
  public.aplicacoes, public.cesta_itens, public.cobrancas
to authenticated;

-- ============================================================================
-- Funções internas (schema private, fora da API)
-- ============================================================================

-- No cadastro: cria perfil e ficha a partir dos dados enviados no signUp.
-- user_metadata só preenche conteúdo (nome, plano); nunca é usado para
-- autorização. SECURITY DEFINER porque o trigger roda em auth.users.
create or replace function private.criar_dados_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome  text := left(coalesce(btrim(new.raw_user_meta_data ->> 'nome'), ''), 120);
  v_plano text := case when new.raw_user_meta_data ->> 'plano' = 'anual' then 'anual' else 'mensal' end;
begin
  insert into public.perfis (id, nome, email, plano, aceite_aviso_saude)
  values (
    new.id,
    v_nome,
    coalesce(new.email, ''),
    v_plano,
    coalesce((new.raw_user_meta_data ->> 'aceite_aviso_saude')::boolean, false)
  );
  insert into public.fichas (usuario_id, nome) values (new.id, nullif(v_nome, ''));
  return new;
end;
$$;
revoke execute on function private.criar_dados_novo_usuario() from public, anon, authenticated;

create trigger pontofit_ao_criar_usuario
  after insert on auth.users
  for each row execute function private.criar_dados_novo_usuario();

-- Mantém fichas.atualizado_em em dia a cada alteração
create or replace function private.carimbar_atualizacao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
revoke execute on function private.carimbar_atualizacao() from public, anon, authenticated;

create trigger fichas_carimbar_atualizacao
  before update on public.fichas
  for each row execute function private.carimbar_atualizacao();
