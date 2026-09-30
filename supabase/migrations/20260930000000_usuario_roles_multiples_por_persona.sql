-- ==============================================================================
-- Migración: Permitir múltiples roles por persona en usuario_roles
-- Reemplaza: constraint uq_usuario_roles_persona (UNIQUE id_persona) de
--            20260914233000_usuario_roles_unico_por_persona.sql
--
-- Motivo: ADR-001 (Ing_Req_Mod_Angelica) modela explícitamente el escenario de
-- cobertura excepcional — un colaborador puede ejercer temporalmente un segundo
-- rol (ej. Supervisor actuando como GERENCIA_COMERCIAL). La constraint anterior
-- bloqueaba ese caso en datos. El invariante correcto es que una persona no puede
-- tener el MISMO rol para la MISMA sucursal dos veces, no que solo pueda tener
-- un rol total.
--
-- Invariante resultante (alineado con ADR-001 Sección B):
--   UNIQUE(id_persona, id_rol, id_sucursal)
--   — un colaborador puede tener N roles distintos
--   — no puede repetir el mismo rol en la misma sucursal
--   — id_sucursal puede ser NULL para alcance GLOBAL (cuenta como valor único
--     en la constraint gracias a NULLS NOT DISTINCT)
-- ==============================================================================

ALTER TABLE public.usuario_roles
    DROP CONSTRAINT IF EXISTS uq_usuario_roles_persona;

ALTER TABLE public.usuario_roles
    ADD CONSTRAINT uq_usuario_roles_persona_rol_sucursal
    UNIQUE NULLS NOT DISTINCT (id_persona, id_rol, id_sucursal);

COMMENT ON CONSTRAINT uq_usuario_roles_persona_rol_sucursal ON public.usuario_roles IS
    'Un colaborador no puede tener el mismo rol asignado dos veces para la misma sucursal. Permite múltiples roles distintos (ej. cobertura excepcional). NULLS NOT DISTINCT trata dos filas con id_sucursal NULL como duplicadas entre sí.';
