import test from "node:test";
import assert from "node:assert/strict";
import {
  interpretarResultadoSlot,
  MAX_NOMBRE_SLOT,
  parsearIdSlot,
  respuestaDeErrorSlot,
  validarAsignacionSlot,
  validarMovimiento,
  validarNuevoSlot,
  validarRenombre,
} from "../src/utils/slotValidation.ts";

test("parsearIdSlot: solo acepta enteros positivos en texto", () => {
  assert.equal(parsearIdSlot("5"), 5);
  for (const malo of ["0", "-1", "2.5", "x", undefined]) assert.equal(parsearIdSlot(malo), null);
  assert.equal(parsearIdSlot(["1"]), null);
});

test("nuevo slot: el nombre es opcional y se recorta", () => {
  assert.deepEqual(validarNuevoSlot({}), { ok: true, nombre: null });
  assert.deepEqual(validarNuevoSlot(undefined), { ok: true, nombre: null });
  assert.deepEqual(validarNuevoSlot({ nombre: "  Centro  " }), { ok: true, nombre: "Centro" });
  assert.deepEqual(validarNuevoSlot({ nombre: "   " }), { ok: true, nombre: null });
});

test("nuevo slot: rechaza un nombre que no es texto o que pasa el máximo", () => {
  assert.equal(validarNuevoSlot({ nombre: 7 }).ok, false);
  assert.equal(validarNuevoSlot({ nombre: "a".repeat(MAX_NOMBRE_SLOT + 1) }).ok, false);
  assert.equal(validarNuevoSlot({ nombre: "a".repeat(MAX_NOMBRE_SLOT) }).ok, true);
});

test("asignación a slot: un id, o null para dejarlo vacío", () => {
  assert.deepEqual(validarAsignacionSlot({ id_vendedor: 4 }), { ok: true, idVendedor: 4 });
  assert.deepEqual(validarAsignacionSlot({ id_vendedor: null }), { ok: true, idVendedor: null });
  for (const malo of [{}, null, { id_vendedor: "4" }, { id_vendedor: 0 }]) assert.equal(validarAsignacionSlot(malo).ok, false);
});

test("movimiento: solo arriba o abajo", () => {
  assert.deepEqual(validarMovimiento({ direccion: "arriba" }), { ok: true, direccion: "arriba" });
  assert.deepEqual(validarMovimiento({ direccion: "abajo" }), { ok: true, direccion: "abajo" });
  for (const malo of [{}, { direccion: "izquierda" }, null]) assert.equal(validarMovimiento(malo).ok, false);
});

test("resultado de la base: éxito, errores de negocio y respuestas inválidas", () => {
  assert.deepEqual(interpretarResultadoSlot({ ok: true, id: 3, movido: true }), { ok: true, datos: { id: 3, movido: true } });
  assert.deepEqual(interpretarResultadoSlot({ ok: false, error: "vendedor_ocupado" }), { ok: false, error: "vendedor_ocupado" });
  assert.deepEqual(interpretarResultadoSlot({ ok: false, error: "otra" }), { ok: false, error: "error" });
  assert.deepEqual(interpretarResultadoSlot("x"), { ok: false, error: "error" });
});

test("respuesta HTTP: ajeno es 404, ocupado es 409 y no supervisor es 403", () => {
  assert.equal(respuestaDeErrorSlot("no_encontrada").status, 404);
  assert.equal(respuestaDeErrorSlot("vendedor_ocupado").status, 409);
  assert.equal(respuestaDeErrorSlot("supervisor_invalido").status, 403);
  assert.equal(respuestaDeErrorSlot("vendedor_fuera_de_equipo").status, 400);
  assert.equal(respuestaDeErrorSlot("error").status, 500);
});

test("renombre: el nombre es obligatorio, se recorta y respeta el máximo", () => {
  assert.deepEqual(validarRenombre({ nombre: "  Centro  " }), { ok: true, nombre: "Centro" });
  for (const malo of [{}, null, { nombre: "" }, { nombre: "   " }, { nombre: 3 }, { nombre: "a".repeat(MAX_NOMBRE_SLOT + 1) }]) {
    assert.equal(validarRenombre(malo).ok, false);
  }
  assert.equal(validarRenombre({ nombre: "a".repeat(MAX_NOMBRE_SLOT) }).ok, true);
});

test("respuesta HTTP: un nombre inválido es 400", () => {
  assert.equal(respuestaDeErrorSlot("nombre_invalido").status, 400);
  assert.deepEqual(interpretarResultadoSlot({ ok: false, error: "nombre_invalido" }), { ok: false, error: "nombre_invalido" });
});
