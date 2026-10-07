import test from "node:test";
import assert from "node:assert/strict";
import { puedeOtorgarAcceso } from "../src/utils/grantAuthority.ts";

// Permisos de referencia (ADR-001 §C)
const PERMISOS_GERENCIA = [
  "cuentas:gestionar",
  "personal:gestionar",
  "territorio:gestionar",
  "planificacion:asignar",
  "mapa:consultar",
  "bitacora:consultar",
  "catalogos:gestionar",
];
const PERMISOS_FISCALIZADOR = [
  "cuentas:gestionar",
  "personal:gestionar",
  "territorio:gestionar",
  "mapa:consultar",
  "bitacora:consultar",
];
const PERMISOS_VENDEDOR = ["mapa:consultar"];

const gerencia = { alcance_tipo: "GLOBAL", id_sucursal: null, permisos: PERMISOS_GERENCIA };
const fiscalizadorScz = { alcance_tipo: "SUCURSAL", id_sucursal: 1, permisos: PERMISOS_FISCALIZADOR };

test("otorgamiento: Gerencia (global) puede conferir un rol global con todos los permisos", () => {
  const r = puedeOtorgarAcceso(gerencia, {
    alcance_tipo: "GLOBAL",
    id_sucursal: null,
    permisos: PERMISOS_GERENCIA,
  });
  assert.deepEqual(r, { ok: true });
});

test("otorgamiento: Gerencia puede conferir un rol de sucursal en cualquier sede", () => {
  const r = puedeOtorgarAcceso(gerencia, {
    alcance_tipo: "SUCURSAL",
    id_sucursal: 2,
    permisos: PERMISOS_FISCALIZADOR,
  });
  assert.deepEqual(r, { ok: true });
});

test("otorgamiento: Fiscalizador puede conferir un rol de su sede con permisos subconjunto", () => {
  const r = puedeOtorgarAcceso(fiscalizadorScz, {
    alcance_tipo: "SUCURSAL",
    id_sucursal: 1,
    permisos: PERMISOS_VENDEDOR,
  });
  assert.deepEqual(r, { ok: true });
});

test("escalada: Fiscalizador NO puede conferir el rol GERENCIA (catalogos:gestionar que no posee)", () => {
  const r = puedeOtorgarAcceso(fiscalizadorScz, {
    alcance_tipo: "SUCURSAL",
    id_sucursal: 1,
    permisos: PERMISOS_GERENCIA,
  });
  assert.deepEqual(r, { ok: false, motivo: "ESCALA_PRIVILEGIOS" });
});

test("escalada: Fiscalizador NO puede conferir un alcance GLOBAL", () => {
  const r = puedeOtorgarAcceso(fiscalizadorScz, {
    alcance_tipo: "GLOBAL",
    id_sucursal: null,
    permisos: PERMISOS_VENDEDOR,
  });
  assert.deepEqual(r, { ok: false, motivo: "FUERA_DE_SUCURSAL" });
});

test("alcance: Fiscalizador NO puede conferir acceso en otra sucursal", () => {
  const r = puedeOtorgarAcceso(fiscalizadorScz, {
    alcance_tipo: "SUCURSAL",
    id_sucursal: 2,
    permisos: PERMISOS_VENDEDOR,
  });
  assert.deepEqual(r, { ok: false, motivo: "FUERA_DE_SUCURSAL" });
});

test("alcance: un otorgante SUCURSAL sin sede asignada se deniega siempre", () => {
  const r = puedeOtorgarAcceso(
    { alcance_tipo: "SUCURSAL", id_sucursal: null, permisos: PERMISOS_FISCALIZADOR },
    { alcance_tipo: "SUCURSAL", id_sucursal: 1, permisos: PERMISOS_VENDEDOR }
  );
  assert.deepEqual(r, { ok: false, motivo: "FUERA_DE_SUCURSAL" });
});

test("coherencia: alcance SUCURSAL sin id_sucursal es incoherente (invariante ADR-001)", () => {
  const r = puedeOtorgarAcceso(gerencia, {
    alcance_tipo: "SUCURSAL",
    id_sucursal: null,
    permisos: PERMISOS_VENDEDOR,
  });
  assert.deepEqual(r, { ok: false, motivo: "ALCANCE_INVALIDO" });
});

test("coherencia: alcance GLOBAL con id_sucursal es incoherente (invariante ADR-001)", () => {
  const r = puedeOtorgarAcceso(gerencia, {
    alcance_tipo: "GLOBAL",
    id_sucursal: 1,
    permisos: PERMISOS_VENDEDOR,
  });
  assert.deepEqual(r, { ok: false, motivo: "ALCANCE_INVALIDO" });
});
