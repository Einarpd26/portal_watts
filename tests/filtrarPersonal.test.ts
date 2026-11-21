import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FILTROS_PERSONAL_INICIALES, filtrarPersonal, hayFiltrosActivos } from '../src/utils/filtrarPersonal.ts';
import { colorDeAvatar, iniciales } from '../src/utils/avatar.ts';
import type { PersonaConAsignacion } from '../src/types/index.ts';

const persona = (id: number, extra: Partial<PersonaConAsignacion> = {}, sucursal = 1, cargo = 10): PersonaConAsignacion => ({
  id,
  ci: `100${id}`,
  nombres: 'Daniel',
  apellidos: 'Acosta Roca',
  telefono: null,
  auth_user_id: null,
  fecha_baja: null,
  asignacion: { id, estado: 'activa', fecha_inicio: '2026-01-01', cargo_id: cargo, cargo_nombre: 'Supervisor', sucursal_id: sucursal, sucursal_nombre: 'Santa Cruz' },
  ...extra,
});

const PERSONAS = [
  persona(1, { nombres: 'Daniel', apellidos: 'Acosta Roca', auth_user_id: 'u1' }),
  persona(2, { nombres: 'María José', apellidos: 'García' }, 2, 11),
  persona(3, { nombres: 'Pedro', apellidos: 'Salvatierra' }, 1, 11),
];
const ids = (f: Partial<typeof FILTROS_PERSONAL_INICIALES>) => filtrarPersonal(PERSONAS, { ...FILTROS_PERSONAL_INICIALES, ...f }).map((p) => p.id);

test('sin filtros salen todas', () => {
  assert.deepEqual(ids({}), [1, 2, 3]);
  assert.equal(hayFiltrosActivos(FILTROS_PERSONAL_INICIALES), false);
});

test('la busqueda ignora tildes y mayusculas, y encuentra las palabras en cualquier orden', () => {
  assert.deepEqual(ids({ busqueda: 'garcia' }), [2]);
  assert.deepEqual(ids({ busqueda: 'MARIA JOSE' }), [2]);
  assert.deepEqual(ids({ busqueda: 'acosta daniel' }), [1]);
});

test('la busqueda tambien encuentra por CI', () => {
  assert.deepEqual(ids({ busqueda: '1003' }), [3]);
});

test('filtra por sucursal, por cargo y por cuenta', () => {
  assert.deepEqual(ids({ idSucursal: '2' }), [2]);
  assert.deepEqual(ids({ idCargo: '11' }), [2, 3]);
  assert.deepEqual(ids({ cuenta: 'con' }), [1]);
  assert.deepEqual(ids({ cuenta: 'sin' }), [2, 3]);
});

test('los filtros se combinan', () => {
  assert.deepEqual(ids({ idCargo: '11', idSucursal: '1' }), [3]);
  assert.deepEqual(ids({ cuenta: 'con', busqueda: 'pedro' }), []);
  assert.equal(hayFiltrosActivos({ ...FILTROS_PERSONAL_INICIALES, cuenta: 'sin' }), true);
});

test('iniciales: primer nombre y primer apellido; sin datos, un signo de pregunta', () => {
  assert.equal(iniciales('Daniel', 'Acosta Roca'), 'DA');
  assert.equal(iniciales('  maría josé ', 'garcía'), 'MG');
  assert.equal(iniciales('', ''), '?');
});

test('el color del avatar es siempre el mismo para el mismo nombre', () => {
  assert.equal(colorDeAvatar('Daniel Acosta'), colorDeAvatar('Daniel Acosta'));
  assert.match(colorDeAvatar('Pedro Salvatierra'), /^bg-\w+-100 text-\w+-700$/);
});
