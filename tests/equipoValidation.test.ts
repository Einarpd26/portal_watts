import test from "node:test";
import assert from "node:assert/strict";
import {
  interpretarResultadoEquipo,
  parsearId,
  respuestaDeError,
  validarAsignacion,
  validarReemplazo,
} from "../src/utils/equipoValidation.ts";

test("parsearId: solo acepta enteros positivos en texto", () => {
  assert.equal(parsearId("12"), 12);
  assert.equal(parsearId("0"), null);
  assert.equal(parsearId("-3"), null);
  assert.equal(parsearId("1.5"), null);
  assert.equal(parsearId("abc"), null);
  assert.equal(parsearId(undefined), null);
  assert.equal(parsearId(["1", "2"]), null);
});

test("asignación: id_supervisor es un id o null para quitar", () => {
  assert.deepEqual(validarAsignacion({ id_supervisor: 7 }), { ok: true, idSupervisor: 7 });
  assert.deepEqual(validarAsignacion({ id_supervisor: null }), { ok: true, idSupervisor: null });
});

test("asignación: rechaza un cuerpo sin id_supervisor o con valores inválidos", () => {
  for (const cuerpo of [{}, null, undefined, { id_supervisor: "7" }, { id_supervisor: 0 }, { id_supervisor: 1.5 }]) {
    assert.equal(validarAsignacion(cuerpo).ok, false);
  }
});

test("reemplazo: exige dos ids distintos", () => {
  assert.deepEqual(validarReemplazo({ id_inactivo: 3, id_nuevo: 9 }), { ok: true, idInactivo: 3, idNuevo: 9 });
  assert.equal(validarReemplazo({ id_inactivo: 3, id_nuevo: 3 }).ok, false);
  assert.equal(validarReemplazo({ id_inactivo: 3 }).ok, false);
  assert.equal(validarReemplazo({ id_inactivo: "3", id_nuevo: 9 }).ok, false);
  assert.equal(validarReemplazo(undefined).ok, false);
});

test("resultado de la base: interpreta el éxito con sus conteos", () => {
  assert.deepEqual(interpretarResultadoEquipo({ ok: true, anterior: 4, slots_liberados: 2 }), {
    ok: true,
    datos: { anterior: 4, slots_liberados: 2, vendedores: undefined, slots: undefined },
  });
  const sinAnterior = interpretarResultadoEquipo({ ok: true, anterior: null, slots_liberados: 0 });
  assert.equal(sinAnterior.ok && sinAnterior.datos.anterior, null);
});

test("resultado de la base: traduce los errores de negocio y trata lo desconocido como error", () => {
  assert.deepEqual(interpretarResultadoEquipo({ ok: false, error: "sucursal_distinta" }), { ok: false, error: "sucursal_distinta" });
  assert.deepEqual(interpretarResultadoEquipo({ ok: false, error: "inventado" }), { ok: false, error: "error" });
  assert.deepEqual(interpretarResultadoEquipo(null), { ok: false, error: "error" });
  assert.deepEqual(interpretarResultadoEquipo([]), { ok: false, error: "error" });
});

test("respuesta HTTP: fuera de alcance es 403 y un supervisor activo es 409", () => {
  assert.equal(respuestaDeError("fuera_de_alcance").status, 403);
  assert.equal(respuestaDeError("supervisor_activo").status, 409);
  assert.equal(respuestaDeError("sin_equipo").status, 409);
  assert.equal(respuestaDeError("sucursal_distinta").status, 400);
  assert.equal(respuestaDeError("error").status, 500);
});
