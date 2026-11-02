-- Pruebas de la gestión de slots por el Supervisor (CU-08). Ejecutar con: npx supabase test db
-- Reglas verificadas: ADR-003 (solo slots propios, solo vendedores del equipo, un vendedor un slot, orden sin huecos).
BEGIN;
SELECT plan(18);

CREATE TEMP TABLE t (clave text PRIMARY KEY, id bigint NOT NULL);

INSERT INTO public.sucursales (nombre_sucursal, descripcion) VALUES ('T-Slots', 'prueba');
INSERT INTO public.personas (ci, nombres, apellidos)
VALUES ('TS-S1', 'Sup', 'Uno'), ('TS-S2', 'Sup', 'Dos'), ('TS-V1', 'Ven', 'Uno'), ('TS-V2', 'Ven', 'Dos'), ('TS-V3', 'Ven', 'Tres');
INSERT INTO t SELECT lower(ci), id FROM public.personas WHERE ci LIKE 'TS-%';

INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT p.id, (SELECT id FROM public.roles WHERE codigo = 'SUPERVISOR'), 'SUCURSAL',
       (SELECT id FROM public.sucursales WHERE nombre_sucursal = 'T-Slots')
  FROM public.personas p WHERE p.ci IN ('TS-S1', 'TS-S2');

-- Equipo de s1: v1 y v2; v3 es de s2
INSERT INTO public.supervisor_vendedores (id_supervisor, id_vendedor)
VALUES ((SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v1')),
       ((SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v2')),
       ((SELECT id FROM t WHERE clave = 'ts-s2'), (SELECT id FROM t WHERE clave = 'ts-v3'));

-- Crear: orden consecutivo y nombre por defecto
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'ts-s1'));
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'ts-s1'), '  Centro  ');
SELECT public.slot_crear((SELECT id FROM t WHERE clave = 'ts-s1'));
SELECT is(
  (SELECT string_agg(nombre || ':' || orden, ',' ORDER BY orden) FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1')),
  'Slot 1:0,Centro:1,Slot 3:2', 'los slots se crean al final, con nombre por defecto y recortado');
SELECT is(
  (SELECT (public.slot_crear((SELECT id FROM t WHERE clave = 'ts-v1')))->>'error'),
  'supervisor_invalido', 'solo un supervisor activo crea slots');

-- Asignar: del equipo sí; de otro equipo no; ocupado no
INSERT INTO t SELECT 'slot-a', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1') AND orden = 0;
INSERT INTO t SELECT 'slot-b', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1') AND orden = 1;
INSERT INTO t SELECT 'slot-c', id FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1') AND orden = 2;

SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v1')))->>'ok'),
  'true', 'asigna un vendedor del equipo a su slot');
SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-b'), (SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v3')))->>'error'),
  'vendedor_fuera_de_equipo', 'rechaza a un vendedor de otro equipo (CU-08 A1)');
SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-b'), (SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v1')))->>'error'),
  'vendedor_ocupado', 'rechaza a un vendedor que ya ocupa otro slot');
SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s2'), (SELECT id FROM t WHERE clave = 'ts-v3')))->>'error'),
  'no_encontrada', 'un supervisor no opera sobre slots ajenos');
SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1')))->>'ok'),
  'true', 'deja el slot vacío si no se indica vendedor');
SELECT is(
  (SELECT id_vendedor FROM public.vendedor_slots WHERE id = (SELECT id FROM t WHERE clave = 'slot-a')),
  NULL::bigint, 'el slot queda vacío y sigue existiendo');

-- Mover: sube, no pasa del extremo y renumera sin huecos
SELECT public.slot_mover((SELECT id FROM t WHERE clave = 'slot-c'), (SELECT id FROM t WHERE clave = 'ts-s1'), 'arriba');
SELECT is(
  (SELECT string_agg(nombre, ',' ORDER BY orden) FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1')),
  'Slot 1,Slot 3,Centro', 'subir un slot lo intercambia con el anterior');
SELECT is(
  (SELECT (public.slot_mover((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), 'arriba'))->>'movido'),
  'false', 'el primer slot no sube más');

-- Orden con huecos y empates (como tras un reemplazo de supervisor): se renumera
UPDATE public.vendedor_slots SET orden = 7 WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1');
SELECT public.slot_mover((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), 'abajo');
SELECT is(
  (SELECT string_agg(orden::text, ',' ORDER BY orden) FROM public.vendedor_slots WHERE id_supervisor = (SELECT id FROM t WHERE clave = 'ts-s1')),
  '0,1,2', 'el orden se renumera sin huecos ni empates');

-- Renombrar: solo slots propios, con nombre obligatorio y de hasta 50 caracteres
SELECT is(
  (SELECT (public.slot_renombrar((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), '  Zona Centro  '))->>'ok'),
  'true', 'renombra un slot propio');
SELECT is(
  (SELECT nombre FROM public.vendedor_slots WHERE id = (SELECT id FROM t WHERE clave = 'slot-a')),
  'Zona Centro', 'el nombre se guarda recortado');
SELECT is(
  (SELECT (public.slot_renombrar((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), '   '))->>'error'),
  'nombre_invalido', 'rechaza un nombre vacío');
SELECT is(
  (SELECT (public.slot_renombrar((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s2'), 'Ajeno'))->>'error'),
  'no_encontrada', 'un supervisor no renombra slots ajenos');

-- Eliminar: el vendedor queda libre y puede ocupar otro slot
SELECT public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-b'), (SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v1'));
SELECT is(
  (SELECT (public.slot_eliminar((SELECT id FROM t WHERE clave = 'slot-b'), (SELECT id FROM t WHERE clave = 'ts-s2')))->>'error'),
  'no_encontrada', 'un supervisor no elimina slots ajenos');
SELECT is(
  (SELECT (public.slot_eliminar((SELECT id FROM t WHERE clave = 'slot-b'), (SELECT id FROM t WHERE clave = 'ts-s1')))->>'ok'),
  'true', 'elimina un slot propio con vendedor');
SELECT is(
  (SELECT (public.slot_asignar_vendedor((SELECT id FROM t WHERE clave = 'slot-a'), (SELECT id FROM t WHERE clave = 'ts-s1'), (SELECT id FROM t WHERE clave = 'ts-v1')))->>'ok'),
  'true', 'el vendedor del slot eliminado queda libre para otro slot');

SELECT finish();
ROLLBACK;
