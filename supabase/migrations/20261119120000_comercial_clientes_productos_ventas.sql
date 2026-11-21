-- ==============================================================================
-- Migración: Comercial — clientes, productos y ventas (CU-12, CU-13)
-- Decisiones: ADR-005
--   · Las tres tablas siguen el Módulo 3 del modelo (watts_modulo3_comercial_ventas.dbml).
--   · La clasificación ABC y la inactividad se derivan de las ventas (vista clientes_abc): no se guardan.
--   · La cobertura por ruta es una vista materializada (cobertura_rutas) que se recalcula una vez por día
--     en horario nocturno (RN-08).
--   · Sin enums de dominio: los valores acotados son text con CHECK. Claves bigint GENERATED ALWAYS AS IDENTITY.
--   · Los datos de prueba están en supabase/seed_comercial.sql: sintéticos. La carga real desde los sistemas
--     actuales de la empresa es una capa de integración posterior.
-- ==============================================================================

-- 1. CLIENTES: puntos de venta geolocalizados, cada uno en una ruta
CREATE TABLE IF NOT EXISTS public.clientes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_cliente text NOT NULL,
    nombre_completo text NOT NULL,
    razon_social text,
    direccion text NOT NULL,
    referencia text,
    rubro text NOT NULL,
    nombre_comercial text,
    nit text,
    telefono text,
    latitud numeric(10, 8),
    longitud numeric(11, 8),
    habilitado text NOT NULL,
    id_ruta bigint NOT NULL REFERENCES public.rutas(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT clientes_habilitado_check CHECK (habilitado IN ('HABILITADO', 'NO HABILITADO')),
    CONSTRAINT clientes_latitud_check CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
    CONSTRAINT clientes_longitud_check CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
    CONSTRAINT clientes_ubicacion_completa_check CHECK ((latitud IS NULL) = (longitud IS NULL)),
    CONSTRAINT unique_cliente_codigo_ruta UNIQUE (codigo_cliente, id_ruta)
);

COMMENT ON TABLE public.clientes IS 'Puntos de venta geolocalizados. La clasificación ABC y la inactividad se derivan de ventas (vista clientes_abc), no se almacenan aquí.';

CREATE INDEX IF NOT EXISTS clientes_id_ruta_idx ON public.clientes (id_ruta);
-- Consultas espaciales («clientes dentro de esta ruta») sin guardar una segunda columna de geometría.
-- PostGIS vive en el esquema `extensions`: en la base alojada el search_path de la migración es solo `public`,
-- así que las funciones van calificadas (en la base local `extensions` sí está en el search_path).
CREATE INDEX IF NOT EXISTS clientes_punto_gist_idx ON public.clientes
    USING gist (extensions.ST_SetSRID(extensions.ST_MakePoint(longitud::float8, latitud::float8), 4326));

CREATE TRIGGER trg_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PRODUCTOS: catálogo por sucursal
CREATE TABLE IF NOT EXISTS public.productos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_interno text NOT NULL,
    nombre text NOT NULL,
    um text NOT NULL,
    grupo text NOT NULL,
    subgrupo text NOT NULL,
    estado_producto text NOT NULL,
    factor_conversion numeric(12, 4) NOT NULL,
    id_sucursal bigint NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT productos_estado_check CHECK (estado_producto IN ('Habilitado', 'No Habilitado')),
    CONSTRAINT productos_factor_check CHECK (factor_conversion > 0),
    CONSTRAINT unique_producto_codigo_sucursal UNIQUE (codigo_interno, id_sucursal)
);

COMMENT ON TABLE public.productos IS 'Catálogo de productos por sucursal.';

CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. VENTAS: detalle de venta, una fila por producto dentro de una venta (ntr_venta)
CREATE TABLE IF NOT EXISTS public.ventas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ntr_pedido bigint NOT NULL,
    ntr_venta bigint NOT NULL,
    fecha_pedido date NOT NULL,
    fecha_venta date NOT NULL,
    id_sucursal bigint NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    id_preventista bigint NOT NULL REFERENCES public.personas(id) ON DELETE RESTRICT,
    id_distribuidor bigint NOT NULL REFERENCES public.personas(id) ON DELETE RESTRICT,
    id_cliente bigint NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    id_producto bigint NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cant_producto numeric(15, 4) NOT NULL,
    precio_u numeric(12, 2) NOT NULL,
    importe_bruto numeric(12, 2),
    descuento numeric(12, 2),
    importe_total_producto numeric(12, 2),
    estado text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ventas_estado_check CHECK (estado IN ('Vigente', 'Anulado')),
    CONSTRAINT ventas_cantidad_check CHECK (cant_producto > 0),
    CONSTRAINT ventas_fechas_check CHECK (fecha_venta >= fecha_pedido),
    CONSTRAINT unique_venta_producto_sucursal UNIQUE (ntr_venta, id_producto, id_sucursal)
);

