-- ==============================================================================
-- Datos Semilla Comerciales (SINTÉTICOS) para Desarrollo Local y Demostración
-- Proyecto: Portal Watts — Caramelos Watts S.R.L.
-- Módulo 3: clientes, productos y ventas (CU-12, CU-13). Decisiones: ADR-005
--
-- Todos los datos son inventados. La carga de los datos reales desde los sistemas actuales de la
-- empresa es una capa de integración posterior y no forma parte de este seed.
--
-- Reproducible: los puntos usan una semilla fija y el comportamiento de cada cliente depende de su
-- número, no del azar. Las fechas de venta son relativas a la fecha de carga, así que el mapa ABC y
-- la cobertura del mes siempre tienen datos recientes.
--
-- Perfil de cada cliente (según su número dentro de la ruta, de 0 a 39):
--   0-5   (15 %)  compra cada 4 días, cajas x6
--   6-17  (30 %)  compra cada 12 días, cajas x2
--   18-31 (35 %)  compra cada 40 días
--   32-39 (20 %)  inactivo: dejó de comprar hace más de 7 meses
-- La clase A/B/C la calcula la vista clientes_abc (Pareto por ruta), no este seed.
-- ==============================================================================

-- Idempotente: vuelve a generar todo el conjunto sintético
TRUNCATE public.ventas, public.productos, public.clientes RESTART IDENTITY CASCADE;

-- 1. PRODUCTOS: 12 golosinas por sucursal
INSERT INTO public.productos (codigo_interno, nombre, um, grupo, subgrupo, estado_producto, factor_conversion, id_sucursal)
SELECT
    format('P%s-%s', lpad(p.n::text, 3, '0'), s.id),
    p.nombre, 'CAJA', p.grupo, p.subgrupo,
    CASE WHEN p.n = 12 THEN 'No Habilitado' ELSE 'Habilitado' END,
    p.factor, s.id
FROM public.sucursales s
CROSS JOIN (VALUES
    (1,  'Caramelo duro frutal 100 u',     'Caramelos',  'Duros',      100.0),
    (2,  'Caramelo duro menta 100 u',      'Caramelos',  'Duros',      100.0),
    (3,  'Caramelo blando leche 80 u',     'Caramelos',  'Blandos',     80.0),
    (4,  'Caramelo blando café 80 u',      'Caramelos',  'Blandos',     80.0),
    (5,  'Chicle globo 60 u',              'Chicles',    'Globo',       60.0),
    (6,  'Chicle menta 60 u',              'Chicles',    'Menta',       60.0),
    (7,  'Chocolate barra 24 u',           'Chocolates', 'Barras',      24.0),
    (8,  'Chocolate relleno 36 u',         'Chocolates', 'Rellenos',    36.0),
    (9,  'Gomita ácida 50 u',              'Gomitas',    'Ácidas',      50.0),
    (10, 'Gomita frutal 50 u',             'Gomitas',    'Frutales',    50.0),
    (11, 'Paleta con chicle 48 u',         'Paletas',    'Con chicle',  48.0),
    (12, 'Caramelo navideño 100 u',        'Caramelos',  'Temporada',  100.0)
) AS p(n, nombre, grupo, subgrupo, factor)
ORDER BY s.id, p.n;

-- 2. CLIENTES: 40 por ruta, ubicados al azar dentro del polígono de su ruta (semilla fija)
WITH puntos AS (
    SELECT r.id AS id_ruta, r.codigo_ruta, z.id_sucursal,
           (st_dump(st_generatepoints(r.localizacion, 40, 20261119 + r.id::int))).geom AS punto
    FROM public.rutas r
    JOIN public.zonas z ON z.id = r.id_zona
), numerados AS (
    SELECT p.*, (row_number() OVER (PARTITION BY p.id_ruta ORDER BY st_x(p.punto), st_y(p.punto)) - 1)::int AS n
    FROM puntos p
)
INSERT INTO public.clientes
    (codigo_cliente, nombre_completo, razon_social, direccion, referencia, rubro, nombre_comercial, nit, telefono, latitud, longitud, habilitado, id_ruta)
SELECT
    format('C%s-%s', substr(n.codigo_ruta, 3), lpad((n.n + 1)::text, 3, '0')),
    (ARRAY['Tienda','Minimarket','Kiosco','Distribuidora','Abarrotes'])[1 + (n.n % 5)] || ' ' ||
        (ARRAY['Don Pepe','La Esquina','Santa Rita','El Sol','San Martín','Los Andes','La Paz','El Mirador'])[1 + ((n.n + n.id_ruta::int) % 8)],
    NULL,
    format('Calle %s #%s', 1 + (n.n * 7 + n.id_ruta::int) % 60, 100 + (n.n * 13) % 900),
    CASE WHEN n.n % 4 = 0 THEN 'Cerca de la plaza' END,
    (ARRAY['Tienda de barrio','Minimercado','Kiosco','Mayorista','Farmacia'])[1 + (n.n % 5)],
    NULL,
    (4000000 + n.id_ruta * 1000 + n.n)::text,
    (70000000 + n.id_ruta * 1000 + n.n)::text,
    round(st_y(n.punto)::numeric, 8),
    round(st_x(n.punto)::numeric, 8),
    -- Los dos últimos de cada ruta están dados de baja: no cuentan en la cobertura
    CASE WHEN n.n >= 38 THEN 'NO HABILITADO' ELSE 'HABILITADO' END,
    n.id_ruta
FROM numerados n
ORDER BY n.id_ruta, n.n;

