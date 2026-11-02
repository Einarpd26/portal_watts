-- Pruebas de la base de datos del equipo de supervisor y los slots (CU-08). Ejecutar con: npx supabase test db
-- Reglas verificadas: ADR-003 (un supervisor por vendedor, el slot sobrevive a la reasignación y
-- al retiro del supervisor, «Reemplazar supervisor» traspasa equipo y slots).
BEGIN;
SELECT plan(19);

SELECT has_table('public', 'supervisor_vendedores', 'existe supervisor_vendedores');
SELECT has_table('public', 'vendedor_slots', 'existe vendedor_slots');

-- Datos de prueba: dos sucursales, tres supervisores, tres vendedores (uno en la otra sucursal)
CREATE TEMP TABLE t (clave text PRIMARY KEY, id bigint NOT NULL);

INSERT INTO public.sucursales (nombre_sucursal, descripcion) VALUES ('T-Norte', 'prueba'), ('T-Sur', 'prueba');
INSERT INTO t SELECT 'norte', id FROM public.sucursales WHERE nombre_sucursal = 'T-Norte';
INSERT INTO t SELECT 'sur', id FROM public.sucursales WHERE nombre_sucursal = 'T-Sur';

INSERT INTO public.personas (ci, nombres, apellidos)
VALUES ('T-S1', 'Sup', 'Uno'), ('T-S2', 'Sup', 'Dos'), ('T-S3', 'Sup', 'Sur'),
       ('T-V1', 'Ven', 'Uno'), ('T-V2', 'Ven', 'Dos'), ('T-V3', 'Ven', 'Sur');
INSERT INTO t SELECT lower(ci), id FROM public.personas WHERE ci LIKE 'T-%';

INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT p.id, (SELECT id FROM public.roles WHERE codigo = 'SUPERVISOR'), 'SUCURSAL',
       (SELECT id FROM t WHERE clave = CASE p.ci WHEN 'T-S3' THEN 'sur' ELSE 'norte' END)
  FROM public.personas p WHERE p.ci IN ('T-S1', 'T-S2', 'T-S3');

INSERT INTO public.asignaciones_laborales (id_persona, id_cargo, id_sucursal, estado)
SELECT p.id, (SELECT id FROM public.cargos WHERE nombre_cargo = 'Vendedor'),
       (SELECT id FROM t WHERE clave = CASE p.ci WHEN 'T-V3' THEN 'sur' ELSE 'norte' END), 'activo'
  FROM public.personas p WHERE p.ci IN ('T-V1', 'T-V2', 'T-V3');

-- 1. Asignación válida
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v1'), (SELECT id FROM t WHERE clave = 't-s1')))->>'ok'),
  'true', 'asigna un vendedor al supervisor de su misma sucursal');

-- 2. Un vendedor, un solo equipo (restricción de la tabla, más allá de la función)
SELECT throws_ok(
  $$INSERT INTO public.supervisor_vendedores (id_supervisor, id_vendedor)
    VALUES ((SELECT id FROM t WHERE clave = 't-s2'), (SELECT id FROM t WHERE clave = 't-v1'))$$,
  '23505', NULL, 'un vendedor no puede estar en dos equipos');

-- 3. Rechazos
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v2'), (SELECT id FROM t WHERE clave = 't-s3')))->>'error'),
  'sucursal_distinta', 'se rechaza vincular a personas de distinta sucursal');
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v2'), (SELECT id FROM t WHERE clave = 't-v1')))->>'error'),
  'supervisor_invalido', 'se rechaza como supervisor a quien no tiene el rol');
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-s1'), (SELECT id FROM t WHERE clave = 't-s2')))->>'error'),
  'vendedor_invalido', 'se rechaza como vendedor a quien no tiene cargo de vendedor');
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v2'), (SELECT id FROM t WHERE clave = 't-s1'),
                                          (SELECT id FROM t WHERE clave = 'sur')))->>'error'),
  'fuera_de_alcance', 'un Fiscalizador de otra sucursal no puede operar este equipo');

-- 4. Slots: el vendedor ocupa un slot de s1 con una posición; el slot sobrevive a la reasignación
INSERT INTO public.vendedor_slots (nombre, orden, id_supervisor, id_vendedor)
VALUES ('Slot 1', 0, (SELECT id FROM t WHERE clave = 't-s1'), (SELECT id FROM t WHERE clave = 't-v1')),
       ('Slot 2', 1, (SELECT id FROM t WHERE clave = 't-s1'), NULL);