COMMENT ON TABLE public.ventas IS 'Detalle de venta por producto: una fila por producto dentro de una venta (ntr_venta). id_preventista e id_distribuidor referencian a personas.';

CREATE INDEX IF NOT EXISTS ventas_cliente_fecha_idx ON public.ventas (id_cliente, fecha_venta);
CREATE INDEX IF NOT EXISTS ventas_fecha_idx ON public.ventas (fecha_venta);

CREATE TRIGGER trg_ventas_updated_at
    BEFORE UPDATE ON public.ventas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. CLIENTES_ABC: clasificación por frecuencia de compra de los últimos 6 meses (CU-12)
--    Frecuencia = días distintos con una compra vigente. A: 18 o más (≈ 3 al mes), B: de 6 a 17,
--    C: de 1 a 5, I (inactivo): ninguna compra vigente en los últimos 6 meses (o nunca compró).
CREATE OR REPLACE VIEW public.clientes_abc AS
SELECT
    c.id AS id_cliente,
    COALESCE(v.frecuencia_6m, 0) AS frecuencia_6m,
    v.ultima_compra,
    CASE
        WHEN COALESCE(v.frecuencia_6m, 0) = 0 THEN 'I'
        WHEN v.frecuencia_6m >= 18 THEN 'A'
        WHEN v.frecuencia_6m >= 6 THEN 'B'
        ELSE 'C'
    END AS clasificacion
FROM public.clientes c
LEFT JOIN (
    SELECT
        id_cliente,
        count(DISTINCT fecha_venta) FILTER (WHERE fecha_venta >= (current_date - interval '6 months')::date) AS frecuencia_6m,
        max(fecha_venta) AS ultima_compra
    FROM public.ventas
    WHERE estado = 'Vigente'
    GROUP BY id_cliente
) v ON v.id_cliente = c.id;

COMMENT ON VIEW public.clientes_abc IS 'Clasificación ABC e inactividad de cada cliente, derivadas de ventas vigentes (ADR-005).';

-- 5. COBERTURA_RUTAS: porcentaje de clientes habilitados atendidos (con al menos una venta vigente) en el
--    mes en curso, por ruta (CU-13, RN-08). Vista materializada: se recalcula una vez por día.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.cobertura_rutas AS
WITH atendidos AS (
    SELECT DISTINCT id_cliente
    FROM public.ventas
    WHERE estado = 'Vigente'
      AND fecha_venta >= date_trunc('month', current_date)::date
      AND fecha_venta <= current_date
)
SELECT
    r.id AS id_ruta,
    count(c.id)::integer AS clientes_habilitados,
    count(a.id_cliente)::integer AS clientes_atendidos,
    COALESCE(round(100.0 * count(a.id_cliente) / NULLIF(count(c.id), 0), 1), 0) AS porcentaje,
    date_trunc('month', current_date)::date AS mes,
    now() AS calculado_en
FROM public.rutas r
LEFT JOIN public.clientes c ON c.id_ruta = r.id AND c.habilitado = 'HABILITADO'
LEFT JOIN atendidos a ON a.id_cliente = c.id
GROUP BY r.id;

-- Necesario para recalcular sin bloquear las consultas (REFRESH ... CONCURRENTLY)
CREATE UNIQUE INDEX IF NOT EXISTS cobertura_rutas_id_ruta_idx ON public.cobertura_rutas (id_ruta);

COMMENT ON MATERIALIZED VIEW public.cobertura_rutas IS 'Cobertura de clientes por ruta en el mes en curso. Se recalcula cada noche (RN-08): las ventas del día se incorporan en el siguiente recálculo.';

CREATE OR REPLACE FUNCTION public.cobertura_rutas_recalcular()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.cobertura_rutas;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cobertura_rutas_recalcular() FROM PUBLIC, anon, authenticated;

-- 6. Recálculo nocturno: 03:00 hora de Bolivia (UTC-4) = 07:00 UTC. Usa pg_cron cuando la extensión está
--    disponible (Supabase en la nube); si no, la vista se recalcula con SELECT cobertura_rutas_recalcular().
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.schedule('cobertura_rutas_recalcular', '0 7 * * *', 'SELECT public.cobertura_rutas_recalcular()');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron no disponible (%): el recálculo de cobertura_rutas queda manual', SQLERRM;
END;
$$;
