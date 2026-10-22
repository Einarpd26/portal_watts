-- Pruebas de la importación por lote (CU-16, ADR-002 D8 y D9). Ejecutar con: npx supabase test db
-- Cubre ruta_lote_procesar: rutas nuevas, actualizadas y sin cambios, modo parcial, orden del lote,
-- ruta en otra zona, zona inexistente, alcance y vista previa que no guarda nada.
BEGIN;
SELECT plan(23);

-- Ayuda: una ruta del lote con un polígono rectangular (x0, y0, x1, y1)
CREATE FUNCTION pg_temp.item(p_indice int, p_codigo text, p_nombre text, p_zona text, x0 numeric, y0 numeric, x1 numeric, y1 numeric)
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'indice', p_indice, 'codigo_ruta', p_codigo, 'ruta', p_nombre, 'codigo_zona', p_zona,
    'poligono', ST_AsGeoJSON(ST_MakeEnvelope(x0, y0, x1, y1, 4326))::jsonb);
$$;

CREATE TEMP TABLE ctx AS
SELECT (SELECT id_sucursal FROM public.zonas WHERE codigo_zona = 'ZC') AS suc,
       (SELECT id FROM public.zonas WHERE codigo_zona = 'ZC') AS zc,
       (SELECT id FROM public.zonas WHERE codigo_zona = 'ZN') AS zn;

-- Entradas inválidas
SELECT is(public.ruta_lote_procesar(-1, '[]'::jsonb, NULL, false) ->> 'error', 'sucursal_invalida', 'una sucursal inexistente se rechaza');
SELECT is(public.ruta_lote_procesar((SELECT suc FROM ctx), '{}'::jsonb, NULL, false) ->> 'error', 'lote_invalido', 'un lote que no es un arreglo se rechaza');

-- Vista previa: informa lo que haría, pero no guarda nada
CREATE TEMP TABLE prev AS
SELECT public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
  pg_temp.item(0, 'L-A', 'Lote A', 'ZC', -62.00, -17.00, -61.99, -16.99),
  pg_temp.item(1, 'L-B', 'Lote B', 'ZC', -61.98, -17.00, -61.97, -16.99)), NULL, false) AS r;
SELECT is((SELECT r -> 'resumen' ->> 'nuevas' FROM prev), '2', 'la vista previa informa dos rutas nuevas');
SELECT is((SELECT (r ->> 'confirmado')::boolean FROM prev), false, 'la vista previa no está confirmada');
SELECT is((SELECT count(*)::int FROM public.rutas WHERE codigo_ruta IN ('L-A', 'L-B')), 0, 'la vista previa no guarda nada');

-- Confirmación: guarda las rutas, con el polígono del archivo
CREATE TEMP TABLE conf AS
SELECT public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
  pg_temp.item(0, 'L-A', 'Lote A', 'ZC', -62.00, -17.00, -61.99, -16.99),
  pg_temp.item(1, 'L-B', 'Lote B', 'ZC', -61.98, -17.00, -61.97, -16.99)), NULL, true) AS r;
SELECT is((SELECT r -> 'resumen' ->> 'nuevas' FROM conf), '2', 'la confirmación crea las dos rutas');
SELECT is((SELECT (r ->> 'confirmado')::boolean FROM conf), true, 'la confirmación queda confirmada');
SELECT is((SELECT count(*)::int FROM public.rutas WHERE codigo_ruta IN ('L-A', 'L-B')), 2, 'las dos rutas quedan guardadas');
SELECT ok(
  (SELECT ST_Equals(localizacion, ST_MakeEnvelope(-62.00, -17.00, -61.99, -16.99, 4326)) FROM public.rutas WHERE codigo_ruta = 'L-A'),
  'el polígono guardado es el del archivo');

-- Reimportar el mismo archivo: todo sin cambios
SELECT is(
  (public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
    pg_temp.item(0, 'L-A', 'Lote A', 'ZC', -62.00, -17.00, -61.99, -16.99),
    pg_temp.item(1, 'L-B', 'Lote B', 'ZC', -61.98, -17.00, -61.97, -16.99)), NULL, true) -> 'resumen') - 'rechazadas',
  '{"nuevas": 0, "actualizadas": 0, "sin_cambios": 2}'::jsonb,
  'reimportar el mismo archivo deja las rutas sin cambios');

