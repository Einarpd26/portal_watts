import test from "node:test";
import assert from "node:assert/strict";
import { DIAS_ORDEN } from "../src/utils/diasSemana.ts";
import { FRECUENCIAS } from "../src/utils/frecuencias.ts";
import {
  DIAS_ACEPTADOS,
  FRECUENCIAS_ACEPTADAS,
  interpretarResultadoVisita,
  parsearIdVisita,
  respuestaDeErrorVisita,
  validarCambioFrecuencia,
  validarNuevaVisita,
} from "../src/utils/visitaValidation.ts";

test("parsearIdVisita: solo enteros positivos en texto", () => {
  assert.equal(parsearIdVisita("8"), 8);
  for (const malo of ["0", "-2", "1.5", "x", undefined]) assert.equal(parsearIdVisita(malo), null);
});

test("nueva visita: slot, ruta y día de lunes a sábado; la frecuencia por defecto es semanal", () => {
  assert.deepEqual(validarNuevaVisita({ id_slot: 1, id_ruta: 2, dia: "LU" }), {
    ok: true, idSlot: 1, idRuta: 2, dia: "LU", frecuencia: "semanal",
  });
  assert.deepEqual(validarNuevaVisita({ id_slot: 1, id_ruta: 2, dia: "SA", frecuencia: "par" }), {
    ok: true, idSlot: 1, idRuta: 2, dia: "SA", frecuencia: "par",
  });
});

test("nueva visita: rechaza datos faltantes, domingo y frecuencias desconocidas", () => {
  for (const malo of [
    undefined,
    {},
    { id_slot: 1, id_ruta: 2 },
    { id_slot: 0, id_ruta: 2, dia: "LU" },
    { id_slot: 1, id_ruta: "2", dia: "LU" },
    { id_slot: 1, id_ruta: 2, dia: "DO" },
    { id_slot: 1, id_ruta: 2, dia: "LU", frecuencia: "diaria" },
  ]) {
    assert.equal(validarNuevaVisita(malo).ok, false);
  }
});

test("cambio de frecuencia: solo valores del catálogo", () => {
  assert.deepEqual(validarCambioFrecuencia({ frecuencia: "eventual" }), { ok: true, frecuencia: "eventual" });
  for (const malo of [{}, null, { frecuencia: "diaria" }, { frecuencia: 3 }]) assert.equal(validarCambioFrecuencia(malo).ok, false);
});

test("resultado de la base: éxito con id, errores de negocio y respuestas inválidas", () => {
  assert.deepEqual(interpretarResultadoVisita({ ok: true, id: 9 }), { ok: true, id: 9 });
  assert.deepEqual(interpretarResultadoVisita({ ok: false, error: "ruta_fuera_de_zona" }), { ok: false, error: "ruta_fuera_de_zona" });
  assert.deepEqual(interpretarResultadoVisita({ ok: false, error: "otra" }), { ok: false, error: "error" });
  assert.deepEqual(interpretarResultadoVisita(null), { ok: false, error: "error" });
});

test("respuesta HTTP: fuera de zona es 403, ya planificada es 409 y ajena es 404", () => {
  assert.equal(respuestaDeErrorVisita("ruta_fuera_de_zona").status, 403);
  assert.equal(respuestaDeErrorVisita("ya_planificada").status, 409);
  assert.equal(respuestaDeErrorVisita("no_encontrada").status, 404);
  assert.equal(respuestaDeErrorVisita("dia_invalido").status, 400);
  assert.equal(respuestaDeErrorVisita("error").status, 500);
});

test("sincronía: los días y frecuencias que acepta la validación son los del catálogo de la interfaz", () => {
  assert.deepEqual([...DIAS_ACEPTADOS], [...DIAS_ORDEN]);
  assert.deepEqual([...FRECUENCIAS_ACEPTADAS], [...FRECUENCIAS]);
});
