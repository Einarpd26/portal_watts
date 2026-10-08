-- ==============================================================================
-- Migración: Rutas (CU-05) — importación de GeoJSON, validación de superposición y listado
-- Decisiones: ADR-002 (GeoJSON Polygon, no superposición por interiores con ST_Relate)
-- Estas funciones las invoca solo el servidor con la llave de servicio (como el resto del
-- esquema public), por eso se revoca EXECUTE a anon y authenticated.
-- ==============================================================================

-- Tolerancia de astillas (Fase C): las coordenadas se ajustan a una grilla de 1e-6 grados
-- (~0,11 m). Absorbe el ruido de punto flotante de los editores GeoJSON sin que dos rutas que
-- deberían compartir borde terminen con una superposición de micras. Una superposición real,
-- aunque sea de pocos centímetros por encima de la grilla, se sigue rechazando (RN-01).

-- 1. EVALUAR: parsea, normaliza, valida y busca conflictos SIN guardar (vista previa de CU-05)
CREATE OR REPLACE FUNCTION public.ruta_evaluar(p_geojson text, p_excluir_id bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_conflictos jsonb;
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

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'id', r.id,
               'codigo_ruta', r.codigo_ruta,
               'id_zona', r.id_zona,
               'area_m2', round(ST_Area(ST_Intersection(r.localizacion, v_geom)::geography)::numeric, 2),
               'geojson', ST_AsGeoJSON(ST_SimplifyPreserveTopology(r.localizacion, 0.00001))::jsonb
           ) ORDER BY r.codigo_ruta), '[]'::jsonb)
      INTO v_conflictos
      FROM public.rutas r
     WHERE (p_excluir_id IS NULL OR r.id <> p_excluir_id)
       AND r.localizacion && v_geom
       AND ST_Relate(r.localizacion, v_geom, 'T********');

    RETURN jsonb_build_object(
        'ok', true,
        'geojson', ST_AsGeoJSON(v_geom)::jsonb,
        'vertices', ST_NPoints(v_geom),
        'area_m2', round(ST_Area(v_geom::geography)::numeric, 2),
        'conflictos', v_conflictos
    );
END;
$$;

-- 2. GUARDAR: alta o reemplazo atómico. El bloqueo consultivo (el mismo del trigger de
-- superposición) serializa evaluación e inserción, así dos altas simultáneas no se cruzan.
-- p_id NULL = alta; p_id con p_geojson NULL = edición solo de datos administrativos.
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
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

    IF p_geojson IS NOT NULL THEN
        v_eval := public.ruta_evaluar(p_geojson, p_id);
        IF NOT (v_eval->>'ok')::boolean THEN
            RETURN v_eval;
        END IF;
        IF jsonb_array_length(v_eval->'conflictos') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'superposicion', 'conflictos', v_eval->'conflictos');
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

-- 3. LISTAR: rutas con su polígono simplificado (~1 m) para el mapa (RNF-02).
-- Los filtros nulos significan "sin restricción"; el servidor decide el alcance.
CREATE OR REPLACE FUNCTION public.rutas_listar(p_ids_zona bigint[] DEFAULT NULL, p_id_sucursal bigint DEFAULT NULL)
RETURNS TABLE (
    id bigint,
    codigo_ruta text,
    ruta text,
    descripcion_ruta text,
    id_zona bigint,
    geojson jsonb
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
    SELECT r.id, r.codigo_ruta, r.ruta, r.descripcion_ruta, r.id_zona,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(r.localizacion, 0.00001))::jsonb
      FROM public.rutas r
      JOIN public.zonas z ON z.id = r.id_zona
     WHERE (p_ids_zona IS NULL OR r.id_zona = ANY (p_ids_zona))
       AND (p_id_sucursal IS NULL OR z.id_sucursal = p_id_sucursal)
     ORDER BY r.codigo_ruta;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC a toda función nueva (convención del proyecto: revocar por función)
REVOKE EXECUTE ON FUNCTION public.ruta_evaluar(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_guardar(bigint, text, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rutas_listar(bigint[], bigint) FROM PUBLIC, anon, authenticated;
