import test from "node:test";
import assert from "node:assert/strict";
import { rutasDuplicadasEnSemana } from "../src/utils/planificacionDuplicados.ts";

const v = (id_ruta: number, frecuencia: "semanal" | "impar" | "par" | "eventual") => ({ id_ruta, frecuencia });

test("duplicadas: una ruta planificada una sola vez no se marca", () => {
  assert.equal(rutasDuplicadasEnSemana([v(1, "semanal"), v(2, "semanal")]).size, 0);
});

test("duplicadas: semanal choca con cualquier otra visita no eventual de la ruta", () => {
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "semanal"), v(1, "semanal")])], [1]);
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "semanal"), v(1, "impar")])], [1]);
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "par"), v(1, "semanal")])], [1]);
});

test("duplicadas: impar + par conviven (par quincenal), pero la misma frecuencia repetida choca", () => {
  assert.equal(rutasDuplicadasEnSemana([v(1, "impar"), v(1, "par")]).size, 0);
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "impar"), v(1, "impar")])], [1]);
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "impar"), v(1, "par"), v(1, "par")])], [1]);
});

test("duplicadas: las visitas eventuales no cuentan, porque son la forma de resolver el conflicto", () => {
  assert.equal(rutasDuplicadasEnSemana([v(1, "semanal"), v(1, "eventual")]).size, 0);
  assert.equal(rutasDuplicadasEnSemana([v(1, "eventual"), v(1, "eventual")]).size, 0);
});

test("duplicadas: se evalúa por ruta, sin mezclar rutas distintas", () => {
  assert.deepEqual([...rutasDuplicadasEnSemana([v(1, "semanal"), v(2, "semanal"), v(1, "semanal")])], [1]);
});
