-- ==============================================================================
-- Migración: Planificación — renombrar y eliminar slots desde la grilla (CU-08)
-- Decisiones: ADR-003 (D4 y D5)
--   · El Supervisor renombra y elimina solo sus propios slots.
--   · Eliminar un slot es una decisión expresa del supervisor (la reasignación del vendedor nunca
--     lo borra, D4): su vendedor queda libre y la planificación del slot se elimina en cascada
--     cuando exista planificacion_rutas (CU-09).
-- ==============================================================================

-- SLOT_RENOMBRAR: cambia el nombre de un slot propio (obligatorio, hasta 50 caracteres)
CREATE OR REPLACE FUNCTION public.slot_renombrar(p_id_slot bigint, p_id_supervisor bigint, p_nombre text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_nombre text := btrim(COALESCE(p_nombre, ''));
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;
    IF v_nombre = '' OR char_length(v_nombre) > 50 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'nombre_invalido');
    END IF;

    UPDATE public.vendedor_slots
       SET nombre = v_nombre
     WHERE id = p_id_slot AND id_supervisor = p_id_supervisor;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', p_id_slot);
END;
$$;

-- SLOT_ELIMINAR: elimina un slot propio; el vendedor que lo ocupaba queda sin slot, pero sigue en el equipo
CREATE OR REPLACE FUNCTION public.slot_eliminar(p_id_slot bigint, p_id_supervisor bigint)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    PERFORM 1 FROM public.personas WHERE id = p_id_supervisor FOR UPDATE;

    DELETE FROM public.vendedor_slots WHERE id = p_id_slot AND id_supervisor = p_id_supervisor;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', p_id_slot);
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.slot_renombrar(bigint, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_eliminar(bigint, bigint) FROM PUBLIC, anon, authenticated;
