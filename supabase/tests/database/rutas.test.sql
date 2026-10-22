-- Pruebas de las funciones de rutas (CU-05). Ejecutar con: npx supabase test db
-- Cubre ruta_evaluar, ruta_guardar y rutas_listar (tolerancia de astillas, tipos, validez y superposición),
-- y rutas_exportar y zonas_contorno (respaldo con geometría completa y contorno derivado, ADR-002 D6),
-- y la envolvente de zona con su regla de no invasión (ADR-002 D7).
BEGIN;
SELECT plan(45);

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
-- ADR-002 D8: el código de ruta es único en todo el sistema, también frente a otra zona. El control
-- va antes de evaluar el polígono, así que un polígono lejano no lo enmascara con otro error.
SELECT is(
  public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'ZS'), 'R-N5', 'Homónima en otra zona', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-58.0,-12.0],[-57.9,-12.0],[-57.9,-11.9],[-58.0,-11.9],[-58.0,-12.0]]]}') ->> 'error',
  'duplicado', 'el código de ruta tampoco se repite en otra zona');
SELECT is(
  public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'ZS'), 'R-N5', 'Homónima en otra zona', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-58.0,-12.0],[-57.9,-12.0],[-57.9,-11.9],[-58.0,-11.9],[-58.0,-12.0]]]}') ->> 'codigo_zona',
  'ZN', 'el duplicado informa la zona de la ruta que ya usa el código');
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

-- Contorno derivado (D6, forma de D7): las 4 rutas contiguas de ZS forman un rectángulo, que es su
-- propia envolvente; ZC no tiene rutas ni contorno
SELECT ok(
  (SELECT ST_Equals(ST_SetSRID(ST_GeomFromGeoJSON(c.geojson::text), 4326), ST_MakeEnvelope(-63.20, -17.80, -63.16, -17.79, 4326))
     FROM public.zonas_contorno(ARRAY[(SELECT id FROM public.zonas WHERE codigo_zona = 'ZS')]) c),
  'el contorno de una zona es la envolvente de sus rutas');
SELECT is(
  (SELECT count(*)::int FROM public.zonas_contorno(ARRAY[(SELECT id FROM public.zonas WHERE codigo_zona = 'ZC')])),
  0, 'una zona sin rutas no tiene contorno');

-- D7: una ruta separada del resto no parte el contorno; la envolvente sigue siendo una sola figura
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'R-S9', 'Separada', ST_MakeEnvelope(-63.10, -17.80, -63.09, -17.79, 4326), id FROM public.zonas WHERE codigo_zona = 'ZS';
SELECT is(
  (SELECT c.geojson ->> 'type' FROM public.zonas_contorno(ARRAY[(SELECT id FROM public.zonas WHERE codigo_zona = 'ZS')]) c),
  'Polygon', 'con rutas no contiguas el contorno sigue siendo un solo Polygon (envolvente)');

-- Respaldo: la exportación conserva vértices que la simplificación del mapa (~1 m) descarta
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'R-S8', 'Con vértice fino',
       ST_GeomFromText('POLYGON((-63.08 -17.80, -63.075 -17.800003, -63.07 -17.80, -63.07 -17.79, -63.08 -17.79, -63.08 -17.80))', 4326),
       id FROM public.zonas WHERE codigo_zona = 'ZS';
SELECT is(
  (SELECT ST_NPoints(ST_GeomFromGeoJSON(e.geojson::text))
     FROM public.rutas_exportar(ARRAY[(SELECT id FROM public.zonas WHERE codigo_zona = 'ZS')], (SELECT id FROM public.rutas WHERE codigo_ruta = 'R-S8')) e),
  6, 'la exportación trae la geometría completa');
SELECT is(
  (SELECT ST_NPoints(ST_GeomFromGeoJSON(l.geojson::text)) FROM public.rutas_listar(NULL, NULL) l WHERE l.codigo_ruta = 'R-S8'),
  5, 'el listado del mapa sí la simplifica');
SELECT is(
  (SELECT count(*)::int FROM public.rutas_exportar(ARRAY[(SELECT id FROM public.zonas WHERE codigo_zona = 'ZS')], (SELECT id FROM public.rutas WHERE codigo_ruta = 'R-S8'))),
  1, 'exportar una ruta devuelve solo esa ruta');

