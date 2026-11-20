-- Pruebas de clientes, ventas, clasificación ABC y cobertura (CU-12, CU-13, ADR-005). Ejecutar con: npx supabase test db
-- Reglas verificadas: Pareto por ruta sobre las ventas vigentes de 6 meses (A hasta 80 %, B hasta 95 %, C el resto,
-- I sin ventas, sin clase si no está habilitado), ventas anuladas que no cuentan y cobertura del mes (RN-08).
BEGIN;
SELECT plan(18);

CREATE TEMP TABLE t (clave text PRIMARY KEY, id bigint NOT NULL);

INSERT INTO public.sucursales (nombre_sucursal, descripcion) VALUES ('T-Com', 'prueba');
INSERT INTO public.personas (ci, nombres, apellidos) VALUES ('TC-P1', 'Pre', 'Ventista'), ('TC-P2', 'Dis', 'Tribuidor');
INSERT INTO t SELECT lower(ci), id FROM public.personas WHERE ci LIKE 'TC-%';

INSERT INTO public.zonas (codigo_zona, zona, id_sucursal)
VALUES ('TCZ', 'Zona T', (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Com'));
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
VALUES ('TC-R1', 'Ruta 1', ST_MakeEnvelope(-81.00, -31.00, -80.99, -30.99, 4326), (SELECT id FROM public.zonas WHERE codigo_zona = 'TCZ')),
       ('TC-R2', 'Ruta 2', ST_MakeEnvelope(-81.00, -31.10, -80.99, -31.09, 4326), (SELECT id FROM public.zonas WHERE codigo_zona = 'TCZ'));
INSERT INTO t SELECT lower(codigo_ruta), id FROM public.rutas WHERE codigo_ruta LIKE 'TC-R_';

INSERT INTO public.productos (codigo_interno, nombre, um, grupo, subgrupo, estado_producto, factor_conversion, id_sucursal)
VALUES ('TC-P', 'Producto', 'CAJA', 'G', 'S', 'Habilitado', 1, (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Com'));
INSERT INTO t SELECT 'prod', id FROM public.productos WHERE codigo_interno = 'TC-P';

-- Ruta 1: seis clientes. C6 no está habilitado. Ruta 2: un solo cliente
INSERT INTO public.clientes (codigo_cliente, nombre_completo, direccion, rubro, latitud, longitud, habilitado, id_ruta)
SELECT c.cod, 'Cliente ' || c.cod, 'Calle 1', 'Tienda', -30.995, -80.995, c.hab, (SELECT id FROM t WHERE clave = c.ruta)
  FROM (VALUES ('C1', 'HABILITADO', 'tc-r1'), ('C2', 'HABILITADO', 'tc-r1'), ('C3', 'HABILITADO', 'tc-r1'),
               ('C4', 'HABILITADO', 'tc-r1'), ('C5', 'HABILITADO', 'tc-r1'), ('C6', 'NO HABILITADO', 'tc-r1'),
               ('C7', 'HABILITADO', 'tc-r2')) AS c(cod, hab, ruta);
INSERT INTO t SELECT lower(codigo_cliente), id FROM public.clientes WHERE codigo_cliente IN ('C1','C2','C3','C4','C5','C6','C7') AND id_ruta IN (SELECT id FROM t WHERE clave LIKE 'tc-r_');

-- Ventas: (cliente, monto, hace cuántos días —0 = el primer día del mes—, estado)
-- Ruta 1 vigente de 6 meses: C1 800, C2 150, C3 40, C4 10 = 1000. Las anuladas no suman. C5 solo compró hace 300 días.
CREATE TEMP TABLE v (n serial, cli text, monto numeric, desde_mes boolean, hace int, est text);
INSERT INTO v (cli, monto, desde_mes, hace, est) VALUES
    ('c1', 800, true, 0, 'Vigente'),
    ('c2', 150, true, 0, 'Vigente'),
    ('c3', 40, false, 40, 'Vigente'),
    ('c3', 500, true, 0, 'Anulado'),
    ('c4', 10, false, 60, 'Vigente'),
    ('c4', 5000, false, 50, 'Anulado'),
    ('c5', 300, false, 300, 'Vigente'),
    ('c7', 100, true, 0, 'Vigente');
INSERT INTO public.ventas (ntr_pedido, ntr_venta, fecha_pedido, fecha_venta, id_sucursal, id_preventista, id_distribuidor,
                           id_cliente, id_producto, cant_producto, precio_u, importe_bruto, descuento, importe_total_producto, estado)
SELECT 9000000 + v.n, 9100000 + v.n,
       CASE WHEN v.desde_mes THEN date_trunc('month', current_date)::date ELSE (current_date - v.hace) END,
       CASE WHEN v.desde_mes THEN date_trunc('month', current_date)::date ELSE (current_date - v.hace) END,
       (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Com'),
       (SELECT id FROM t WHERE clave = 'tc-p1'), (SELECT id FROM t WHERE clave = 'tc-p2'),
       (SELECT id FROM t WHERE clave = v.cli), (SELECT id FROM t WHERE clave = 'prod'),
       1, v.monto, v.monto, 0, v.monto, v.est
  FROM v;

-- Clasificación: Pareto por ruta
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c1')), 'A',
          'el cliente que vende el 80 % de la ruta es A (el corte es inclusivo)');
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c2')), 'B',
          'con él la ruta llega al 95 %: B');
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c3')), 'C',
          'pasado el 95 % de la ruta: C');
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c4')), 'C',
          'el último cliente con ventas cierra la ruta en C');
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c5')), 'I',
          'sin ventas vigentes en 6 meses: inactivo');