-- 3. VENTAS: fechas de compra de cada cliente según su perfil, 1 a 3 productos por venta
--    Preventista: vendedor de la sucursal. Distribuidor: el de la sucursal (o un vendedor si no tiene).
WITH cli AS (
    SELECT c.id, c.id_ruta, z.id_sucursal,
           (row_number() OVER (PARTITION BY c.id_ruta ORDER BY c.id) - 1)::int AS n
    FROM public.clientes c
    JOIN public.rutas r ON r.id = c.id_ruta
    JOIN public.zonas z ON z.id = r.id_zona
), perfil AS (
    SELECT cli.*,
           CASE WHEN n <= 5 THEN 4 WHEN n <= 17 THEN 12 WHEN n <= 31 THEN 40 ELSE 14 END AS cada_dias,
           -- Hace cuántos días fue la compra más reciente (los inactivos: más de 7 meses)
           -- Los clientes B y C de cada ruta se atrasan una cantidad distinta de días: la cobertura del mes varía por ruta
           CASE WHEN n <= 5 THEN (n % 3)
                WHEN n <= 31 THEN (n % 3) + (id_ruta::int * 7) % 28
                ELSE 215 + (n % 20) END AS ultima_hace
    FROM cli
), fechas AS (
    -- Compras hacia atrás desde la última, hasta 8 meses (240 días) atrás; un pequeño desvío por cliente
    SELECT p.id AS id_cliente, p.id_sucursal, p.n,
           (current_date - (p.ultima_hace + k * p.cada_dias + ((p.n * 7 + k * 3) % 3)))::date AS fecha_venta,
           row_number() OVER () AS orden
    FROM perfil p
    CROSS JOIN LATERAL generate_series(0, 240 / p.cada_dias) AS k
    WHERE p.ultima_hace + k * p.cada_dias + ((p.n * 7 + k * 3) % 3) <= 240
), vendedores AS (
    SELECT ar.id_sucursal, array_agg(ar.id_persona ORDER BY ar.id_persona) AS ids
    FROM public.asignaciones_laborales ar
    JOIN public.cargos ca ON ca.id = ar.id_cargo AND ca.nombre_cargo = 'Vendedor'
    WHERE ar.estado = 'activo'
    GROUP BY ar.id_sucursal
), distribuidores AS (
    SELECT s.id AS id_sucursal,
           COALESCE(
               (SELECT ar.id_persona FROM public.asignaciones_laborales ar
                  JOIN public.cargos ca ON ca.id = ar.id_cargo AND ca.nombre_cargo = 'Distribuidor'
                 WHERE ar.estado = 'activo' AND ar.id_sucursal = s.id ORDER BY ar.id_persona LIMIT 1),
               (SELECT v.ids[1] FROM vendedores v WHERE v.id_sucursal = s.id)
           ) AS id_persona
    FROM public.sucursales s
), cabeceras AS (
    SELECT f.*, 5000000 + f.orden AS ntr_venta,
           v.ids[1 + ((f.n + f.orden::int) % cardinality(v.ids))] AS id_preventista,
           d.id_persona AS id_distribuidor
    FROM fechas f
    JOIN vendedores v ON v.id_sucursal = f.id_sucursal
    JOIN distribuidores d ON d.id_sucursal = f.id_sucursal
)
INSERT INTO public.ventas
    (ntr_pedido, ntr_venta, fecha_pedido, fecha_venta, id_sucursal, id_preventista, id_distribuidor, id_cliente,
     id_producto, cant_producto, precio_u, importe_bruto, descuento, importe_total_producto, estado)
SELECT
    c.ntr_venta - 1000000, c.ntr_venta, c.fecha_venta - 1, c.fecha_venta, c.id_sucursal, c.id_preventista, c.id_distribuidor,
    c.id_cliente, p.id,
    q.cantidad,
    q.precio,
    q.cantidad * q.precio,
    CASE WHEN q.cantidad >= 5 THEN round(q.cantidad * q.precio * 0.05, 2) ELSE 0 END,
    q.cantidad * q.precio - CASE WHEN q.cantidad >= 5 THEN round(q.cantidad * q.precio * 0.05, 2) ELSE 0 END,
    -- Una de cada 25 ventas está anulada: no cuenta para el ABC ni para la cobertura
    CASE WHEN c.ntr_venta % 25 = 0 THEN 'Anulado' ELSE 'Vigente' END
FROM cabeceras c
CROSS JOIN LATERAL generate_series(1, 1 + (c.ntr_venta % 3)::int) AS g(i)
JOIN LATERAL (
    SELECT pr.id FROM public.productos pr
    WHERE pr.id_sucursal = c.id_sucursal AND pr.estado_producto = 'Habilitado'
    ORDER BY pr.codigo_interno
    OFFSET ((c.ntr_venta + g.i * 3) % 11) LIMIT 1
) p ON true
CROSS JOIN LATERAL (
    -- Los clientes que compran más seguido también compran más cajas por venta: así las ventas se concentran
    -- como en un Pareto (pocos clientes explican la mayor parte de lo vendido en la ruta)
    SELECT ((1 + (c.ntr_venta + g.i) % 8) * CASE WHEN c.n <= 5 THEN 6 WHEN c.n <= 17 THEN 2 ELSE 1 END)::numeric AS cantidad,
           (45 + ((c.ntr_venta + g.i * 5) % 30))::numeric AS precio
) q
ON CONFLICT (ntr_venta, id_producto, id_sucursal) DO NOTHING;

-- 4. La cobertura del mes se calcula una vez por noche; al cargar los datos se deja calculada
REFRESH MATERIALIZED VIEW public.cobertura_rutas;