-- D7: regla de no invasión, en un área aislada (~-60, -15) para no depender de los datos del seed.
-- TA y TB son de la sucursal 1; TC de la 2. T-B1 queda en el hueco entre T-A1 y la futura T-A2;
-- T-D1 solo toca el borde de la envolvente de TA; T-C1 queda entre T-A2 y la futura T-A3.
INSERT INTO public.zonas (codigo_zona, zona, id_sucursal) VALUES ('TA', 'Prueba A', 1), ('TB', 'Prueba B', 1), ('TC', 'Prueba C', 2);
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'T-A1', 'A1', ST_MakeEnvelope(-60.00, -15.01, -59.99, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TA'
UNION ALL SELECT 'T-B1', 'B1', ST_MakeEnvelope(-59.985, -15.008, -59.975, -15.002, 4326), id FROM public.zonas WHERE codigo_zona = 'TB'
UNION ALL SELECT 'T-D1', 'D1', ST_MakeEnvelope(-60.00, -15.00, -59.99, -14.99, 4326), id FROM public.zonas WHERE codigo_zona = 'TB'
UNION ALL SELECT 'T-C1', 'C1', ST_MakeEnvelope(-59.955, -15.008, -59.945, -15.002, 4326), id FROM public.zonas WHERE codigo_zona = 'TC';

CREATE TEMP TABLE eval_a2 AS
SELECT public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-59.97,-15.01],[-59.96,-15.01],[-59.96,-15.0],[-59.97,-15.0],[-59.97,-15.01]]]}',
                           NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TA')) AS r;
SELECT is((SELECT jsonb_array_length(r -> 'invasiones') FROM eval_a2), 1,
  'la envolvente que pasaría a cubrir una ruta de otra zona es una invasión (y tocar su borde no lo es)');
SELECT is((SELECT r -> 'invasiones' -> 0 ->> 'codigo_ruta' FROM eval_a2), 'T-B1', 'la invasión informa la ruta cubierta');
SELECT is((SELECT (r -> 'invasiones' -> 0 ->> 'misma_sucursal')::boolean FROM eval_a2), true,
  'una ruta de la misma sucursal se puede sugerir para traslado');
SELECT is(
  jsonb_array_length(public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-59.97,-15.01],[-59.96,-15.01],[-59.96,-15.0],[-59.97,-15.0],[-59.97,-15.01]]]}') -> 'invasiones'),
  0, 'sin zona no se evalúan invasiones');
SELECT is(
  public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'TA'), 'T-A2', 'A2', NULL, NULL,
    '{"type":"Polygon","coordinates":[[[-59.97,-15.01],[-59.96,-15.01],[-59.96,-15.0],[-59.97,-15.0],[-59.97,-15.01]]]}') ->> 'error',
  'invasion', 'guardar una ruta cuya zona invadiría otra ruta se rechaza');

-- Traslado (CU-06): la zona destino también debe respetar la regla de no invasión.
-- T-E1 (zona TB) ocupa la misma caja que T-A2; llevarla a TA haría que TA cubra T-B1.
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'T-E1', 'E1', ST_MakeEnvelope(-59.97, -15.01, -59.96, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TB';

CREATE TEMP TABLE traslado_a AS
SELECT public.ruta_trasladar((SELECT id FROM public.rutas WHERE codigo_ruta = 'T-E1'),
                             (SELECT id FROM public.zonas WHERE codigo_zona = 'TA')) AS r;
SELECT is((SELECT r ->> 'error' FROM traslado_a), 'invasion', 'trasladar a una zona que invadiría otra ruta se rechaza');
SELECT is((SELECT r -> 'invasiones' -> 0 ->> 'codigo_ruta' FROM traslado_a), 'T-B1', 'el traslado rechazado informa la ruta cubierta');
SELECT is(
  (SELECT z.codigo_zona FROM public.rutas r JOIN public.zonas z ON z.id = r.id_zona WHERE r.codigo_ruta = 'T-E1'),
  'TB', 'un traslado rechazado deja la ruta en su zona');
SELECT is(
  (public.ruta_trasladar((SELECT id FROM public.rutas WHERE codigo_ruta = 'T-E1'),
                         (SELECT id FROM public.zonas WHERE codigo_zona = 'TC')) ->> 'ok')::boolean,
  true, 'trasladar a una zona sin invasiones nuevas se permite');
SELECT is(
  (SELECT z.codigo_zona FROM public.rutas r JOIN public.zonas z ON z.id = r.id_zona WHERE r.codigo_ruta = 'T-E1'),
  'TC', 'el traslado permitido cambia la zona de la ruta');
-- La caja queda libre para las pruebas siguientes
DELETE FROM public.rutas WHERE codigo_ruta = 'T-E1';

-- Si el polígono pisa la ruta, es una superposición y no se repite como invasión
SELECT is(
  (SELECT jsonb_build_array(jsonb_array_length(e -> 'conflictos'), jsonb_array_length(e -> 'invasiones'))
     FROM public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-59.99,-15.01],[-59.98,-15.01],[-59.98,-15.0],[-59.99,-15.0],[-59.99,-15.01]]]}',
                              NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TA')) e),
  '[1, 0]'::jsonb, 'una ruta pisada cuenta como superposición, no como invasión');

