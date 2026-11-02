-- ==============================================================================
-- Migración: Planificación — rutas por día en los slots del supervisor (CU-09)
-- Decisiones: ADR-003 y RN-04/RN-05
--   · Una ruta puede planificarse varios días de la semana y en varios slots: el sistema lo permite
--     y la interfaz la marca como «Duplicada» (RN-04); no se bloquea en la base de datos.
--   · RN-05: el supervisor solo planifica rutas de las zonas que supervisa.
--   · RF-09: al trasladar una ruta a otra zona se elimina su planificación vigente.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.planificacion_rutas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_vendedor_slot bigint NOT NULL REFERENCES public.vendedor_slots(id) ON DELETE CASCADE,
    id_ruta bigint NOT NULL REFERENCES public.rutas(id) ON DELETE CASCADE,
    dia_semana char(2) NOT NULL CHECK (dia_semana IN ('LU', 'MA', 'MI', 'JU', 'VI', 'SA')),
    frecuencia text NOT NULL DEFAULT 'semanal' CHECK (frecuencia IN ('semanal', 'impar', 'par', 'eventual')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    -- Solo impide la fila idéntica; las visitas repetidas de una ruta se permiten y se marcan (RN-04)
    CONSTRAINT unique_planificacion_ruta UNIQUE (id_vendedor_slot, id_ruta, dia_semana, frecuencia)
);

COMMENT ON TABLE public.planificacion_rutas IS 'Ruta planificada en un slot, un día de la semana y con una frecuencia. Modelo transaccional: sin historial (ADR-003).';

CREATE INDEX IF NOT EXISTS planificacion_rutas_id_ruta_idx ON public.planificacion_rutas (id_ruta);

CREATE TRIGGER trg_planificacion_rutas_updated_at
    BEFORE UPDATE ON public.planificacion_rutas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PLANIFICACION_AGREGAR: planifica una ruta de las zonas del supervisor en uno de sus slots
CREATE OR REPLACE FUNCTION public.planificacion_agregar(
    p_id_slot bigint,
    p_id_supervisor bigint,
    p_id_ruta bigint,
    p_dia text,
    p_frecuencia text DEFAULT 'semanal'
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id bigint;
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;
    IF p_dia IS NULL OR p_dia NOT IN ('LU', 'MA', 'MI', 'JU', 'VI', 'SA') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'dia_invalido');
    END IF;
    IF p_frecuencia IS NULL OR p_frecuencia NOT IN ('semanal', 'impar', 'par', 'eventual') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'frecuencia_invalida');
    END IF;

    -- Solo se planifica sobre slots propios
    IF NOT EXISTS (SELECT 1 FROM public.vendedor_slots WHERE id = p_id_slot AND id_supervisor = p_id_supervisor) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.rutas WHERE id = p_id_ruta) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ruta_invalida');
    END IF;

    -- RN-05: la ruta debe pertenecer a una zona que el supervisor supervisa
    IF NOT EXISTS (
        SELECT 1
          FROM public.rutas r
          JOIN public.supervisor_zonas sz ON sz.id_zona = r.id_zona
         WHERE r.id = p_id_ruta AND sz.id_supervisor = p_id_supervisor
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ruta_fuera_de_zona');
    END IF;

    INSERT INTO public.planificacion_rutas (id_vendedor_slot, id_ruta, dia_semana, frecuencia)
    VALUES (p_id_slot, p_id_ruta, p_dia, p_frecuencia)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('ok', true, 'id', v_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ya_planificada');
END;
$$;

-- PLANIFICACION_CAMBIAR_FRECUENCIA: cambia la frecuencia de una visita propia
CREATE OR REPLACE FUNCTION public.planificacion_cambiar_frecuencia(
    p_id bigint,
    p_id_supervisor bigint,
    p_frecuencia text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;
    IF p_frecuencia IS NULL OR p_frecuencia NOT IN ('semanal', 'impar', 'par', 'eventual') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'frecuencia_invalida');
    END IF;

    UPDATE public.planificacion_rutas pr
       SET frecuencia = p_frecuencia
      FROM public.vendedor_slots vs
     WHERE pr.id = p_id AND vs.id = pr.id_vendedor_slot AND vs.id_supervisor = p_id_supervisor;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', p_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ya_planificada');
END;
$$;

-- PLANIFICACION_QUITAR: elimina una visita propia
CREATE OR REPLACE FUNCTION public.planificacion_quitar(p_id bigint, p_id_supervisor bigint)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    DELETE FROM public.planificacion_rutas pr
     USING public.vendedor_slots vs
     WHERE pr.id = p_id AND vs.id = pr.id_vendedor_slot AND vs.id_supervisor = p_id_supervisor;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$;

-- RF-09 / RN-05: trasladar una ruta a otra zona elimina su planificación vigente. Misma función y
-- mismo bloqueo que ya validaban la invasión y la cobertura (ADR-002 D7): todo en una transacción.
CREATE OR REPLACE FUNCTION public.ruta_trasladar(p_id bigint, p_id_zona_destino bigint)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_geom geometry;
    v_zona_actual bigint;
    v_invasiones jsonb;
    v_coberturas jsonb;
    v_eliminadas integer := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

    SELECT r.localizacion, r.id_zona INTO v_geom, v_zona_actual FROM public.rutas r WHERE r.id = p_id;
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

    IF v_zona_actual <> p_id_zona_destino THEN
        DELETE FROM public.planificacion_rutas WHERE id_ruta = p_id;
        GET DIAGNOSTICS v_eliminadas = ROW_COUNT;
    END IF;

    UPDATE public.rutas SET id_zona = p_id_zona_destino WHERE id = p_id;

    RETURN jsonb_build_object('ok', true, 'id', p_id, 'planificaciones_eliminadas', v_eliminadas);
EXCEPTION
    WHEN foreign_key_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'zona_invalida');
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.planificacion_agregar(bigint, bigint, bigint, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.planificacion_cambiar_frecuencia(bigint, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.planificacion_quitar(bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ruta_trasladar(bigint, bigint) FROM PUBLIC, anon, authenticated;
