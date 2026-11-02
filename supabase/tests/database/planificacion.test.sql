-- Pruebas de la planificación de rutas por día (CU-09). Ejecutar con: npx supabase test db
-- Reglas verificadas: RN-04 (duplicadas permitidas), RN-05 (solo rutas de las zonas del supervisor) y
-- RF-09 (trasladar una ruta elimina su planificación).
BEGIN;
SELECT plan(16);

CREATE TEMP TABLE t (clave text PRIMARY KEY, id bigint NOT NULL);

INSERT INTO public.sucursales (nombre_sucursal, descripcion) VALUES ('T-Plan', 'prueba');
INSERT INTO public.personas (ci, nombres, apellidos) VALUES ('TP-S1', 'Sup', 'Uno'), ('TP-S2', 'Sup', 'Dos');
INSERT INTO t SELECT lower(ci), id FROM public.personas WHERE ci LIKE 'TP-%';

INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT p.id, (SELECT id FROM public.roles WHERE codigo = 'SUPERVISOR'), 'SUCURSAL',
       (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Plan')
  FROM public.personas p WHERE p.ci IN ('TP-S1', 'TP-S2');

-- Zonas: ZA y ZB de s1 y s2; ZC sin supervisor (destino del traslado)
INSERT INTO public.zonas (codigo_zona, zona, id_sucursal)
SELECT z.c, z.n, (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Plan')
  FROM (VALUES ('TPA', 'Zona A'), ('TPB', 'Zona B'), ('TPC', 'Zona C')) AS z(c, n);
INSERT INTO t SELECT lower(codigo_zona), id FROM public.zonas WHERE codigo_zona LIKE 'TP_';
INSERT INTO public.supervisor_zonas (id_supervisor, id_zona)
VALUES ((SELECT id FROM t WHERE clave = 'tp-s1'), (SELECT id FROM t WHERE clave = 'tpa')),
       ((SELECT id FROM t WHERE clave = 'tp-s2'), (SELECT id FROM t WHERE clave = 'tpb'));

-- Rutas lejanas para no tocar el resto de los datos
INSERT INTO public.rutas (codigo_ruta, ruta, localizacion, id_zona)
VALUES ('TP-R1', 'Ruta 1', ST_MakeEnvelope(-80.00, -30.00, -79.99, -29.99, 4326), (SELECT id FROM t WHERE clave = 'tpa')),
       ('TP-R2', 'Ruta 2', ST_MakeEnvelope(-80.00, -30.10, -79.99, -30.09, 4326), (SELECT id FROM t WHERE clave = 'tpb'));
INSERT INTO t SELECT lower(codigo_ruta), id FROM public.rutas WHERE codigo_ruta LIKE 'TP-R_';

-- Slots: dos de s1 y uno de s2
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'tp-s1'));
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'tp-s1'));
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'tp-s2'));
INSERT INTO t SELECT 'slot1', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'tp-s1') AND orden = 0;
INSERT INTO t SELECT 'slot2', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'tp-s1') AND orden = 1;
INSERT INTO t SELECT 'slot3', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'tp-s2');

-- Agregar
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'LU'))->>'ok'),
  'true', 'planifica una ruta de su zona en su slot');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'JU'))->>'ok'),
  'true', 'la misma ruta puede planificarse otro día (se marca como duplicada en la interfaz)');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot2'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'LU'))->>'ok'),
  'true', 'la misma ruta puede planificarse en otro slot (RN-04: se permite y se marca)');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'LU'))->>'error'),
  'ya_planificada', 'rechaza solo la visita idéntica (mismo slot, ruta, día y frecuencia)');

-- RN-05 y propiedad
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r2'), 'MA'))->>'error'),
  'ruta_fuera_de_zona', 'rechaza una ruta de una zona que el supervisor no supervisa (RN-05)');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot3'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'MA'))->>'error'),
  'no_encontrada', 'un supervisor no planifica en slots ajenos');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'DO'))->>'error'),
  'dia_invalido', 'rechaza un día fuera de lunes a sábado');
SELECT is(
  (SELECT (public.planificacion_agregar((SELECT id FROM t WHERE clave = 'slot1'), (SELECT id FROM t WHERE clave = 'tp-s1'),
                                        (SELECT id FROM t WHERE clave = 'tp-r1'), 'MA', 'diaria'))->>'error'),
  'frecuencia_invalida', 'rechaza una frecuencia desconocida');

-- Cambiar frecuencia y quitar
INSERT INTO t SELECT 'visita-lu', id FROM public.planificacion_rutas WHERE id_vendedor_slot = (SELECT id FROM t WHERE clave = 'slot1') AND dia_semana = 'LU';
INSERT INTO t SELECT 'visita-ju', id FROM public.planificacion_rutas WHERE id_vendedor_slot = (SELECT id FROM t WHERE clave = 'slot1') AND dia_semana = 'JU';
SELECT is(
  (SELECT (public.planificacion_cambiar_frecuencia((SELECT id FROM t WHERE clave = 'visita-lu'), (SELECT id FROM t WHERE clave = 'tp-s1'), 'impar'))->>'ok'),
  'true', 'cambia la frecuencia de una visita propia');
SELECT is(
  (SELECT (public.planificacion_cambiar_frecuencia((SELECT id FROM t WHERE clave = 'visita-lu'), (SELECT id FROM t WHERE clave = 'tp-s2'), 'par'))->>'error'),
  'no_encontrada', 'un supervisor no cambia visitas ajenas');
SELECT is(
  (SELECT (public.planificacion_quitar((SELECT id FROM t WHERE clave = 'visita-ju'), (SELECT id FROM t WHERE clave = 'tp-s2')))->>'error'),
  'no_encontrada', 'un supervisor no quita visitas ajenas');
SELECT is(
  (SELECT (public.planificacion_quitar((SELECT id FROM t WHERE clave = 'visita-ju'), (SELECT id FROM t WHERE clave = 'tp-s1')))->>'ok'),
  'true', 'quita una visita propia');
SELECT is(
  (SELECT count(*)::int FROM public.planificacion_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tp-r1')),
  2, 'quedan las otras dos visitas de la ruta');

-- RF-09: trasladar a la misma zona conserva la planificación; a otra zona la elimina
SELECT is(
  (SELECT (public.ruta_trasladar((SELECT id FROM t WHERE clave = 'tp-r1'), (SELECT id FROM t WHERE clave = 'tpa')))->>'planificaciones_eliminadas'),
  '0', 'trasladar a la misma zona no elimina la planificación');
SELECT is(
  (SELECT (public.ruta_trasladar((SELECT id FROM t WHERE clave = 'tp-r1'), (SELECT id FROM t WHERE clave = 'tpc')))->>'planificaciones_eliminadas'),
  '2', 'trasladar a otra zona elimina la planificación vigente de la ruta (RF-09)');
SELECT is(
  (SELECT count(*)::int FROM public.planificacion_rutas WHERE id_ruta = (SELECT id FROM t WHERE clave = 'tp-r1')),
  0, 'la ruta trasladada queda sin planificación');

SELECT finish();
ROLLBACK;
