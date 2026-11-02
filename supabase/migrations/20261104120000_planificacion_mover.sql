-- ==============================================================================
-- Migración: Planificación — mover una visita a otra celda de la grilla (CU-09)
-- Decisiones: ADR-003 (D5, D8 y D9)
--   · El supervisor arrastra una ruta planificada a otro slot o a otro día; la visita conserva su
--     id y su frecuencia.
--   · Solo entre slots propios y solo rutas de las zonas que supervisa hoy (RN-05).
--   · Si el destino ya tiene esa misma visita (slot, ruta, día y frecuencia) se rechaza.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.planificacion_mover(
    p_id bigint,
    p_id_supervisor bigint,
    p_id_slot_destino bigint,
    p_dia_destino text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;
    IF p_dia_destino IS NULL OR p_dia_destino NOT IN ('LU', 'MA', 'MI', 'JU', 'VI', 'SA') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dia_invalido');
    END IF;

    -- La visita y el slot de destino deben ser del supervisor
    IF NOT EXISTS (SELECT 1 FROM public.vendedor_slots WHERE id = p_id_slot_destino AND id_supervisor = p_id_supervisor) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    UPDATE public.planificacion_rutas pr
       SET id_vendedor_slot = p_id_slot_destino,
           dia_semana = p_dia_destino
      FROM public.vendedor_slots vs, public.rutas r, public.supervisor_zonas sz
     WHERE pr.id = p_id
       AND vs.id = pr.id_vendedor_slot AND vs.id_supervisor = p_id_supervisor
       -- RN-05: solo se mueve una ruta que sigue siendo de las zonas del supervisor
       AND r.id = pr.id_ruta AND sz.id_zona = r.id_zona AND sz.id_supervisor = p_id_supervisor;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', p_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ya_planificada');
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.planificacion_mover(bigint, bigint, bigint, text) FROM PUBLIC, anon, authenticated;