SELECT throws_ok(
  $$INSERT INTO public.vendedor_slots (nombre, orden, id_supervisor, id_vendedor)
    VALUES ('Duplicado', 5, (SELECT id FROM t WHERE clave = 't-s1'), (SELECT id FROM t WHERE clave = 't-v1'))$$,
  '23505', NULL, 'un vendedor ocupa como máximo un slot');

SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v1'), (SELECT id FROM t WHERE clave = 't-s1')))->>'slots_liberados'),
  '0', 'reasignar al mismo supervisor no cambia nada');

-- Se pasa al vendedor a otro supervisor de la misma sucursal
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT (SELECT id FROM t WHERE clave = 't-s2'), (SELECT id FROM public.roles WHERE codigo = 'SUPERVISOR'), 'SUCURSAL',
       (SELECT id FROM t WHERE clave = 'norte')
 WHERE NOT EXISTS (SELECT 1 FROM public.usuario_roles WHERE id_persona = (SELECT id FROM t WHERE clave = 't-s2'));

SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v1'), (SELECT id FROM t WHERE clave = 't-s2')))->>'slots_liberados'),
  '1', 'cambiar de supervisor libera el slot que ocupaba el vendedor');
SELECT is(
  (SELECT count(*)::int FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 't-s1')),
  2, 'el slot no se borra al reasignar al vendedor');
SELECT is(
  (SELECT id_vendedor FROM public.vendedor_slots WHERE nombre = 'Slot 1' AND id_supervisor = (SELECT id FROM t WHERE clave = 't-s1')),
  NULL::bigint, 'el slot queda vacío');

-- 5. Quitar al vendedor del equipo
SELECT is(
  (SELECT (public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v1'), NULL))->>'ok'),
  'true', 'se puede quitar al vendedor del equipo');
SELECT is(
  (SELECT count(*)::int FROM public.supervisor_vendedores WHERE id_vendedor = (SELECT id FROM t WHERE clave = 't-v1')),
  0, 'el vendedor queda sin supervisor');

-- 6. Reemplazar supervisor: se arma el equipo de s1 (activo) y se prueba el rechazo
SELECT public.equipo_asignar_vendedor((SELECT id FROM t WHERE clave = 't-v1'), (SELECT id FROM t WHERE clave = 't-s1'));
UPDATE public.vendedor_slots SET id_vendedor = (SELECT id FROM t WHERE clave = 't-v1')
 WHERE nombre = 'Slot 1' AND id_supervisor = (SELECT id FROM t WHERE clave = 't-s1');

SELECT is(
  (SELECT (public.supervisor_reemplazar((SELECT id FROM t WHERE clave = 't-s1'), (SELECT id FROM t WHERE clave = 't-s2')))->>'error'),
  'supervisor_activo', 'no se reemplaza a un supervisor que sigue activo');

-- s1 se retira: se le revoca el acceso. No se toca nada de su equipo ni de sus slots
DELETE FROM public.usuario_roles WHERE id_persona = (SELECT id FROM t WHERE clave = 't-s1');
SELECT is(
  (SELECT count(*)::int FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 't-s1')),
  2, 'al retirarse el supervisor sus slots siguen a su nombre');

-- s2 ya tiene un slot propio: el traspaso no debe repetir el orden
INSERT INTO public.vendedor_slots (nombre, orden, id_supervisor) VALUES ('Propio', 0, (SELECT id FROM t WHERE clave = 't-s2'));

SELECT is(
  (SELECT (public.supervisor_reemplazar((SELECT id FROM t WHERE clave = 't-s1'), (SELECT id FROM t WHERE clave = 't-s2')))->>'ok'),
  'true', 'se reemplaza al supervisor inactivo por uno nuevo');
SELECT is(
  (SELECT count(*)::int FROM public.vendedor_slots
    WHERE id_supervisor = (SELECT id FROM t WHERE clave = 't-s2') AND nombre IN ('Slot 1', 'Slot 2', 'Propio')),
  3, 'los slots pasan al nuevo supervisor junto con el propio');

SELECT finish();
ROLLBACK;
