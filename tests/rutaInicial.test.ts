import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rutaInicialPorRol } from '../src/utils/rutaInicial.ts';

test('cada rol cae en su pantalla de trabajo', () => {
  assert.equal(rutaInicialPorRol('GERENCIA_COMERCIAL'), '/admin/usuarios');
  assert.equal(rutaInicialPorRol('FISCALIZADOR'), '/admin/usuarios');
  assert.equal(rutaInicialPorRol('SUPERVISOR'), '/planificacion');
  assert.equal(rutaInicialPorRol('VENDEDOR'), '/mapa');
});

test('una cuenta sin rol va a la pantalla de sin acceso', () => {
  assert.equal(rutaInicialPorRol('SIN_ROL'), '/sin-acceso');
  assert.equal(rutaInicialPorRol('OTRO'), '/sin-acceso');
});
