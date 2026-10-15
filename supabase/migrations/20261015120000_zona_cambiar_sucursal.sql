-- ==============================================================================
-- Migración: Territorio — corrección de la sucursal de una zona vacía (CU-04 A4)
-- Decisiones: ADR-002 D4 (las rutas no cambian de sucursal)
-- La sucursal de una zona no se edita como un dato más: solo se corrige un error de registro y
-- únicamente si la zona no tiene rutas ni supervisor. La verificación y el cambio ocurren en una
-- sola función, con la fila de la zona bloqueada: una ruta o un supervisor que se agreguen a la
-- vez esperan la liberación del bloqueo (la clave foránea toma FOR KEY SHARE sobre la zona), así
-- que la comprobación no queda desfasada entre la API y la actualización.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.zona_cambiar_sucursal(
    p_id bigint,
    p_id_sucursal bigint,
    p_codigo_zona text,
    p_zona text,
    p_descripcion_zona text DEFAULT NULL,
    p_canal_venta text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
    v_id_sucursal_actual bigint;
BEGIN
    SELECT z.id_sucursal INTO v_id_sucursal_actual
      FROM public.zonas z
     WHERE z.id = p_id
       FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'no_encontrada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.sucursales s WHERE s.id = p_id_sucursal) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sucursal_invalida');
    END IF;

    IF v_id_sucursal_actual <> p_id_sucursal THEN
        IF EXISTS (SELECT 1 FROM public.rutas r WHERE r.id_zona = p_id) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'con_rutas');
        END IF;
        IF EXISTS (SELECT 1 FROM public.supervisor_zonas sz WHERE sz.id_zona = p_id) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'con_supervisor');
        END IF;
    END IF;

    UPDATE public.zonas
       SET codigo_zona = p_codigo_zona,
           zona = p_zona,
           descripcion_zona = p_descripcion_zona,
           canal_venta = p_canal_venta,
           id_sucursal = p_id_sucursal
     WHERE id = p_id;

    RETURN jsonb_build_object(
        'ok', true,
        'id', p_id,
        'id_sucursal_anterior', v_id_sucursal_actual,
        'id_sucursal', p_id_sucursal
    );
EXCEPTION
    -- El código de zona es único por sucursal: la sucursal destino ya puede tener uno igual
    WHEN unique_violation THEN
        RETURN jsonb_build_object('ok', false, 'error', 'duplicado');
END;
$$;

-- Convención del proyecto: revocar EXECUTE por función (solo el service role la invoca desde la API)
REVOKE EXECUTE ON FUNCTION public.zona_cambiar_sucursal(bigint, bigint, text, text, text, text)
    FROM PUBLIC, anon, authenticated;
