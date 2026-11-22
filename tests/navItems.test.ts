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

const consulta = OPERATION_GROUP.find((i) => i.href === '/consulta-planificacion')!;
const PERMISOS_FISCALIZADOR = ['mapa:consultar', 'rutas:gestionar'];

test('Consulta es de supervision: Gerencia y Fiscalizador la ven, el Supervisor y el Vendedor no', () => {
  assert.equal(hasPermission(PERMISOS_FISCALIZADOR, consulta, ['FISCALIZADOR']), true);
  assert.equal(hasPermission(PERMISOS_FISCALIZADOR, consulta, ['GERENCIA_COMERCIAL']), true);
  assert.equal(hasPermission(PERMISOS_SUPERVISOR, consulta, ['SUPERVISOR']), false);
  assert.equal(hasPermission(['mapa:consultar'], consulta, ['VENDEDOR']), false);
});

test('Consulta: quien tiene el rol de supervision y ademas el de Supervisor la conserva', () => {
  assert.equal(hasPermission(PERMISOS_SUPERVISOR, consulta, ['SUPERVISOR', 'FISCALIZADOR']), true);
});
