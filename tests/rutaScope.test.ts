import test from "node:test";
import assert from "node:assert/strict";
import { alcanceDeRutas, type RolDeAlcance } from "../src/utils/rutaScope.ts";

const rol = (codigo: string, alcance_tipo: string, id_sucursal: number | null, permisos = ["rutas:gestionar"]): RolDeAlcance => ({
  codigo, alcance_tipo, id_sucursal, permisos,
});

test("rutas: un supervisor queda acotado a sus zonas asignadas", () => {
  assert.deepEqual(alcanceDeRutas({ id_persona: 7, roles: [rol("SUPERVISOR", "SUCURSAL", 1)] }), { tipo: "supervisor", id_persona: 7 });
});

test("rutas: Gerencia con alcance global no tiene restricción", () => {
  assert.deepEqual(alcanceDeRutas({ id_persona: 1, roles: [rol("GERENCIA_COMERCIAL", "GLOBAL", null)] }), { tipo: "global" });
});

test("rutas: un rol de gestión con alcance de sucursal se acota a su sede", () => {
  assert.deepEqual(alcanceDeRutas({ id_persona: 2, roles: [rol("FISCALIZADOR", "SUCURSAL", 2)] }), { tipo: "sucursales", ids: [2] });
});

test("rutas: sin sucursal asignada se deniega", () => {
  assert.deepEqual(alcanceDeRutas({ id_persona: 2, roles: [rol("FISCALIZADOR", "SUCURSAL", null)] }), { tipo: "denegado" });
});

test("rutas: sin el permiso se deniega aunque tenga otros roles", () => {
  assert.deepEqual(alcanceDeRutas({ id_persona: 3, roles: [rol("VENDEDOR", "SUCURSAL", 1, ["mapa:consultar"])] }), { tipo: "denegado" });
});

test("rutas: el rol de gestión prevalece sobre el de supervisor y el global sobre el de sucursal", () => {
  const roles = [rol("SUPERVISOR", "SUCURSAL", 1), rol("FISCALIZADOR", "SUCURSAL", 1), rol("GERENCIA_COMERCIAL", "GLOBAL", null)];
  assert.deepEqual(alcanceDeRutas({ id_persona: 4, roles: roles.slice(0, 2) }), { tipo: "sucursales", ids: [1] });
  assert.deepEqual(alcanceDeRutas({ id_persona: 4, roles }), { tipo: "global" });
});
