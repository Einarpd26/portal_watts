-- ==============================================================================
-- Migración: Territorio — importación de rutas por lote (CU-16)
-- Decisiones: ADR-002 D9 (modo parcial), D8 (el código de ruta identifica a la ruta)
-- Una sola función recorre el lote EN EL ORDEN DEL ARCHIVO y aplica a cada ruta las mismas reglas de
-- CU-05 (ruta_evaluar y ruta_guardar). Cada ruta se guarda en su propia subtransacción: si una se
-- rechaza, las demás siguen (modo parcial). Las rutas ya aceptadas cuentan como existentes para las
-- siguientes, así que el resultado de la regla de no invasión puede depender del orden.
-- Sin confirmar (vista previa), todo se deshace al final, de modo que la vista previa es exactamente
-- lo que haría la confirmación. El bloqueo consultivo se toma una vez y dura todo el lote.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.ruta_lote_procesar(
    p_id_sucursal bigint,
    p_items jsonb,
    p_ids_zona bigint[] DEFAULT NULL,
    p_confirmar boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_item jsonb;
    v_indice integer;
    v_codigo text;
    v_ruta text;
    v_descripcion text;
    v_geojson text;
    v_zona bigint;
    v_existente record;
    v_eval jsonb;
    v_res jsonb;
    v_geom geometry;
    v_resultados jsonb := '[]'::jsonb;
    v_entrada jsonb;
    v_resumen jsonb;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.sucursales s WHERE s.id = p_id_sucursal) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sucursal_invalida');
    END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'lote_invalido');
    END IF;

    BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

        FOR v_item, v_indice IN
            SELECT e.item, (e.pos - 1)::integer FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(item, pos) ORDER BY e.pos
        LOOP
            v_codigo := v_item->>'codigo_ruta';
            v_ruta := v_item->>'ruta';
            v_descripcion := v_item->>'descripcion_ruta';
            v_geojson := (v_item->'poligono')::text;
            v_entrada := jsonb_build_object('indice', COALESCE((v_item->>'indice')::integer, v_indice), 'codigo_ruta', v_codigo);

            BEGIN
                SELECT z.id INTO v_zona
                  FROM public.zonas z
                 WHERE z.id_sucursal = p_id_sucursal AND z.codigo_zona = v_item->>'codigo_zona';
                IF NOT FOUND THEN
                    v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', 'zona_inexistente'));
                    CONTINUE;
                END IF;
                IF p_ids_zona IS NOT NULL AND NOT (v_zona = ANY (p_ids_zona)) THEN
                    v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', 'fuera_de_alcance'));
                    CONTINUE;
                END IF;

                SELECT r.id, r.id_zona, r.ruta, r.descripcion_ruta, r.localizacion, z.codigo_zona
                  INTO v_existente
                  FROM public.rutas r
                  JOIN public.zonas z ON z.id = r.id_zona
                 WHERE r.codigo_ruta = v_codigo;

                IF FOUND AND v_existente.id_zona <> v_zona THEN
                    -- El lote nunca cambia la zona de una ruta: eso es el traslado (CU-06)
                    v_resultados := v_resultados || (v_entrada || jsonb_build_object(
                        'estado', 'rechazada', 'motivo', 'en_otra_zona', 'codigo_zona', v_existente.codigo_zona));
                    CONTINUE;
                END IF;

                IF FOUND THEN
                    v_eval := public.ruta_evaluar(v_geojson, v_existente.id, v_zona);
                    IF NOT (v_eval->>'ok')::boolean THEN
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', v_eval->>'error')
                            || CASE WHEN v_eval ? 'detalle' THEN jsonb_build_object('detalle', v_eval->>'detalle') ELSE '{}'::jsonb END);
                        CONTINUE;
                    END IF;
                    v_geom := ST_SetSRID(ST_GeomFromGeoJSON((v_eval->'geojson')::text), 4326);
                    IF ST_Equals(v_geom, v_existente.localizacion)
                       AND v_ruta = v_existente.ruta
                       AND COALESCE(v_descripcion, '') = COALESCE(v_existente.descripcion_ruta, '') THEN
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'sin_cambios', 'id', v_existente.id));
                        CONTINUE;
                    END IF;
                    v_res := public.ruta_guardar(v_zona, v_codigo, v_ruta, v_existente.id, v_descripcion, v_geojson);
                    IF (v_res->>'ok')::boolean THEN
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'actualizada', 'id', (v_res->>'id')::bigint));
                    ELSE
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', v_res->>'error')
                            || (v_res - 'ok' - 'error'));
                    END IF;
                ELSE
                    v_res := public.ruta_guardar(v_zona, v_codigo, v_ruta, NULL, v_descripcion, v_geojson);
                    IF (v_res->>'ok')::boolean THEN
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'nueva', 'id', (v_res->>'id')::bigint));
                    ELSE
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', v_res->>'error')
                            || (v_res - 'ok' - 'error'));
                    END IF;
                END IF;
            EXCEPTION
                -- Una ruta que falla de forma inesperada no detiene el lote; lo que hizo se deshace
                WHEN OTHERS THEN
                    v_resultados := v_resultados || (v_entrada || jsonb_build_object('estado', 'rechazada', 'motivo', 'error'));
            END;
        END LOOP;

        v_resumen := jsonb_build_object(
            'nuevas',       (SELECT count(*) FROM jsonb_array_elements(v_resultados) r WHERE r->>'estado' = 'nueva'),
            'actualizadas', (SELECT count(*) FROM jsonb_array_elements(v_resultados) r WHERE r->>'estado' = 'actualizada'),
            'sin_cambios',  (SELECT count(*) FROM jsonb_array_elements(v_resultados) r WHERE r->>'estado' = 'sin_cambios'),
            'rechazadas',   (SELECT count(*) FROM jsonb_array_elements(v_resultados) r WHERE r->>'estado' = 'rechazada')
        );

        IF NOT p_confirmar THEN
            -- Vista previa: se deshace todo lo guardado; el resultado viaja en el mensaje de la excepción
            RAISE EXCEPTION USING ERRCODE = 'LV001', MESSAGE = jsonb_build_object(
                'ok', true, 'confirmado', false, 'resumen', v_resumen, 'resultados', v_resultados)::text;
        END IF;

        RETURN jsonb_build_object('ok', true, 'confirmado', true, 'resumen', v_resumen, 'resultados', v_resultados);
    EXCEPTION
        WHEN SQLSTATE 'LV001' THEN
            GET STACKED DIAGNOSTICS v_geojson = MESSAGE_TEXT;
            RETURN v_geojson::jsonb;
    END;
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.ruta_lote_procesar(bigint, jsonb, bigint[], boolean) FROM PUBLIC, anon, authenticated;
