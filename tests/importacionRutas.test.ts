import test from "node:test";
import assert from "node:assert/strict";
import { estadoPorIndice, filtrarFilas, tamanoLegible } from "../src/utils/importacionRutas.ts";
import type { FilaInforme } from "../src/utils/rutaInforme.ts";

const fila = (posicion: number, codigo: string | null, zona: string | null, estado: FilaInforme["estado"]): FilaInforme => ({
  posicion,
  codigo_ruta: codigo,
  codigo_zona: zona,
  estado,
  tipo: null,
  problema: "",
  detalle: "",
  en_conflicto: "",
  area_comun_m2: null,
  pct_de_esta_ruta: null,
  pct_de_la_otra: null,
  accion: "",
});

const filas = [fila(1, "R-001", "Z1", "nueva"), fila(2, "R-002", "Z2", "rechazada"), fila(3, null, null, "rechazada"), fila(4, "R-010", "Z1", "actualizada")];

test("filtrarFilas: sin filtro devuelve todo", () => {
  assert.equal(filtrarFilas(filas, "todas", "").length, 4);
});

test("filtrarFilas: filtra por estado", () => {
  assert.deepEqual(filtrarFilas(filas, "rechazada", "").map((f) => f.posicion), [2, 3]);
});

test("filtrarFilas: busca por código de ruta o de zona sin distinguir mayúsculas", () => {
  assert.deepEqual(filtrarFilas(filas, "todas", "r-00").map((f) => f.posicion), [1, 2]);
  assert.deepEqual(filtrarFilas(filas, "todas", "z1").map((f) => f.posicion), [1, 4]);
});

test("filtrarFilas: combina estado y búsqueda, y tolera filas sin código", () => {
  assert.deepEqual(filtrarFilas(filas, "rechazada", "z2").map((f) => f.posicion), [2]);
  assert.equal(filtrarFilas(filas, "todas", "inexistente").length, 0);
});

test("estadoPorIndice: la posición del informe (desde 1) pasa a índice del archivo (desde 0)", () => {
  const m = estadoPorIndice(filas);
  assert.equal(m.get(0), "nueva");
  assert.equal(m.get(3), "actualizada");
  assert.equal(m.get(4), undefined);
});

test("tamanoLegible", () => {
  assert.equal(tamanoLegible(500), "1 KB");
  assert.equal(tamanoLegible(4 * 1024 * 1024), "4,0 MB");
  assert.equal(tamanoLegible(5.5 * 1024 * 1024), "5,5 MB");
});
