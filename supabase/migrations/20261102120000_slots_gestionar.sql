-- ==============================================================================
-- Migración: Planificación — gestión de slots por el Supervisor (CU-08)
-- Decisiones: ADR-003 (D4 y D5)
--   · El Supervisor crea, ordena y asigna vendedores de SU equipo a SUS slots.
--   · Las tres funciones reciben el supervisor que opera y validan la pertenencia en la misma
--     transacción; el bloqueo de la fila del supervisor serializa sus cambios simultáneos.
--   · Un vendedor ocupa como máximo un slot (índice único parcial de la migración anterior).
-- ==============================================================================

-- SLOT_CREAR: agrega un slot vacío al final del orden del supervisor
CREATE OR REPLACE FUNCTION public.slot_crear(p_id_supervisor bigint, p_nombre text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_orden integer;
    v_id bigint;
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    PERFORM 1 FROM public.personas WHERE id = p_id_supervisor FOR UPDATE;

    SELECT COALESCE(max(orden) + 1, 0) INTO v_orden FROM public.vendedor_slots WHERE id_supervisor = p_id_supervisor;

    INSERT INTO public.vendedor_slots (nombre, orden, id_supervisor)
    VALUES (COALESCE(NULLIF(btrim(p_nombre), ''), 'Slot ' || (v_orden + 1)), v_orden, p_id_supervisor)
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- SLOT_ASIGNAR_VENDEDOR: asigna un vendedor del equipo al slot, o lo deja vacío (sin p_id_vendedor)
CREATE OR REPLACE FUNCTION public.slot_asignar_vendedor(
    p_id_slot bigint,
    p_id_supervisor bigint,
    p_id_vendedor bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    PERFORM 1 FROM public.personas WHERE id = p_id_supervisor FOR UPDATE;

    -- Solo se opera sobre slots propios
    IF NOT EXISTS (SELECT 1 FROM public.vendedor_slots WHERE id = p_id_slot AND id_supervisor = p_id_supervisor) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    IF p_id_vendedor IS NOT NULL THEN
        -- CU-08 A1: el vendedor debe ser del equipo del supervisor
        IF NOT EXISTS (
            SELECT 1 FROM public.supervisor_vendedores
             WHERE id_supervisor = p_id_supervisor AND id_vendedor = p_id_vendedor
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'vendedor_fuera_de_equipo');
        END IF;

        -- Ocupa otro slot: no se mueve en silencio, se pide liberarlo primero
        IF EXISTS (
            SELECT 1 FROM public.vendedor_slots WHERE id_vendedor = p_id_vendedor AND id <> p_id_slot
        ) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'vendedor_ocupado');
        END IF;
    END IF;

    UPDATE public.vendedor_slots SET id_vendedor = p_id_vendedor WHERE id = p_id_slot;
    RETURN jsonb_build_object('ok', true, 'id', p_id_slot);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'vendedor_ocupado');
END;
$$;

-- SLOT_MOVER: sube o baja un slot una posición (CU-08 A2)
CREATE OR REPLACE FUNCTION public.slot_mover(p_id_slot bigint, p_id_supervisor bigint, p_direccion text)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_orden integer;
    v_vecino bigint;
BEGIN
    IF p_direccion NOT IN ('arriba', 'abajo') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'direccion_invalida');
    END IF;
    IF public.supervisor_sucursal_activa(p_id_supervisor) IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    PERFORM 1 FROM public.personas WHERE id = p_id_supervisor FOR UPDATE;

    IF NOT EXISTS (SELECT 1 FROM public.vendedor_slots WHERE id = p_id_slot AND id_supervisor = p_id_supervisor) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    -- Renumera 0..n-1 sin huecos ni empates (los slots traspasados por un reemplazo pueden tenerlos)
    UPDATE public.vendedor_slots s
       SET orden = r.n
      FROM (
          SELECT id, (row_number() OVER (ORDER BY orden, id) - 1)::integer AS n
            FROM public.vendedor_slots
           WHERE id_supervisor = p_id_supervisor
      ) r
     WHERE s.id = r.id AND s.orden <> r.n;

    SELECT orden INTO v_orden FROM public.vendedor_slots WHERE id = p_id_slot;

    SELECT id INTO v_vecino
      FROM public.vendedor_slots
     WHERE id_supervisor = p_id_supervisor
       AND orden = CASE WHEN p_direccion = 'arriba' THEN v_orden - 1 ELSE v_orden + 1 END;

    -- Ya está en el extremo: no hay nada que mover
    IF v_vecino IS NULL THEN
        RETURN jsonb_build_object('ok', true, 'id', p_id_slot, 'movido', false);
    END IF;

    UPDATE public.vendedor_slots
       SET orden = CASE WHEN id = p_id_slot THEN orden + (CASE WHEN p_direccion = 'arriba' THEN -1 ELSE 1 END)
                        ELSE v_orden END
     WHERE id IN (p_id_slot, v_vecino);

    RETURN jsonb_build_object('ok', true, 'id', p_id_slot, 'movido', true);
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.slot_crear(bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_asignar_vendedor(bigint, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.slot_mover(bigint, bigint, text) FROM PUBLIC, anon, authenticated;