-- Invasión heredada (se carga sin pasar por la regla): no bloquea editar las rutas de la zona
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'T-A2', 'A2', ST_MakeEnvelope(-59.97, -15.01, -59.96, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TA';
SELECT is(
  jsonb_array_length(public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-59.97,-15.01],[-59.96,-15.01],[-59.96,-15.0],[-59.97,-15.0],[-59.97,-15.01]]]}',
    (SELECT id FROM public.rutas WHERE codigo_ruta = 'T-A2'), (SELECT id FROM public.zonas WHERE codigo_zona = 'TA')) -> 'invasiones'),
  0, 'una invasión heredada no bloquea editar la ruta');

-- Pero no se puede agregar otra: T-A3 haría que TA cubra T-C1, de otra sucursal
CREATE TEMP TABLE eval_a3 AS
SELECT public.ruta_evaluar('{"type":"Polygon","coordinates":[[[-59.94,-15.01],[-59.93,-15.01],[-59.93,-15.0],[-59.94,-15.0],[-59.94,-15.01]]]}',
                           NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TA')) AS r;
SELECT is((SELECT jsonb_agg(i ->> 'codigo_ruta') FROM eval_a3, jsonb_array_elements(r -> 'invasiones') i), '["T-C1"]'::jsonb,
  'una invasión nueva se rechaza aunque la zona ya tenga una heredada');
SELECT is((SELECT (r -> 'invasiones' -> 0 ->> 'misma_sucursal')::boolean FROM eval_a3), false,
  'una ruta de otra sucursal no se puede sugerir para traslado');

-- Cobertura ajena (ADR-002 D7, ampliada el 12 de octubre de 2026): una ruta que caería dentro de la
-- envolvente de OTRA zona se rechaza, aunque la zona que la recibe no crezca sobre nadie.
-- TD (T-D0 y T-D2) deja un hueco en su envolvente; TE, TH, TI y TG se usan para recibir o ceder rutas.
INSERT INTO public.zonas (codigo_zona, zona, id_sucursal)
VALUES ('TD', 'Prueba D', 1), ('TE', 'Prueba E', 1), ('TG', 'Prueba G', 1), ('TH', 'Prueba H', 1), ('TI', 'Prueba I', 1);
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'T-D0', 'D0', ST_MakeEnvelope(-59.00, -15.01, -58.99, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TD'
UNION ALL SELECT 'T-D2', 'D2', ST_MakeEnvelope(-58.97, -15.01, -58.96, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TD'
UNION ALL SELECT 'T-G0', 'G0', ST_MakeEnvelope(-58.00, -15.01, -57.99, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TG'
UNION ALL SELECT 'T-G2', 'G2', ST_MakeEnvelope(-57.97, -15.01, -57.96, -15.00, 4326), id FROM public.zonas WHERE codigo_zona = 'TG'
UNION ALL SELECT 'T-G1', 'G1', ST_MakeEnvelope(-57.985, -15.008, -57.975, -15.002, 4326), id FROM public.zonas WHERE codigo_zona = 'TG';

-- Una ruta de TE en el hueco de TD queda dentro de su envolvente
SELECT is(
  (SELECT jsonb_agg(c ->> 'codigo_zona')
     FROM jsonb_array_elements(public.ruta_evaluar(
       '{"type":"Polygon","coordinates":[[[-58.985,-15.008],[-58.975,-15.008],[-58.975,-15.002],[-58.985,-15.002],[-58.985,-15.008]]]}',
       NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TE')) -> 'coberturas') c),
  '["TD"]'::jsonb, 'una ruta dentro de la envolvente de otra zona informa esa zona');
CREATE TEMP TABLE guardar_hueco AS
SELECT public.ruta_guardar((SELECT id FROM public.zonas WHERE codigo_zona = 'TE'), 'T-F1', 'F1', NULL, NULL,
  '{"type":"Polygon","coordinates":[[[-58.985,-15.008],[-58.975,-15.008],[-58.975,-15.002],[-58.985,-15.002],[-58.985,-15.008]]]}') AS r;
SELECT is((SELECT r ->> 'error' FROM guardar_hueco), 'cobertura', 'guardar una ruta dentro de la envolvente de otra zona se rechaza');
SELECT is((SELECT count(*)::int FROM public.rutas WHERE codigo_ruta = 'T-F1'), 0, 'la ruta rechazada por cobertura no se guarda');
SELECT is(
  jsonb_array_length(public.ruta_evaluar(
    '{"type":"Polygon","coordinates":[[[-58.95,-15.01],[-58.94,-15.01],[-58.94,-15.0],[-58.95,-15.0],[-58.95,-15.01]]]}',
    NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TE')) -> 'coberturas'),
  0, 'una ruta fuera de toda envolvente ajena no tiene coberturas');
SELECT is(
  jsonb_array_length(public.ruta_evaluar(
    '{"type":"Polygon","coordinates":[[[-58.96,-15.01],[-58.95,-15.01],[-58.95,-15.0],[-58.96,-15.0],[-58.96,-15.01]]]}',
    NULL, (SELECT id FROM public.zonas WHERE codigo_zona = 'TE')) -> 'coberturas'),
  0, 'una ruta que solo toca el borde de la envolvente ajena no la invade');

-- Una ruta que ya estaba dentro de la envolvente ajena (heredado) puede editarse y trasladarse
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
SELECT 'T-F1', 'F1', ST_MakeEnvelope(-58.985, -15.008, -58.975, -15.002, 4326), id FROM public.zonas WHERE codigo_zona = 'TE';
SELECT is(
  jsonb_array_length(public.ruta_evaluar(
    '{"type":"Polygon","coordinates":[[[-58.985,-15.008],[-58.975,-15.008],[-58.975,-15.002],[-58.985,-15.002],[-58.985,-15.008]]]}',
    (SELECT id FROM public.rutas WHERE codigo_ruta = 'T-F1'), (SELECT id FROM public.zonas WHERE codigo_zona = 'TE')) -> 'coberturas'),
  0, 'una cobertura heredada no bloquea editar la ruta');
SELECT is(
  (public.ruta_trasladar((SELECT id FROM public.rutas WHERE codigo_ruta = 'T-F1'),
                         (SELECT id FROM public.zonas WHERE codigo_zona = 'TH')) ->> 'ok')::boolean,
  true, 'una cobertura heredada de una tercera zona no bloquea el traslado');

-- Al sacar T-G1 de TG, la envolvente de TG (T-G0 y T-G2) la seguiría cubriendo: el traslado se rechaza
CREATE TEMP TABLE traslado_g AS
SELECT public.ruta_trasladar((SELECT id FROM public.rutas WHERE codigo_ruta = 'T-G1'),
                             (SELECT id FROM public.zonas WHERE codigo_zona = 'TI')) AS r;
SELECT is((SELECT r ->> 'error' || ':' || (r -> 'coberturas' -> 0 ->> 'codigo_zona') FROM traslado_g), 'cobertura:TG',
  'trasladar una ruta que la envolvente de su zona de origen seguiría cubriendo se rechaza');
SELECT is(
  (SELECT z.codigo_zona FROM public.rutas r JOIN public.zonas z ON z.id = r.id_zona WHERE r.codigo_ruta = 'T-G1'),
  'TG', 'el traslado rechazado por cobertura deja la ruta en su zona');

SELECT * FROM finish();
ROLLBACK;
