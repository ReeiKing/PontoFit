-- ============================================================================
-- PontoFit — excluir conta pela administração
--
-- Ao excluir uma conta (auth.users), os dados pessoais e de saúde são apagados
-- em cascata (perfil, ficha, pesos, medicamentos, água, favoritas...).
-- O que precisa ficar para o controle financeiro e de auditoria é mantido sem
-- vínculo com a conta (usuario_id passa a null):
--   pagamentos_pix, pagamentos_cartao, admin_liberacoes, admin_acoes.
-- descontos_usados já guarda o CPF (o desconto não volta numa conta nova).
-- contas_excluidas registra quem excluiu, quando, o motivo e um resumo.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

alter table public.pagamentos_pix alter column usuario_id drop not null;
alter table public.pagamentos_pix drop constraint pagamentos_pix_usuario_id_fkey;
alter table public.pagamentos_pix add constraint pagamentos_pix_usuario_id_fkey
  foreign key (usuario_id) references auth.users (id) on delete set null;

alter table public.pagamentos_cartao alter column usuario_id drop not null;
alter table public.pagamentos_cartao drop constraint pagamentos_cartao_usuario_id_fkey;
alter table public.pagamentos_cartao add constraint pagamentos_cartao_usuario_id_fkey
  foreign key (usuario_id) references auth.users (id) on delete set null;

alter table public.admin_liberacoes alter column usuario_id drop not null;
alter table public.admin_liberacoes drop constraint admin_liberacoes_usuario_id_fkey;
alter table public.admin_liberacoes add constraint admin_liberacoes_usuario_id_fkey
  foreign key (usuario_id) references auth.users (id) on delete set null;

alter table public.admin_acoes alter column usuario_id drop not null;
alter table public.admin_acoes drop constraint admin_acoes_usuario_id_fkey;
alter table public.admin_acoes add constraint admin_acoes_usuario_id_fkey
  foreign key (usuario_id) references auth.users (id) on delete set null;

-- Registro das exclusões (sem chave estrangeira: a conta não existe mais).
create table public.contas_excluidas (
  id                   uuid primary key default gen_random_uuid(),
  usuario_id           uuid not null,
  admin_id             uuid references auth.users (id) on delete set null,
  nome                 text,
  email                text not null,
  cpf_mascarado        text,
  motivo               text not null check (char_length(motivo) between 3 and 200),
  pagamentos_aprovados integer not null default 0,
  total_pago           numeric(10,2) not null default 0,
  conta_criada_em      timestamptz,
  excluida_em          timestamptz not null default now()
);
alter table public.contas_excluidas enable row level security;
revoke all on table public.contas_excluidas from public, anon, authenticated;
grant select, insert on table public.contas_excluidas to service_role;
