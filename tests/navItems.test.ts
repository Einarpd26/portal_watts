import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATION_GROUP, hasPermission } from '../src/components/layout/navItems.ts';

const planificacion = OPERATION_GROUP.find((i) => i.href === '/planificacion')!;
const PERMISOS_SUPERVISOR = ['planificacion:asignar', 'mapa:consultar', 'rutas:gestionar'];

test('Planificacion solo aparece para el supervisor', () => {
  assert.equal(hasPermission(PERMISOS_SUPERVISOR, planificacion, ['SUPERVISOR']), true);
});

test('Gerencia tiene el permiso de planificar pero no equipo propio: no ve Planificacion', () => {
  assert.equal(hasPermission(PERMISOS_SUPERVISOR, planificacion, ['GERENCIA_COMERCIAL']), false);
  assert.equal(hasPermission(PERMISOS_SUPERVISOR, planificacion), false);
});

test('un item sin restriccion de rol no la exige', () => {
  const mapa = OPERATION_GROUP.find((i) => i.href === '/mapa')!;
  assert.equal(hasPermission(['mapa:consultar'], mapa), true);
});
