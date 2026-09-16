-- ==============================================================================
-- Migración: Rol único por persona en usuario_roles
-- Motivo: CU-01, CU-02 y ADR-001 describen siempre "el rol" del colaborador en
-- singular. Los índices parciales previos permitían que una persona tuviera
-- más de una fila en usuario_roles a la vez (ej. un rol GLOBAL y otro SUCURSAL
-- simultáneos), lo que hacía no determinística la resolución de sesión en
-- /api/auth/me (selección arbitraria de la primera fila embebida).
-- ==============================================================================

DROP INDEX IF EXISTS public.unique_usuario_roles_global_idx;
DROP INDEX IF EXISTS public.unique_usuario_roles_sucursal_idx;

ALTER TABLE public.usuario_roles
    ADD CONSTRAINT uq_usuario_roles_persona UNIQUE (id_persona);

COMMENT ON CONSTRAINT uq_usuario_roles_persona ON public.usuario_roles IS
    'Un colaborador tiene como máximo un rol de acceso activo (CU-01, CU-02, ADR-001). Reemplaza a unique_usuario_roles_global_idx y unique_usuario_roles_sucursal_idx.';

-- ==============================================================================
-- Migración: personas.fecha_baja pasa de timestamptz a date
-- Motivo: fecha_baja se usa como fecha calendario AGENDABLE del último día de
-- vínculo laboral (offboarding puede cargarse por adelantado), no como marca
-- de instante en que se ejecutó la baja en el sistema. Con timestamptz, una
-- fecha sin hora se guarda como las 00:00:00 de ese día: comparar contra el
-- instante actual (now()) corta el acceso desde el arranque de ese día en vez
-- de dejarlo trabajar la jornada completa. `date` elimina esa ambigüedad de
-- hora/huso horario: la comparación de vigencia debe hacerse por día
-- calendario (CURRENT_DATE > fecha_baja), nunca por instante.
--
-- Se mantiene el nombre `fecha_baja` (no se renombra) porque así está definido
-- en el modelo canónico de requisitos (ADR-001 y
-- watts_modulo1_organizacion_territorio.dbml, Ing_Req_Mod_Angelica) — cambiar
-- el nombre acá rompería la trazabilidad que el equipo debe mantener entre
-- código y especificación.
-- ==============================================================================

ALTER TABLE public.personas
    ALTER COLUMN fecha_baja TYPE date USING fecha_baja::date;

COMMENT ON COLUMN public.personas.fecha_baja IS
    'Fecha calendario (no instante) del último día de vínculo laboral. Puede agendarse por adelantado. La persona conserva acceso hasta el final de ese día inclusive: la baja de acceso se evalúa como CURRENT_DATE > fecha_baja, nunca comparando contra el instante actual.';
