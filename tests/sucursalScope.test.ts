import test from "node:test";
import assert from "node:assert/strict";
import { alcanceDeListado, enAlcanceDeSucursal } from "../src/utils/sucursalScope.ts";

test("alcance: Gerencia (global) puede administrar a cualquier persona", () => {
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "GLOBAL", id_sucursal: null }, [2]), true);
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "GLOBAL", id_sucursal: null }, []), true);
});

test("alcance: un fiscalizador administra a personal de su propia sucursal", () => {
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, [1]), true);
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, [2, 1]), true);
});

test("alcance: un fiscalizador NO administra a personal de otra sucursal", () => {
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, [2]), false);
});

test("alcance: una persona sin roles en ninguna sucursal queda fuera del alcance del fiscalizador", () => {
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, []), false);
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, [null]), false);
});

test("alcance: un fiscalizador sin sucursal asignada se deniega siempre", () => {
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: null }, [1]), false);
  assert.equal(enAlcanceDeSucursal({ alcance_tipo: "SUCURSAL", id_sucursal: null }, [null]), false);
});

test("listado: alcance global no filtra, de sucursal filtra por la sede y sin sede se deniega", () => {
  assert.deepEqual(alcanceDeListado({ alcance_tipo: "GLOBAL", id_sucursal: null }), { tipo: "global" });
  assert.deepEqual(alcanceDeListado({ alcance_tipo: "SUCURSAL", id_sucursal: 2 }), { tipo: "sucursal", id_sucursal: 2 });
  assert.deepEqual(alcanceDeListado({ alcance_tipo: "SUCURSAL", id_sucursal: null }), { tipo: "denegado" });
});
