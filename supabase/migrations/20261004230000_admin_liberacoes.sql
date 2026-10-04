-- ============================================================================
-- PontoFit — liberação manual de dias pela administração
--
-- O administrador pode somar dias de acesso a um assinante (cortesia,
-- compensação, pagamento feito por fora). Cada liberação fica registrada em
-- admin_liberacoes: quem liberou, para quem, quantos dias, o motivo e o acesso
-- antes e depois. Só o servidor (service_role, api/admin/liberar) usa.
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

create table public.admin_liberacoes (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references auth.users (id) on delete set null,
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  dias           smallint not null check (dias between 1 and 365),
  motivo         text not null check (char_length(motivo) between 3 and 200),
  acesso_antes   date,
  acesso_depois  date not null,
  criado_em      timestamptz not null default now()
);
create index admin_liberacoes_usuario_idx on public.admin_liberacoes (usuario_id);

-- RLS ligado e nenhuma política: só o servidor lê e grava.
alter table public.admin_liberacoes enable row level security;
revoke all on table public.admin_liberacoes from public, anon, authenticated;
grant select, insert on table public.admin_liberacoes to service_role;

-- Soma os dias a partir do fim do acesso atual (ou de hoje, se já venceu),
-- igual a um pagamento aprovado, e registra a liberação. → novo acesso_ate
create or replace function public.liberar_dias_admin(p_usuario uuid, p_dias int, p_admin uuid, p_motivo text)
returns date
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_hoje   date := (now() at time zone 'America/Sao_Paulo')::date;
  v_antes  date;
  v_depois date;
begin
  if p_dias is null or p_dias < 1 or p_dias > 365 then
    raise exception 'Quantidade de dias inválida' using errcode = '22023';
  end if;

  select acesso_ate into v_antes from public.perfis where id = p_usuario for update;
  if not found then
    raise exception 'Assinante não encontrado' using errcode = 'P0002';
  end if;

  v_depois := greatest(v_antes, v_hoje - 1) + p_dias;
  update public.perfis set acesso_ate = v_depois where id = p_usuario;

  insert into public.admin_liberacoes (admin_id, usuario_id, dias, motivo, acesso_antes, acesso_depois)
  values (p_admin, p_usuario, p_dias, btrim(p_motivo), v_antes, v_depois);

  return v_depois;
end;
$$;
revoke execute on function public.liberar_dias_admin(uuid, int, uuid, text) from public, anon, authenticated;
grant execute on function public.liberar_dias_admin(uuid, int, uuid, text) to service_role;
