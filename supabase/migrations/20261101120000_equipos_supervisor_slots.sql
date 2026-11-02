-- ==============================================================================
-- Migración: Planificación — equipos de supervisor y slots de vendedores (CU-08)
-- Decisiones: ADR-003 (D1 a D6)
--   · El equipo (supervisor-vendedor) lo administran el Fiscalizador (su sucursal) y Gerencia
--     Comercial (global) con personal:gestionar; el alcance lo valida la API y, además, estas
--     funciones lo reciben como parámetro para que la comprobación sea atómica.
--   · Un vendedor pertenece a un solo equipo (UNIQUE(id_vendedor)) y a un solo slot.
--   · Reasignar o quitar al vendedor deja su slot vacío (id_vendedor = NULL) y conserva el slot;
--     nunca se borra el slot ni su planificación.
--   · Al retirarse un supervisor no se toca nada: «Reemplazar supervisor» traspasa equipo y slots.
-- La tabla planificacion_rutas (CU-09) y la regla RN-05 de ruta_trasladar van en otra migración.
-- ==============================================================================

-- 1. SUPERVISOR_VENDEDORES: equipo del supervisor. Un vendedor tiene un solo supervisor (ADR-003 D3)
CREATE TABLE IF NOT EXISTS public.supervisor_vendedores (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_supervisor bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    id_vendedor bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_vendedor_equipo UNIQUE (id_vendedor),
    CONSTRAINT chk_supervisor_vendedores_distintos CHECK (id_supervisor <> id_vendedor)
);

COMMENT ON TABLE public.supervisor_vendedores IS 'Equipo del supervisor: vendedores a su cargo. Un vendedor pertenece a un solo equipo (ADR-003 D3).';

CREATE INDEX IF NOT EXISTS supervisor_vendedores_id_supervisor_idx ON public.supervisor_vendedores (id_supervisor);

