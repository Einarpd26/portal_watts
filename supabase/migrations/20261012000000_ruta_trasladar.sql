-- ==============================================================================
-- Migración: Territorio — traslado de ruta entre zonas con la regla de no invasión (CU-06)
-- Decisiones: ADR-002 D7 (la envolvente de una zona no puede pasar a cubrir rutas de otras zonas)
-- El traslado no cambia el polígono, pero sí la envolvente de la zona destino: se valida con la
-- misma regla que ruta_guardar y bajo el mismo bloqueo consultivo, para que un traslado y un alta
-- simultáneos en zonas vecinas no la eludan.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.ruta_trasladar(p_id bigint, p_id_zona_destino bigint)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_invasiones jsonb;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

    SELECT r.localizacion INTO v_geom FROM public.rutas r WHERE r.id = p_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.zonas z WHERE z.id = p_id_zona_destino) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'zona_invalida');
    END IF;

    -- Invasiones NUEVAS de la zona destino al sumar esta ruta; las heredadas no bloquean (D7, punto 1)
    v_invasiones := public.zona_invasiones_nuevas(p_id_zona_destino, v_geom, p_id);
    IF jsonb_array_length(v_invasiones) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invasion', 'invasiones', v_invasiones);
    END IF;

    UPDATE public.rutas SET id_zona = p_id_zona_destino WHERE id = p_id;

    RETURN jsonb_build_object('ok', true, 'id', p_id);
EXCEPTION
    -- El código de ruta es único por zona: la zona destino ya puede tener uno igual
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'zona_invalida');
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.ruta_trasladar(bigint, bigint) FROM PUBLIC, anon, authenticated;
