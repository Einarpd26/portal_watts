-- Pruebas de la base de datos del Módulo 2 (zonas y rutas). Ejecutar con: npx supabase test db
-- Reglas verificadas: ADR-002 (no superposición por interiores), RN-01, restricciones y privilegios.
BEGIN;
SELECT plan(20);

SELECT has_extension('extensions', 'postgis', 'PostGIS está instalado');
SELECT has_table('public', 'zonas', 'existe zonas');
SELECT has_table('public', 'supervisor_zonas', 'existe supervisor_zonas');
SELECT has_table('public', 'rutas', 'existe rutas');
SELECT is((SELECT count(*)::int FROM public.rutas), 10, 'el seed carga 10 rutas contiguas sin que la regla las rechace');

-- Ruta vecina: comparte borde con R-N4 (x 0.0 a +0.01) pero no superficie => válida
SELECT lives_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-N5', 'Vecina que solo comparte borde',
           ST_MakeEnvelope(-63.16, -17.79, -63.15, -17.78, 4326), id FROM public.zonas WHERE codigo_zona = 'ZN'$$,
  'una ruta contigua que solo comparte borde es válida');

-- Superposición parcial
SELECT throws_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-X1', 'Parcial', ST_MakeEnvelope(-63.195, -17.795, -63.185, -17.785, 4326), id FROM public.zonas WHERE codigo_zona = 'ZN'$$,
  '23P01', NULL, 'se rechaza una superposición parcial');

-- Contenida dentro de otra (ST_Overlaps NO la detectaría)
SELECT throws_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-X2', 'Contenida', ST_MakeEnvelope(-63.198, -17.798, -63.192, -17.792, 4326), id FROM public.zonas WHERE codigo_zona = 'ZS'$$,
  '23P01', NULL, 'se rechaza una ruta contenida en otra');

-- Idéntica a otra (ST_Overlaps tampoco la detectaría)
SELECT throws_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-X3', 'Idéntica', ST_MakeEnvelope(-63.20, -17.79, -63.19, -17.78, 4326), id FROM public.zonas WHERE codigo_zona = 'ZS'$$,
  '23P01', NULL, 'se rechaza una ruta idéntica a otra');

-- Contiene a otra más pequeña
SELECT throws_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-X4', 'Envolvente', ST_MakeEnvelope(-63.21, -17.81, -63.15, -17.77, 4326), id FROM public.zonas WHERE codigo_zona = 'ZN'$$,
  '23P01', NULL, 'se rechaza una ruta que contiene a otras');

-- Edición: mover una ruta encima de otra
SELECT throws_ok(
  $$UPDATE public.rutas SET localizacion = ST_MakeEnvelope(-63.19, -17.79, -63.18, -17.78, 4326) WHERE codigo_ruta = 'R-N1'$$,
  '23P01', NULL, 'se rechaza editar una ruta para que invada a otra');

-- Geometría inválida (lazo: autointersección)
SELECT throws_ok(
  $$INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
    SELECT 'R-X5', 'Lazo', ST_GeomFromText('POLYGON((-60 -10, -59 -9, -59 -10, -60 -9, -60 -10))', 4326), id FROM public.zonas WHERE codigo_zona = 'ZN'$$,
  '23514', NULL, 'se rechaza una geometría inválida');

-- Restricciones de unicidad e integridad
SELECT throws_ok(
  $$INSERT INTO public.zonas (codigo_zona, zona, id_sucursal) SELECT 'ZN', 'Duplicada', id FROM public.sucursales WHERE nombre_sucursal = 'Santa Cruz'$$,
  '23505', NULL, 'el código de zona es único dentro de la sucursal');
SELECT throws_ok(
  $$INSERT INTO public.supervisor_zonas (id_supervisor, id_zona)
    SELECT p.id, z.id FROM public.personas p, public.zonas z WHERE p.ci = '6394812' AND z.codigo_zona = 'ZN'$$,
  '23505', NULL, 'una zona tiene un solo supervisor');
SELECT throws_ok(
  $$DELETE FROM public.zonas WHERE codigo_zona = 'ZN'$$,
  '23503', NULL, 'no se elimina una zona con rutas');

-- Seed: una zona queda sin supervisor (CU-07)
SELECT is((SELECT count(*)::int FROM public.zonas z WHERE NOT EXISTS (SELECT 1 FROM public.supervisor_zonas sz WHERE sz.id_zona = z.id)), 1, 'solo la zona ZC queda sin supervisor');

-- Privilegios (ADR-001 §E, ADR-002 §3)
SELECT ok(NOT has_table_privilege('anon', 'public.rutas', 'SELECT'), 'anon no lee rutas');
SELECT ok(NOT has_table_privilege('authenticated', 'public.rutas', 'INSERT'), 'authenticated no inserta rutas');
SELECT ok(has_table_privilege('authenticated', 'public.rutas', 'SELECT'), 'authenticated conserva la lectura de rutas');
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  0,
  'ninguna función del esquema public es ejecutable por anon ni authenticated'
);

SELECT * FROM finish();
ROLLBACK;
