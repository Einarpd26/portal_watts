-- ==============================================================================
-- Migración: Territorio — datos para el informe de correcciones del lote (CU-16)
-- Decisiones: ADR-002 D9 (punto 10)
-- El informe dice qué hay que corregir en el origen para que cada ruta pase, y para clasificar un
-- solape (astilla, chico, parcial, contenida) necesita las áreas de las dos rutas:
--   * ruta_evaluar: cada conflicto trae también el área de la ruta en conflicto (`area_ruta_m2`).
--   * ruta_guardar: los rechazos por superposición, invasión o cobertura traen el área de la ruta
--     que se intentó guardar (`area_m2`).
--   * ruta_lote_procesar: una ruta actualizada devuelve su polígono anterior (`geojson_anterior`),
--     que la bitácora conserva para poder revertir el cambio.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.ruta_evaluar(p_geojson text, p_excluir_id bigint DEFAULT NULL, p_id_zona bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_conflictos jsonb;
    v_invasiones jsonb := '[]'::jsonb;
    v_coberturas jsonb := '[]'::jsonb;
BEGIN
    BEGIN
        v_geom := ST_SetSRID(ST_SnapToGrid(ST_GeomFromGeoJSON(p_geojson), 0.000001), 4326);
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('ok', false, 'error', 'geojson_invalido');
    END;

    IF v_geom IS NULL OR GeometryType(v_geom) <> 'POLYGON' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_poligono');
    END IF;

    IF NOT ST_IsValid(v_geom) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'geometria_invalida', 'detalle', ST_IsValidReason(v_geom));
    END IF;

    -- Se incluye el código de la zona: aunque la ruta esté fuera del alcance de quien opera, debe saber
    -- a qué zona pedirle el espacio (la API oculta el código y el polígono de la ruta, no el de la zona)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', r.id,
               'codigo_ruta', r.codigo_ruta,
               'id_zona', r.id_zona,
               'codigo_zona', z.codigo_zona,
               'area_m2', round(ST_Area(ST_Intersection(r.localizacion, v_geom)::geography)::numeric, 2),
               'area_ruta_m2', round(ST_Area(r.localizacion::geography)::numeric, 2),
               'geojson', ST_AsGeoJSON(ST_SimplifyPreserveTopology(r.localizacion, 0.00001))::jsonb
           ) ORDER BY r.codigo_ruta), '[]'::jsonb)
      INTO v_conflictos
      FROM public.rutas r
      JOIN public.zonas z ON z.id = r.id_zona
     WHERE (p_excluir_id IS NULL OR r.id <> p_excluir_id)
       AND r.localizacion && v_geom
       AND ST_Relate(r.localizacion, v_geom, 'T********');

    IF p_id_zona IS NOT NULL THEN
        -- Una ruta que el polígono pisa ya es un conflicto de superposición: no se repite como invasión
        SELECT COALESCE(jsonb_agg(i ORDER BY i->>'codigo_ruta'), '[]'::jsonb)
          INTO v_invasiones
          FROM jsonb_array_elements(public.zona_invasiones_nuevas(p_id_zona, v_geom, p_excluir_id)) i
         WHERE NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_conflictos) c WHERE c->'id' = i->'id'
               );
        -- Zonas ajenas cuya envolvente cubriría el polígono (la zona de la ruta no cuenta: es la suya)
        v_coberturas := public.zona_coberturas_ajenas(p_id_zona, v_geom, p_excluir_id);
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'geojson', ST_AsGeoJSON(v_geom)::jsonb,
        'vertices', ST_NPoints(v_geom),
        'area_m2', round(ST_Area(v_geom::geography)::numeric, 2),
        'conflictos', v_conflictos,
        'invasiones', v_invasiones,
        'coberturas', v_coberturas
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.ruta_guardar(
    p_id_zona bigint,
    p_codigo_ruta text,
    p_ruta text,
    p_id bigint DEFAULT NULL,
    p_descripcion_ruta text DEFAULT NULL,
    p_geojson text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_eval jsonb;
    v_geom geometry;
    v_id bigint;
    v_codigo_zona_duplicado text;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

    SELECT z.codigo_zona INTO v_codigo_zona_duplicado
      FROM public.rutas r
      JOIN public.zonas z ON z.id = r.id_zona
     WHERE r.codigo_ruta = p_codigo_ruta
       AND r.id IS DISTINCT FROM p_id;
    IF FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicado', 'codigo_zona', v_codigo_zona_duplicado);
    END IF;

    IF p_geojson IS NOT NULL THEN
        v_eval := public.ruta_evaluar(p_geojson, p_id, p_id_zona);
        IF NOT (v_eval->>'ok')::boolean THEN
            RETURN v_eval;
        END IF;
        IF jsonb_array_length(v_eval->'conflictos') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'superposicion', 'conflictos', v_eval->'conflictos', 'area_m2', v_eval->'area_m2');
        END IF;
        IF jsonb_array_length(v_eval->'invasiones') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invasion', 'invasiones', v_eval->'invasiones', 'area_m2', v_eval->'area_m2');
        END IF;
        IF jsonb_array_length(v_eval->'coberturas') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'cobertura', 'coberturas', v_eval->'coberturas', 'area_m2', v_eval->'area_m2');
        END IF;
        v_geom := ST_SetSRID(ST_GeomFromGeoJSON((v_eval->'geojson')::text), 4326);
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO public.rutas (codigo_ruta, ruta, descripcion_ruta, localizacion, id_zona)
        VALUES (p_codigo_ruta, p_ruta, p_descripcion_ruta, v_geom, p_id_zona)
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.rutas
           SET codigo_ruta = p_codigo_ruta,
               ruta = p_ruta,
               descripcion_ruta = p_descripcion_ruta,
               localizacion = COALESCE(v_geom, localizacion)
         WHERE id = p_id
        RETURNING id INTO v_id;
        IF v_id IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
        END IF;
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'zona_invalida');
    -- Último resguardo: lo dispara el trigger de superposición si algo esquivara la evaluación
    WHEN exclusion_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'superposicion', 'conflictos', '[]'::jsonb);
END;
$$;

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
                        v_resultados := v_resultados || (v_entrada || jsonb_build_object(
                            'estado', 'actualizada', 'id', (v_res->>'id')::bigint,
                            'geojson_anterior', ST_AsGeoJSON(v_existente.localizacion)::jsonb));
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
REVOKE EXECUTE ON FUNCTION public.ruta_evaluar(text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_guardar(bigint, text, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_lote_procesar(bigint, jsonb, bigint[], boolean) FROM PUBLIC, anon, authenticated;