-- Actualizar una ruta existente: cambian polígono y nombre; la zona queda intacta
SELECT is(
  public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
    pg_temp.item(0, 'L-A', 'Lote A renombrada', 'ZC', -62.00, -17.00, -61.995, -16.995)), NULL, true) -> 'resumen' ->> 'actualizadas',
  '1', 'una ruta existente con otro polígono y nombre se actualiza');
SELECT ok(
  (SELECT ST_Equals(localizacion, ST_MakeEnvelope(-62.00, -17.00, -61.995, -16.995, 4326)) AND ruta = 'Lote A renombrada' AND id_zona = (SELECT zc FROM ctx)
     FROM public.rutas WHERE codigo_ruta = 'L-A'),
  'quedó el polígono y el nombre nuevos, en la misma zona');

-- Una ruta que ya existe en otra zona no se mueve: se rechaza e informa la zona actual (CU-06)
CREATE TEMP TABLE otra AS
SELECT public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
  pg_temp.item(0, 'R-N1', 'Norte uno', 'ZC', -61.50, -17.00, -61.49, -16.99)), NULL, true) AS r;
SELECT is((SELECT r -> 'resultados' -> 0 ->> 'motivo' FROM otra), 'en_otra_zona', 'una ruta de otra zona se rechaza');
SELECT is((SELECT r -> 'resultados' -> 0 ->> 'codigo_zona' FROM otra), 'ZN', 'se informa la zona en la que está');
SELECT is((SELECT z.codigo_zona FROM public.rutas r JOIN public.zonas z ON z.id = r.id_zona WHERE r.codigo_ruta = 'R-N1'), 'ZN', 'la ruta no cambió de zona');

-- Zona inexistente y fuera del alcance
SELECT is(
  public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
    pg_temp.item(0, 'L-Z', 'Sin zona', 'NOEXISTE', -61.50, -17.00, -61.49, -16.99)), NULL, true) -> 'resultados' -> 0 ->> 'motivo',
  'zona_inexistente', 'una zona que no existe en la sucursal se rechaza');
SELECT is(
  public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
    pg_temp.item(0, 'L-Z', 'Fuera de alcance', 'ZC', -61.50, -17.00, -61.49, -16.99)), ARRAY[(SELECT zn FROM ctx)], true) -> 'resultados' -> 0 ->> 'motivo',
  'fuera_de_alcance', 'una zona fuera del alcance de quien opera se rechaza');

-- Modo parcial: la ruta que se superpone se rechaza y la válida se importa
CREATE TEMP TABLE parcial AS
SELECT public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
  jsonb_build_object('indice', 0, 'codigo_ruta', 'L-PISA', 'ruta', 'Pisa a R-S1', 'codigo_zona', 'ZC',
    'poligono', (SELECT ST_AsGeoJSON(localizacion)::jsonb FROM public.rutas WHERE codigo_ruta = 'R-S1')),
  pg_temp.item(1, 'L-OK', 'Válida', 'ZC', -61.60, -17.00, -61.59, -16.99)), NULL, true) AS r;
SELECT is((SELECT r -> 'resultados' -> 0 ->> 'motivo' FROM parcial), 'superposicion', 'la ruta que se superpone se rechaza');
SELECT is((SELECT r -> 'resultados' -> 1 ->> 'estado' FROM parcial), 'nueva', 'la ruta válida del mismo lote se importa');
SELECT is((SELECT count(*)::int FROM public.rutas WHERE codigo_ruta IN ('L-PISA', 'L-OK')), 1, 'solo queda guardada la válida');

-- Orden: las rutas ya aceptadas del lote cuentan como existentes para las siguientes
CREATE TEMP TABLE orden AS
SELECT public.ruta_lote_procesar((SELECT suc FROM ctx), jsonb_build_array(
  pg_temp.item(0, 'L-P1', 'Primera', 'ZC', -61.90, -17.00, -61.89, -16.99),
  pg_temp.item(1, 'L-P2', 'Segunda, pisa a la primera', 'ZC', -61.895, -17.00, -61.885, -16.99)), NULL, false) AS r;
SELECT is((SELECT r -> 'resultados' -> 0 ->> 'estado' FROM orden), 'nueva', 'la primera ruta del lote se acepta');
SELECT is((SELECT r -> 'resultados' -> 1 ->> 'motivo' FROM orden), 'superposicion', 'la segunda se rechaza por pisar a la primera del mismo lote');
SELECT is((SELECT r -> 'resultados' -> 1 -> 'conflictos' -> 0 ->> 'codigo_ruta' FROM orden), 'L-P1', 'el conflicto nombra a la ruta del propio lote');

SELECT * FROM finish();
ROLLBACK;
