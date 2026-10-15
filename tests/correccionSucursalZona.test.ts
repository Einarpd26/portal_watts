import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoCorreccionSucursal,
  MENSAJE_CORRECCION_SUCURSAL,
} from '../src/utils/correccionSucursalZona.ts';
import { tieneAlcanceGlobal } from '../src/utils/sucursalScope.ts';

describe('estadoCorreccionSucursal (CU-04 A4)', () => {
  it('es editable con alcance global y zona sin rutas ni supervisor', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: true, totalRutas: 0, tieneSupervisor: false }),
      'editable'
    );
  });

  it('sin alcance global no se puede, aunque la zona esté vacía', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: false, totalRutas: 0, tieneSupervisor: false }),
      'sin_permiso'
    );
  });

  it('no revela el estado de la zona a quien no tiene permiso', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: false, totalRutas: 3, tieneSupervisor: true }),
      'sin_permiso'
    );
  });

  it('con rutas se bloquea', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: true, totalRutas: 1, tieneSupervisor: false }),
      'con_rutas'
    );
  });

  it('con supervisor y sin rutas se bloquea pidiendo quitarlo', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: true, totalRutas: 0, tieneSupervisor: true }),
      'con_supervisor'
    );
  });

  it('con rutas y supervisor prevalece el bloqueo de rutas, que no se resuelve en el sistema', () => {
    assert.equal(
      estadoCorreccionSucursal({ alcanceGlobal: true, totalRutas: 2, tieneSupervisor: true }),
      'con_rutas'
    );
  });

  it('el mensaje de permiso no nombra ningún rol', () => {
    assert.doesNotMatch(MENSAJE_CORRECCION_SUCURSAL.sin_permiso, /gerencia|fiscalizador|supervisor/i);
  });
});

describe('tieneAlcanceGlobal (RN-03)', () => {
  it('es verdadero con alcance GLOBAL', () => {
    assert.equal(tieneAlcanceGlobal({ alcance_tipo: 'GLOBAL', id_sucursal: null }), true);
  });

  it('es falso con alcance SUCURSAL, tenga o no sede asignada', () => {
    assert.equal(tieneAlcanceGlobal({ alcance_tipo: 'SUCURSAL', id_sucursal: 1 }), false);
    assert.equal(tieneAlcanceGlobal({ alcance_tipo: 'SUCURSAL', id_sucursal: null }), false);
  });
});
