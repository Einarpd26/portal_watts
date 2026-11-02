import test from "node:test";
import assert from "node:assert/strict";
import {
  datosArrastreVisita,
  datosCeldaDestino,
  idCeldaPlanificacion,
  puedeSoltarVisita,
} from "../src/utils/planificacionMover.ts";
import { validarMovimientoVisita } from "../src/utils/visitaValidation.ts";

const origen = { idVisita: 1, idSlot: 10, dia: "LU", idRuta: 5, frecuencia: "semanal" } as const;

test("soltar: no se puede soltar en la misma celda", () => {
  assert.equal(puedeSoltarVisita({ idSlot: 10, dia: "LU", visitas: [] }, origen), false);
});

test("soltar: otro día o otro slot vacío es válido", () => {
  assert.equal(puedeSoltarVisita({ idSlot: 10, dia: "JU", visitas: [] }, origen), true);
  assert.equal(puedeSoltarVisita({ idSlot: 11, dia: "LU", visitas: [] }, origen), true);
});

test("soltar: se rechaza si el destino ya tiene la misma ruta con la misma frecuencia", () => {
  const destino = { idSlot: 11, dia: "MA", visitas: [{ id_ruta: 5, frecuencia: "semanal" }] } as const;
  assert.equal(puedeSoltarVisita(destino, origen), false);
});

test("soltar: la misma ruta con otra frecuencia o una ruta distinta sí se acepta", () => {
  assert.equal(puedeSoltarVisita({ idSlot: 11, dia: "MA", visitas: [{ id_ruta: 5, frecuencia: "impar" }] }, origen), true);
  assert.equal(puedeSoltarVisita({ idSlot: 11, dia: "MA", visitas: [{ id_ruta: 6, frecuencia: "semanal" }] }, origen), true);
});

test("datos de dnd: se reconocen por su tipo y se ignoran los demás", () => {
  assert.deepEqual(datosArrastreVisita({ type: "visita", origen })?.origen, origen);
  assert.equal(datosArrastreVisita({ type: "celda" }), null);
  assert.equal(datosArrastreVisita(null), null);
  assert.equal(datosCeldaDestino({ type: "visita" }), null);
  assert.equal(idCeldaPlanificacion(3, "VI"), "celda-plan:3:VI");
});

test("movimiento: slot de destino y día de lunes a sábado", () => {
  assert.deepEqual(validarMovimientoVisita({ id_slot: 4, dia: "SA" }), { ok: true, idSlot: 4, dia: "SA" });
  for (const malo of [undefined, {}, { id_slot: 4 }, { id_slot: 0, dia: "LU" }, { id_slot: 4, dia: "DO" }, { id_slot: "4", dia: "LU" }]) {
    assert.equal(validarMovimientoVisita(malo).ok, false);
  }
});
