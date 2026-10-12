-- ==============================================================================
-- Migración: Territorio — contorno de zona como envolvente cóncava única y regla de no invasión
-- Decisiones: ADR-002 D7 (reemplaza la forma del contorno de D6; sigue siendo derivado)
-- La envolvente de una zona no puede pasar a cubrir rutas de otras zonas. Solo se rechazan
-- invasiones NUEVAS: las heredadas no bloquean, pero tampoco se pueden agregar otras.
-- ==============================================================================

-- 1. ENVOLVENTE: una sola figura que cubre todas las rutas de la zona.
-- ST_ConcaveHull sobre los polígonos puede devolver un MultiPolygon; sobre los vértices siempre da
-- un polígono, pero puede cortar por dentro de una ruta. Unirla con las rutas garantiza que las
-- cubra, y como cada ruta aporta sus vértices a la envolvente, el resultado es un único polígono.
-- param_pctconvex = 0 es la envolvente más ajustada (1 equivale a la convexa).
CREATE OR REPLACE FUNCTION public.zona_envolvente(p_rutas extensions.geometry)
RETURNS extensions.geometry
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
    v_env geometry;
BEGIN
    IF p_rutas IS NULL OR ST_IsEmpty(p_rutas) THEN
        RETURN NULL;
    END IF;
    v_env := ST_Union(ST_ConcaveHull(ST_Points(p_rutas), 0.0), p_rutas);
    -- Resguardo ante una envolvente degenerada: la convexa también es una sola figura
    IF GeometryType(v_env) <> 'POLYGON' THEN
        v_env := ST_ConvexHull(p_rutas);
    END IF;
    RETURN ST_SetSRID(v_env, 4326);
END;
$$;

-- 2. INVASIONES NUEVAS: rutas de otras zonas que la envolvente de `p_id_zona` pasaría a cubrir si
-- se le agrega `p_geom` (sin la ruta `p_excluir_id`, que es la que se reemplaza). Se descartan las
-- que la envolvente actual ya cubría (ADR-002 D7, punto 1). Se compara contra todas las zonas,
-- como la regla de superposición; `misma_sucursal` dice si se puede sugerir el traslado (D4).
CREATE OR REPLACE FUNCTION public.zona_invasiones_nuevas(p_id_zona bigint, p_geom extensions.geometry, p_excluir_id bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
    v_sucursal bigint;
    v_antes geometry;
    v_despues geometry;
BEGIN
    SELECT z.id_sucursal INTO v_sucursal FROM public.zonas z WHERE z.id = p_id_zona;
    IF NOT FOUND OR p_geom IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT public.zona_envolvente(ST_UnaryUnion(ST_Collect(r.localizacion)))
      INTO v_antes
      FROM public.rutas r
     WHERE r.id_zona = p_id_zona;

    SELECT public.zona_envolvente(ST_UnaryUnion(ST_Collect(s.geom)))
      INTO v_despues
      FROM (
            SELECT r.localizacion AS geom
              FROM public.rutas r
             WHERE r.id_zona = p_id_zona
               AND (p_excluir_id IS NULL OR r.id <> p_excluir_id)
            UNION ALL
            SELECT p_geom
           ) s;

    RETURN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                   'id', r.id,
                   'codigo_ruta', r.codigo_ruta,
                   'id_zona', r.id_zona,
                   'codigo_zona', z.codigo_zona,
                   'misma_sucursal', z.id_sucursal = v_sucursal,
                   'area_m2', round(ST_Area(ST_Intersection(r.localizacion, v_despues)::geography)::numeric, 2),
                   'geojson', ST_AsGeoJSON(ST_SimplifyPreserveTopology(r.localizacion, 0.00001))::jsonb
               ) ORDER BY r.codigo_ruta)
          FROM public.rutas r
          JOIN public.zonas z ON z.id = r.id_zona
         WHERE r.id_zona <> p_id_zona
           AND (p_excluir_id IS NULL OR r.id <> p_excluir_id)
           AND r.localizacion && v_despues
           AND ST_Relate(v_despues, r.localizacion, 'T********')
           AND NOT (v_antes IS NOT NULL
                    AND r.localizacion && v_antes
                    AND ST_Relate(v_antes, r.localizacion, 'T********'))
    ), '[]'::jsonb);
END;
$$;

-- 3. EVALUAR: se agrega la zona destino para informar invasiones en la vista previa. Cambia la
-- firma, así que se elimina la anterior (ruta_guardar se recrea abajo con la nueva llamada).
DROP FUNCTION IF EXISTS public.ruta_evaluar(text, bigint);

CREATE OR REPLACE FUNCTION public.ruta_evaluar(p_geojson text, p_excluir_id bigint DEFAULT NULL, p_id_zona bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_conflictos jsonb;
    v_invasiones jsonb := '[]'::jsonb;
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

    -- Una ruta que el polígono pisa ya es un conflicto de superposición: no se repite como invasión
    IF p_id_zona IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(i ORDER BY i->>'codigo_ruta'), '[]'::jsonb)
          INTO v_invasiones
          FROM jsonb_array_elements(public.zona_invasiones_nuevas(p_id_zona, v_geom, p_excluir_id)) i
         WHERE NOT EXISTS (
                SELECT 1 FROM jsonb_array_elements(v_conflictos) c WHERE c->'id' = i->'id'
               );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'geojson', ST_AsGeoJSON(v_geom)::jsonb,
        'vertices', ST_NPoints(v_geom),
        'area_m2', round(ST_Area(v_geom::geography)::numeric, 2),
        'conflictos', v_conflictos,
        'invasiones', v_invasiones
    );
END;
$$;

-- 4. GUARDAR: igual que antes, más la regla de no invasión dentro del mismo bloqueo consultivo,
-- para que dos altas simultáneas en zonas vecinas no la eludan (D7, punto 4).
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
        v_eval := public.ruta_evaluar(p_geojson, p_id, p_id_zona);
        IF NOT (v_eval->>'ok')::boolean THEN
            RETURN v_eval;
        END IF;
        IF jsonb_array_length(v_eval->'conflictos') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'superposicion', 'conflictos', v_eval->'conflictos');
        END IF;
        IF jsonb_array_length(v_eval->'invasiones') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'invasion', 'invasiones', v_eval->'invasiones');
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

-- 5. CONTORNO DE ZONA (D7): la envolvente en lugar de la unión exacta de D6
CREATE OR REPLACE FUNCTION public.zonas_contorno(p_ids_zona bigint[], p_tolerancia double precision DEFAULT 0)
RETURNS TABLE (id_zona bigint, geojson jsonb)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
    SELECT u.id_zona,
           ST_AsGeoJSON(
               CASE WHEN p_tolerancia > 0 THEN ST_SimplifyPreserveTopology(u.geom, p_tolerancia) ELSE u.geom END
           )::jsonb
      FROM (
            SELECT r.id_zona, public.zona_envolvente(ST_UnaryUnion(ST_Collect(r.localizacion))) AS geom
              FROM public.rutas r
             WHERE r.id_zona = ANY (p_ids_zona)
             GROUP BY r.id_zona
           ) u
     ORDER BY u.id_zona;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC a toda función nueva (convención del proyecto: revocar por función)
REVOKE EXECUTE ON FUNCTION public.zona_envolvente(extensions.geometry) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zona_invasiones_nuevas(bigint, extensions.geometry, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_evaluar(text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_guardar(bigint, text, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zonas_contorno(bigint[], double precision) FROM PUBLIC, anon, authenticated;
