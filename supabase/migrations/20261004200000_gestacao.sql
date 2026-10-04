-- ============================================================================
-- PontoFit — acompanhamento da gestação
--
-- A gestante ativa o acompanhamento na seção Gestação informando a data da
-- última menstruação (DUM) ou a data provável do parto (DPP) e o peso antes da
-- gravidez. A semana, o tamanho do bebê, o ganho de peso recomendado e os
-- alertas de medicamentos são calculados no app (js/gestacao.js).
--
-- Como aplicar: Supabase Dashboard → SQL Editor → cole este arquivo → Run.
-- ============================================================================

alter table public.fichas
  add column gestante boolean not null default false,
  add column gestacao_dum date,
  add column gestacao_dpp date,
  add column peso_pre_gestacional_kg numeric(5,1) check (peso_pre_gestacional_kg between 30 and 300);

alter table public.fichas add constraint fichas_gestacao_datas check (
  (gestacao_dum is null or gestacao_dum between date '2020-01-01' and date '2100-01-01')
  and (gestacao_dpp is null or gestacao_dpp between date '2020-01-01' and date '2100-01-01')
);

grant select (gestante, gestacao_dum, gestacao_dpp, peso_pre_gestacional_kg) on table public.fichas to authenticated;
grant insert (gestante, gestacao_dum, gestacao_dpp, peso_pre_gestacional_kg) on table public.fichas to authenticated;
grant update (gestante, gestacao_dum, gestacao_dpp, peso_pre_gestacional_kg) on table public.fichas to authenticated;
