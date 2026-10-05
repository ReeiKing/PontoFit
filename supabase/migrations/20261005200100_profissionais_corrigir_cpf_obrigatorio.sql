-- Correção: com tipo ausente, v_prof ficava NULL e a checagem de CPF do
-- paciente era pulada. coalesce(..., false) volta a exigir CPF de pacientes.
create or replace function private.criar_dados_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nome  text := left(coalesce(btrim(v_meta ->> 'nome'), ''), 120);
  v_plano text := case
    when v_meta ->> 'plano' in ('semanal', 'mensal', 'semestral') then v_meta ->> 'plano'
    else 'mensal'
  end;
  v_cpf   text := nullif(regexp_replace(coalesce(v_meta ->> 'cpf', ''), '\D', '', 'g'), '');
  v_prof  boolean := coalesce((v_meta ->> 'tipo') = 'profissional', false);
  v_profissao text := case
    when v_meta ->> 'profissao' in ('nutricionista', 'personal', 'academia', 'medico', 'outro') then v_meta ->> 'profissao'
    else 'outro'
  end;
begin
  if (v_prof and v_cpf is not null and not private.cpf_valido(v_cpf))
     or (not v_prof and not private.cpf_valido(coalesce(v_cpf, ''))) then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;

  insert into public.perfis (id, nome, email, plano, cpf, aceite_aviso_saude)
  values (new.id, v_nome, coalesce(new.email, ''), v_plano, v_cpf,
          coalesce((v_meta ->> 'aceite_aviso_saude')::boolean, false));
  insert into public.fichas (usuario_id, nome) values (new.id, nullif(v_nome, ''));

  if v_prof then
    insert into public.profissionais (usuario_id, nome, profissao, registro, empresa, codigo)
    values (new.id, coalesce(nullif(v_nome, ''), 'Profissional'), v_profissao,
            nullif(left(btrim(coalesce(v_meta ->> 'registro', '')), 40), ''),
            nullif(left(btrim(coalesce(v_meta ->> 'empresa', '')), 120), ''),
            private.gerar_codigo_profissional(v_nome));
  end if;
  return new;
end;
$$;
revoke execute on function private.criar_dados_novo_usuario() from public, anon, authenticated;
