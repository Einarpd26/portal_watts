-- Pruebas de las funciones de rutas (CU-05). Ejecutar con: npx supabase test db
-- Cubre ruta_evaluar, ruta_guardar y rutas_listar: tolerancia de astillas, tipos, validez y superposición.
BEGIN;
SELECT plan(14);

-- Caja contigua a R-N4 (que ocupa x -63.17..-63.16): solo comparten borde
SELECT is(
  (public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-63.16,-17.79],[-63.15,-17.79],[-63.15,-17.78],[-63.16,-17.78],[-63.16,-17.79]]]}') ->> 'ok')::boolean,
  true, 'un polígono contiguo es válido');
SELECT is(
  jsonb_array_length(public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-63.16,-17.79],[-63.15,-17.79],[-63.15,-17.78],[-63.16,-17.78],[-63.16,-17.79]]]}') -> 'conflictos'),
  0, 'un polígono contiguo no tiene conflictos');

-- Tolerancia: 1e-8 grados de desborde se absorbe con la rejilla de 1e-6; 5e-6 no
SELECT is(
  jsonb_array_length(public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-63.16000001,-17.79],[-63.15,-17.79],[-63.15,-17.78],[-63.16000001,-17.78],[-63.16000001,-17.79]]]}') -> 'conflictos'),
  0, 'el ruido de 1e-8 grados se absorbe (tolerancia de astillas)');
SELECT is(
  public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-63.160005,-17.79],[-63.15,-17.79],[-63.15,-17.78],[-63.160005,-17.78],[-63.160005,-17.79]]]}') -> 'conflictos' -> 0 ->> 'codigo_ruta',
  'R-N4', 'un desborde real de 5e-6 grados se detecta como superposición');

-- Tipos y validez
SELECT is(public.ruta_evaluar('{"type":"Point","coordinates":[-63.1,-17.7]}') ->> 'error', 'no_poligono', 'un Point no es una ruta');
SELECT is(public.ruta_evaluar('{"type":"MultiPolygon","coordinates":[[[[-63.1,-17.7],[-63.0,-17.7],[-63.0,-17.6],[-63.1,-17.7]]]]}') ->> 'error', 'no_poligono', 'un MultiPolygon no es una ruta');
SELECT is(public.ruta_evaluar('no es json') ->> 'error', 'geojson_invalido', 'un texto que no es GeoJSON se rechaza');
SELECT is(
  public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-60,-10],[-59,-9],[-59,-10],[-60,-9],[-60,-10]]]}') ->> 'error',
  'geometria_invalida', 'un polígono que se cruza a sí mismo se rechaza');

-- Guardado: alta, duplicado, superposición y reemplazo
SELECT is(
  (public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'ZN'), 'R-N5', 'Vecina', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-63.16,-17.79],[-63.15,-17.79],[-63.15,-17.78],[-63.16,-17.78],[-63.16,-17.79]]]}') ->> 'ok')::boolean,
  true, 'ruta_guardar crea una ruta contigua');
SELECT is(
  public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'ZN'), 'R-N5', 'Otra', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-63.15,-17.79],[-63.14,-17.79],[-63.14,-17.78],[-63.15,-17.78],[-63.15,-17.79]]]}') ->> 'error',
  'duplicado', 'el código repetido en la zona se informa como duplicado');
SELECT is(
  public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'ZN'), 'R-N6', 'Pisa', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-63.195,-17.795],[-63.185,-17.795],[-63.185,-17.785],[-63.195,-17.785],[-63.195,-17.795]]]}') ->> 'error',
  'superposicion', 'ruta_guardar rechaza una superposición y no inserta');
SELECT is((SELECT count(*)::int FROM public.rutas WHERE codigo_ruta = 'R-N6'), 0, 'la superposición rechazada no deja filas');

-- Reemplazar el polígono de una ruta sobre sí misma no es conflicto
SELECT is(
  (public.ruta_guardar((SELECT id_zona FROM public.rutas WHERE codigo_ruta = 'R-N5'), 'R-N5', 'Vecina', (SELECT id FROM public.rutas WHERE codigo_ruta = 'R-N5'), NULL,
    '{"type":"Polygon","coordinates":[[[-63.16,-17.7925],[-63.15,-17.7925],[-63.15,-17.7825],[-63.16,-17.7825],[-63.16,-17.7925]]]}') ->> 'ok')::boolean,
  true, 'una ruta puede reemplazar su polígono moviéndose sobre su propia posición anterior');

SELECT is((SELECT count(*)::int FROM public.rutas_listar(NULL, NULL)), 11, 'rutas_listar devuelve las 10 del seed y la nueva');

SELECT * FROM finish();
ROLLBACK;
