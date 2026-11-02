-- ==============================================================================
-- Migración: Planificación — reordenar los slots arrastrando filas (CU-08 A2)
-- Decisiones: ADR-003 (D5)
--   · El supervisor arrastra un slot a otra posición; la pantalla envía el orden completo y esta
--     función lo guarda en una sola transacción, con numeración 0..n-1 sin huecos.
--   · El orden enviado debe ser exactamente el conjunto de slots del supervisor: si creó o eliminó
--     uno desde otra pestaña, se rechaza y la pantalla vuelve a cargar.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.slot_reordenar(p_id_supervisor bigint, p_ids bigint[])
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_propios bigint[];
    v_enviados bigint[];
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    PERFORM 1 FROM public.personas WHERE id = p_id_supervisor FOR UPDATE;

    SELECT COALESCE(array_agg(id ORDER BY id), '{}') INTO v_propios
      FROM public.vendedor_slots WHERE id_supervisor = p_id_supervisor;
    SELECT COALESCE(array_agg(x ORDER BY x), '{}') INTO v_enviados FROM unnest(COALESCE(p_ids, '{}')) AS x;

    -- Mismo conjunto, sin repetidos ni ajenos
    IF v_propios IS DISTINCT FROM v_enviados OR cardinality(COALESCE(p_ids, '{}')) <> cardinality(v_propios) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'orden_invalido');
    END IF;

    UPDATE public.vendedor_slots s
       SET orden = (t.pos - 1)::integer
      FROM unnest(p_ids) WITH ORDINALITY AS t(id, pos)
     WHERE s.id = t.id AND s.orden <> (t.pos - 1)::integer;

    RETURN jsonb_build_object('ok', true);
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.slot_reordenar(bigint, bigint[]) FROM PUBLIC, anon, authenticated;
