import { test } from 'node:test';
import assert from 'node:assert/strict';
import { puedeConsultarPlanificacion } from '../src/utils/clientesScope.ts';

const rol = (codigo: string, permisos: string[] = ['mapa:consultar']) => ({ codigo, permisos, alcance_tipo: 'SUCURSAL', id_sucursal: 1 });

test('consulta de planificacion: Gerencia y Fiscalizador pueden', () => {
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('GERENCIA_COMERCIAL')] }), true);
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('FISCALIZADOR')] }), true);
});

test('consulta de planificacion: el Supervisor y el Vendedor no', () => {
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('SUPERVISOR')] }), false);
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('VENDEDOR')] }), false);
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('SUPERVISOR'), rol('VENDEDOR')] }), false);
});

test('consulta de planificacion: con un rol de supervision y otro de Supervisor, puede', () => {
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('SUPERVISOR'), rol('FISCALIZADOR')] }), true);
});

test('consulta de planificacion: sin el permiso de consultar el mapa no se puede, aunque el rol sea de supervision', () => {
  assert.equal(puedeConsultarPlanificacion({ roles: [rol('FISCALIZADOR', [])] }), false);
  assert.equal(puedeConsultarPlanificacion({ roles: [] }), false);
});