-- 2. VENDEDOR_SLOTS: posiciones de planificación del equipo (CU-08)
CREATE TABLE IF NOT EXISTS public.vendedor_slots (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre text,
    orden integer NOT NULL,
    id_supervisor bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    -- SET NULL: borrar a la persona no destruye el slot ni su planificación (ADR-003 D4)
    id_vendedor bigint REFERENCES public.personas(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_vendedor_slots_orden CHECK (orden >= 0)
);

COMMENT ON TABLE public.vendedor_slots IS 'Cupo de planificación de un supervisor. id_vendedor es nulo si el cupo está vacío; el slot y sus rutas sobreviven a la salida del vendedor y al retiro del supervisor (ADR-003 D4 y D6).';

-- Un vendedor ocupa como máximo un slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendedor_slots_vendedor
    ON public.vendedor_slots (id_vendedor)
    WHERE id_vendedor IS NOT NULL;

CREATE INDEX IF NOT EXISTS vendedor_slots_id_supervisor_idx ON public.vendedor_slots (id_supervisor);

CREATE TRIGGER trg_vendedor_slots_updated_at
    BEFORE UPDATE ON public.vendedor_slots
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Ayudantes de validación (solo los usan las funciones de abajo)

-- Sucursal en la que la persona es supervisor activo (rol de acceso SUPERVISOR y sin baja), o NULL.
-- El permiso nunca se deriva del cargo (ADR-001).
CREATE OR REPLACE FUNCTION public.supervisor_sucursal_activa(p_id_persona bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT ur.id_sucursal
      FROM public.usuario_roles ur
      JOIN public.roles r ON r.id = ur.id_rol
      JOIN public.personas p ON p.id = ur.id_persona
     WHERE ur.id_persona = p_id_persona
       AND r.codigo = 'SUPERVISOR'
       AND ur.id_sucursal IS NOT NULL
       AND p.fecha_baja IS NULL
     LIMIT 1;
$$;

-- Sucursal en la que la persona es vendedora vigente (asignación laboral activa con cargo Vendedor y
-- sin baja), o NULL. La pertenencia a un equipo es una relación laboral, no un permiso: el vendedor
-- puede no tener todavía acceso digital.
CREATE OR REPLACE FUNCTION public.vendedor_sucursal_activa(p_id_persona bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT al.id_sucursal
      FROM public.asignaciones_laborales al
      JOIN public.cargos c ON c.id = al.id_cargo
      JOIN public.personas p ON p.id = al.id_persona
     WHERE al.id_persona = p_id_persona
       AND al.estado = 'activo'
       AND c.nombre_cargo = 'Vendedor'
       AND p.fecha_baja IS NULL
     LIMIT 1;
$$;

-- 4. EQUIPO_ASIGNAR_VENDEDOR: asigna, cambia o quita (p_id_supervisor NULL) el supervisor de un vendedor.
-- p_id_sucursal_alcance: sucursal del Fiscalizador que opera; NULL para Gerencia Comercial (global).
CREATE OR REPLACE FUNCTION public.equipo_asignar_vendedor(
    p_id_vendedor bigint,
    p_id_supervisor bigint,
    p_id_sucursal_alcance bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_suc_vendedor bigint;
    v_suc_supervisor bigint;
    v_anterior bigint;
    v_slots_liberados integer := 0;
BEGIN
    -- Bloquea al vendedor: dos cambios simultáneos sobre el mismo vendedor se serializan
    PERFORM 1 FROM public.personas WHERE id = p_id_vendedor FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'vendedor_invalido');
    END IF;

    SELECT sv.id_supervisor INTO v_anterior
      FROM public.supervisor_vendedores sv
     WHERE sv.id_vendedor = p_id_vendedor;

    -- Quitar al vendedor del equipo no exige que siga vigente: se necesita poder limpiar una baja.
    -- El alcance se comprueba con la sucursal del supervisor anterior o, si no tiene, la del vendedor.
    IF p_id_supervisor IS NULL THEN
        IF v_anterior IS NULL THEN
            RETURN jsonb_build_object('ok', true, 'anterior', NULL, 'slots_liberados', 0);
        END IF;
        v_suc_supervisor := public.supervisor_sucursal_activa(v_anterior);
        IF p_id_sucursal_alcance IS NOT NULL
           AND (v_suc_supervisor IS NULL OR v_suc_supervisor <> p_id_sucursal_alcance)
           AND COALESCE(public.vendedor_sucursal_activa(p_id_vendedor), -1) <> p_id_sucursal_alcance THEN
            RETURN jsonb_build_object('ok', false, 'error', 'fuera_de_alcance');
        END IF;

        DELETE FROM public.supervisor_vendedores WHERE id_vendedor = p_id_vendedor;
        UPDATE public.vendedor_slots SET id_vendedor = NULL WHERE id_vendedor = p_id_vendedor;
        GET DIAGNOSTICS v_slots_liberados = ROW_COUNT;
        RETURN jsonb_build_object('ok', true, 'anterior', v_anterior, 'slots_liberados', v_slots_liberados);
    END IF;

    v_suc_vendedor := public.vendedor_sucursal_activa(p_id_vendedor);
    IF v_suc_vendedor IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'vendedor_invalido');
    END IF;

    v_suc_supervisor := public.supervisor_sucursal_activa(p_id_supervisor);
    IF v_suc_supervisor IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    IF v_suc_vendedor <> v_suc_supervisor THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sucursal_distinta');
    END IF;

    IF p_id_sucursal_alcance IS NOT NULL AND v_suc_supervisor <> p_id_sucursal_alcance THEN
        RETURN jsonb_build_object('ok', false, 'error', 'fuera_de_alcance');
    END IF;

    -- Reasignar al mismo supervisor no cambia nada
    IF v_anterior IS NOT DISTINCT FROM p_id_supervisor THEN
        RETURN jsonb_build_object('ok', true, 'anterior', v_anterior, 'slots_liberados', 0);
    END IF;

    INSERT INTO public.supervisor_vendedores (id_supervisor, id_vendedor)
    VALUES (p_id_supervisor, p_id_vendedor)
    ON CONFLICT (id_vendedor) DO UPDATE SET id_supervisor = EXCLUDED.id_supervisor;

    -- El slot del vendedor en el supervisor anterior queda vacío y conserva sus rutas (ADR-003 D4)
    UPDATE public.vendedor_slots
       SET id_vendedor = NULL
     WHERE id_vendedor = p_id_vendedor
       AND id_supervisor <> p_id_supervisor;
    GET DIAGNOSTICS v_slots_liberados = ROW_COUNT;

    RETURN jsonb_build_object('ok', true, 'anterior', v_anterior, 'slots_liberados', v_slots_liberados);
END;
$$;

-- 5. SUPERVISOR_REEMPLAZAR: traspasa equipo y slots (con su planificación) de un supervisor inactivo
-- a uno nuevo, en una sola transacción (ADR-003 D6). Las zonas no se traspasan: se asignan con CU-07.
CREATE OR REPLACE FUNCTION public.supervisor_reemplazar(
    p_id_inactivo bigint,
    p_id_nuevo bigint,
    p_id_sucursal_alcance bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_suc_nuevo bigint;
    v_vendedores integer;
    v_slots integer;
    v_desplazamiento integer;
BEGIN
    IF p_id_inactivo = p_id_nuevo THEN
        RETURN jsonb_build_object('ok', false, 'error', 'mismo_supervisor');
    END IF;

    -- Bloqueo en orden de id: dos reemplazos cruzados no se interbloquean
    PERFORM 1 FROM public.personas WHERE id IN (p_id_inactivo, p_id_nuevo) ORDER BY id FOR UPDATE;

    -- Solo se reemplaza a un supervisor que ya no es activo: nunca se le quita el equipo a uno vigente
    IF public.supervisor_sucursal_activa(p_id_inactivo) IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_activo');
    END IF;

    v_suc_nuevo := public.supervisor_sucursal_activa(p_id_nuevo);
    IF v_suc_nuevo IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'supervisor_invalido');
    END IF;

    IF p_id_sucursal_alcance IS NOT NULL AND v_suc_nuevo <> p_id_sucursal_alcance THEN
        RETURN jsonb_build_object('ok', false, 'error', 'fuera_de_alcance');
    END IF;

    SELECT count(*) INTO v_vendedores FROM public.supervisor_vendedores WHERE id_supervisor = p_id_inactivo;
    SELECT count(*) INTO v_slots FROM public.vendedor_slots WHERE id_supervisor = p_id_inactivo;
    IF v_vendedores = 0 AND v_slots = 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sin_equipo');
    END IF;

    -- Los vendedores del equipo deben ser de la sucursal del nuevo supervisor
    IF EXISTS (
        SELECT 1
          FROM public.supervisor_vendedores sv
         WHERE sv.id_supervisor = p_id_inactivo
           AND COALESCE(public.vendedor_sucursal_activa(sv.id_vendedor), v_suc_nuevo) <> v_suc_nuevo
    ) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sucursal_distinta');
    END IF;

    UPDATE public.supervisor_vendedores SET id_supervisor = p_id_nuevo WHERE id_supervisor = p_id_inactivo;

    -- Los slots traspasados van después de los que el nuevo supervisor ya tuviera, sin repetir orden
    SELECT COALESCE(max(orden) + 1, 0) INTO v_desplazamiento FROM public.vendedor_slots WHERE id_supervisor = p_id_nuevo;
    UPDATE public.vendedor_slots
       SET id_supervisor = p_id_nuevo,
           orden = orden + v_desplazamiento
     WHERE id_supervisor = p_id_inactivo;

    RETURN jsonb_build_object('ok', true, 'vendedores', v_vendedores, 'slots', v_slots);
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.supervisor_sucursal_activa(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vendedor_sucursal_activa(bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.equipo_asignar_vendedor(bigint, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.supervisor_reemplazar(bigint, bigint, bigint) FROM PUBLIC, anon, authenticated;
