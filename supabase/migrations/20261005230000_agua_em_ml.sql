-- Água em mililitros: o paciente escolhe o recipiente (copo, garrafa, caneca
-- de 1 L…) e a meta passa a ser em ml. Registros antigos: 1 copo = 250 ml.
-- copos/meta continuam preenchidos (equivalente em copos de 250 ml).

alter table public.registros_agua
  add column ml integer check (ml between 0 and 10000),
  add column meta_ml integer check (meta_ml between 500 and 8000);
update public.registros_agua set ml = copos * 250, meta_ml = greatest(500, least(8000, meta * 250));
alter table public.registros_agua
  alter column ml set not null, alter column ml set default 0,
  alter column meta_ml set not null, alter column meta_ml set default 2000;

-- Recipiente preferido do paciente (o botão "+" soma este volume).
alter table public.fichas
  add column recipiente_ml smallint not null default 250 check (recipiente_ml between 50 and 3000);

-- Meta de água do profissional em ml.
alter table public.orientacoes
  add column meta_agua_ml integer check (meta_agua_ml between 1000 and 8000);
update public.orientacoes set meta_agua_ml = meta_agua_copos * 250 where meta_agua_copos is not null;
alter table public.orientacoes drop column meta_agua_copos;
