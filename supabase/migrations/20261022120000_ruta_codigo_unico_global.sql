-- ==============================================================================
-- Migración: Territorio — el código de ruta es único en todo el sistema (CU-05, CU-06, CU-16)
-- Decisiones: ADR-002 D8
-- El ERP identifica a cada ruta por su código y no conoce el identificador interno de zona del
-- portal; con unicidad por zona, una ruta cuya zona cambia en el origen parecía otra ruta. El
-- código pasa a ser único en todo el sistema. Si ya hubiera códigos repetidos, la migración se
-- detiene y los lista: no borra ni renombra nada.
-- ==============================================================================

DO $$
DECLARE
    v_repetidos text;
BEGIN
    SELECT string_agg(codigo_ruta || ' (' || n || ' rutas)', ', ' ORDER BY codigo_ruta)
      INTO v_repetidos
      FROM (SELECT codigo_ruta, count(*) AS n FROM public.rutas GROUP BY codigo_ruta HAVING count(*) > 1) d;

    IF v_repetidos IS NOT NULL THEN
        RAISE EXCEPTION 'No se puede volver único el código de ruta: hay códigos repetidos entre zonas: %', v_repetidos
            USING HINT = 'Renombra las rutas repetidas y vuelve a aplicar la migración.';
    END IF;
END;
$$;

ALTER TABLE public.rutas DROP CONSTRAINT unique_ruta_zona;
ALTER TABLE public.rutas ADD CONSTRAINT unique_ruta_codigo UNIQUE (codigo_ruta);

-- GUARDAR: el control del código va antes de evaluar el polígono, para que un polígono que además
-- invade o se superpone no enmascare el verdadero motivo. Informa la zona de la ruta que ya usa el
-- código. La restricción única sigue como último resguardo ante dos altas simultáneas.
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

-- TRASLADAR: el código es único global, así que el traslado nunca produce un código repetido en la
-- zona destino y deja de necesitar el control de 'duplicado'
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
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'zona_invalida');
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.ruta_guardar(bigint, text, text, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_trasladar(bigint, bigint) FROM PUBLIC, anon, authenticated;
