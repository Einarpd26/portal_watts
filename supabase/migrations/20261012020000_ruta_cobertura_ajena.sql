-- ==============================================================================
-- Migración: Territorio — una zona no debe cubrir nunca rutas de otras zonas (CU-05 y CU-06)
-- Decisiones: ADR-002 D7, ampliada el 12 de octubre de 2026.
-- D7 solo revisaba la envolvente de la zona que crece, así que una ruta nueva (o trasladada)
-- que caía dentro de la envolvente ya existente de otra zona se aceptaba y esa zona pasaba a
-- cubrirla. Ahora la ruta también se rechaza si su polígono quedaría dentro de la envolvente de
-- otra zona, salvo que ya lo estuviera (heredado, como en D7 punto 1). En un traslado la zona
-- de origen no tiene esa salvedad: su envolvente, sin la ruta, no puede quedar cubriéndola.
-- ==============================================================================

-- 1. COBERTURAS AJENAS: zonas, distintas de `p_id_zona`, cuya envolvente cubriría `p_geom`.
-- La envolvente de cada zona se calcula sin la ruta `p_excluir_id` (la que se reemplaza o traslada).
CREATE OR REPLACE FUNCTION public.zona_coberturas_ajenas(p_id_zona bigint, p_geom extensions.geometry, p_excluir_id bigint DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
    v_sucursal bigint;
    v_zona_actual bigint;
    v_antes geometry;
BEGIN
    SELECT z.id_sucursal INTO v_sucursal FROM public.zonas z WHERE z.id = p_id_zona;
    IF NOT FOUND OR p_geom IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Posición y zona actuales de la ruta que se reemplaza o traslada, para no bloquear lo heredado
    IF p_excluir_id IS NOT NULL THEN
        SELECT r.id_zona, r.localizacion INTO v_zona_actual, v_antes
          FROM public.rutas r WHERE r.id = p_excluir_id;
    END IF;

    RETURN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                   'id_zona', e.id_zona,
                   'codigo_zona', e.codigo_zona,
                   'misma_sucursal', e.id_sucursal = v_sucursal,
                   'area_m2', round(ST_Area(ST_Intersection(e.env, p_geom)::geography)::numeric, 2),
                   'geojson', ST_AsGeoJSON(ST_SimplifyPreserveTopology(e.env, 0.00001))::jsonb
               ) ORDER BY e.codigo_zona)
          FROM (
                SELECT z.id AS id_zona, z.codigo_zona, z.id_sucursal,
                       public.zona_envolvente(ST_UnaryUnion(ST_Collect(r.localizacion))) AS env
                  FROM public.rutas r
                  JOIN public.zonas z ON z.id = r.id_zona
                 WHERE r.id_zona <> p_id_zona
                   AND (p_excluir_id IS NULL OR r.id <> p_excluir_id)
                 GROUP BY z.id, z.codigo_zona, z.id_sucursal
                HAVING ST_Extent(r.localizacion)::geometry && p_geom
               ) e
         WHERE ST_Relate(e.env, p_geom, 'T********')
           AND NOT (v_antes IS NOT NULL
                    AND e.id_zona IS DISTINCT FROM v_zona_actual
                    AND ST_Relate(e.env, v_antes, 'T********'))
    ), '[]'::jsonb);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.zona_coberturas_ajenas(bigint, extensions.geometry, bigint) FROM PUBLIC, anon, authenticated;

-- 2. EVALUAR: además de las invasiones, informa las coberturas ajenas
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

-- 3. GUARDAR: rechaza también la cobertura ajena, dentro del mismo bloqueo consultivo
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
        IF jsonb_array_length(v_eval->'coberturas') > 0 THEN
            RETURN jsonb_build_object('ok', false, 'error', 'cobertura', 'coberturas', v_eval->'coberturas');
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

-- 4. TRASLADAR: además de la invasión de la zona destino, la zona de origen (sin la ruta) y las
-- demás envolventes no pueden quedar cubriendo la ruta que se mueve
CREATE OR REPLACE FUNCTION public.ruta_trasladar(p_id bigint, p_id_zona_destino bigint)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_invasiones jsonb;
    v_coberturas jsonb;
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

    -- La zona de origen, sin esta ruta, no puede quedar cubriéndola; las demás, solo si no la cubrían ya
    v_coberturas := public.zona_coberturas_ajenas(p_id_zona_destino, v_geom, p_id);
    IF jsonb_array_length(v_coberturas) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'cobertura', 'coberturas', v_coberturas);
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