SELECT ok((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c6')) IS NULL,
          'un cliente no habilitado no se clasifica');
SELECT is((SELECT total_ventas FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c4')), 10::numeric,
          'las ventas anuladas no suman al total del cliente');
SELECT is((SELECT porcentaje_acumulado FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c2')), 0.95::numeric,
          'el porcentaje acumulado de la ruta se calcula sobre las ventas vigentes');
SELECT is((SELECT ultima_compra FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c5')), (current_date - 300),
          'la última compra mira todo el historial vigente, no solo los 6 meses');
SELECT is((SELECT clasificacion FROM public.clientes_abc WHERE id_cliente = (SELECT id FROM t WHERE clave = 'c7')), 'C',
          'caso límite conocido (ADR-005 D2): un cliente que por sí solo es el 100 % de la ruta queda en C');

-- Cobertura (RN-08): habilitados con al menos una venta vigente en el mes en curso
REFRESH MATERIALIZED VIEW public.cobertura_rutas;
SELECT is((SELECT clientes_habilitados FROM public.cobertura_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tc-r1')), 5,
          'los clientes no habilitados no cuentan en la cobertura');
SELECT is((SELECT clientes_atendidos FROM public.cobertura_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tc-r1')), 2,
          'atendidos: solo con ventas vigentes del mes (la anulada y la de hace meses no cuentan)');
SELECT is((SELECT porcentaje FROM public.cobertura_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tc-r1')), 40.0::numeric,
          'la cobertura de la ruta es atendidos sobre habilitados');
SELECT is((SELECT porcentaje FROM public.cobertura_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tc-r2')), 100.0::numeric,
          'una ruta con su único cliente atendido tiene cobertura completa');
SELECT ok(NOT has_function_privilege('authenticated', 'public.cobertura_rutas_recalcular()', 'EXECUTE'),
          'el recálculo de la cobertura no es invocable desde el navegador');

-- Restricciones del modelo (CHECK en lugar de enums)
SELECT throws_ok($$INSERT INTO public.clientes (codigo_cliente, nombre_completo, direccion, rubro, habilitado, id_ruta)
                   VALUES ('X', 'X', 'X', 'X', 'QUIZAS', (SELECT id FROM public.rutas WHERE codigo_ruta = 'TC-R1'))$$,
                 '23514', NULL, 'habilitado solo admite HABILITADO o NO HABILITADO');
SELECT throws_ok($$INSERT INTO public.clientes (codigo_cliente, nombre_completo, direccion, rubro, latitud, habilitado, id_ruta)
                   VALUES ('Y', 'Y', 'Y', 'Y', -30.9, 'HABILITADO', (SELECT id FROM public.rutas WHERE codigo_ruta = 'TC-R1'))$$,
                 '23514', NULL, 'la latitud y la longitud van juntas o ninguna');
SELECT throws_ok($$INSERT INTO public.ventas (ntr_pedido, ntr_venta, fecha_pedido, fecha_venta, id_sucursal, id_preventista, id_distribuidor,
                                              id_cliente, id_producto, cant_producto, precio_u, estado)
                   SELECT 1, 1, current_date, current_date, s.id, p.id, p.id, c.id, pr.id, 1, 1, 'Pendiente'
                     FROM public.sucursales s, public.personas p, public.clientes c, public.productos pr
                    WHERE s.nombre_sucursal = 'T-Com' AND p.ci = 'TC-P1' AND c.codigo_cliente = 'C1' AND pr.codigo_interno = 'TC-P'$$,
                 '23514', NULL, 'el estado de la venta solo admite Vigente o Anulado');

SELECT * FROM finish();
ROLLBACK;
