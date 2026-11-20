-- ==============================================================================
-- Migración: Comercial — la clasificación ABC pasa a ser un Pareto de clientes por ruta (CU-12, RN-07)
-- Decisiones: ADR-005 (D2)
--   · Reemplaza la vista clientes_abc de la migración anterior, que clasificaba por frecuencia de compra.
--   · Dentro de cada ruta, los clientes se ordenan por lo vendido en los últimos 6 meses (ventas vigentes)
--     y se acumula su porcentaje sobre el total de la ruta.
--     A: hasta el 80 % acumulado · B: hasta el 95 % · C: el resto.
--     I (inactivo): sin ventas vigentes en los últimos 6 meses (RN-07). Sin clasificar: cliente no habilitado.
--   · Es una vista común y no materializada: siempre refleja las ventas más recientes y, con cientos de
--     clientes por ruta, se calcula al instante.
-- ==============================================================================

DROP VIEW IF EXISTS public.clientes_abc;

CREATE VIEW public.clientes_abc AS
WITH ventas_cliente AS (
    SELECT
        id_cliente,
        sum(importe_total_producto) AS total_ventas,
        count(DISTINCT fecha_venta) AS dias_con_compra
    FROM public.ventas
    WHERE estado = 'Vigente'
      AND fecha_venta >= (current_date - interval '6 months')::date
    GROUP BY id_cliente
), ultima_compra AS (
    SELECT id_cliente, max(fecha_venta) AS ultima_compra
    FROM public.ventas
    WHERE estado = 'Vigente'
    GROUP BY id_cliente
), acumulado AS (
    SELECT
        c.id AS id_cliente,
        c.id_ruta,
        c.habilitado,
        COALESCE(v.total_ventas, 0) AS total_ventas,
        COALESCE(v.dias_con_compra, 0) AS dias_con_compra,
        u.ultima_compra,
        sum(COALESCE(v.total_ventas, 0)) OVER (
            PARTITION BY c.id_ruta
            ORDER BY COALESCE(v.total_ventas, 0) DESC, c.codigo_cliente
        ) AS ventas_acumuladas,
        sum(COALESCE(v.total_ventas, 0)) OVER (PARTITION BY c.id_ruta) AS total_ventas_ruta
    FROM public.clientes c
    LEFT JOIN ventas_cliente v ON v.id_cliente = c.id
    LEFT JOIN ultima_compra u ON u.id_cliente = c.id
)
SELECT
    id_cliente,
    id_ruta,
    total_ventas,
    dias_con_compra,
    ultima_compra,
    CASE WHEN total_ventas_ruta > 0 THEN round(ventas_acumuladas / total_ventas_ruta, 4) ELSE 1 END AS porcentaje_acumulado,
    CASE
        WHEN habilitado <> 'HABILITADO' THEN NULL
        WHEN total_ventas = 0 THEN 'I'
        WHEN ventas_acumuladas / total_ventas_ruta <= 0.80 THEN 'A'
        WHEN ventas_acumuladas / total_ventas_ruta <= 0.95 THEN 'B'
        ELSE 'C'
    END AS clasificacion
FROM acumulado;

COMMENT ON VIEW public.clientes_abc IS 'Clasificación ABC de cada cliente: Pareto por ruta sobre las ventas vigentes de los últimos 6 meses (A hasta 80 %, B hasta 95 %, C el resto); I si no compró en ese período; NULL si no está habilitado (ADR-005).';
