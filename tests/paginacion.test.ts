import test from "node:test";
import assert from "node:assert/strict";
import { entradasDePaginacion } from "../src/utils/paginacion.ts";

test("pocas páginas: se muestran todas", () => {
  assert.deepEqual(entradasDePaginacion(1, 1), [1]);
  assert.deepEqual(entradasDePaginacion(3, 7), [1, 2, 3, 4, 5, 6, 7]);
});

test("muchas páginas: primera, ventana alrededor de la actual, saltos y última", () => {
  assert.deepEqual(entradasDePaginacion(10, 20), [1, "puntos", 8, 9, 10, 11, 12, "puntos", 20]);
});

test("en los extremos la ventana conserva su tamaño", () => {
  assert.deepEqual(entradasDePaginacion(1, 20), [1, 2, 3, 4, 5, "puntos", 20]);
  assert.deepEqual(entradasDePaginacion(20, 20), [1, "puntos", 16, 17, 18, 19, 20]);
});

test("un salto de una sola página no lleva puntos", () => {
  assert.deepEqual(entradasDePaginacion(5, 20), [1, 2, 3, 4, 5, 6, 7, "puntos", 20]);
});

test("el mismo criterio vale en el extremo final", () => {
  assert.deepEqual(entradasDePaginacion(16, 20), [1, "puntos", 14, 15, 16, 17, 18, 19, 20]);
});

import { paginaValida, paginar, totalDePaginas } from "../src/utils/paginacion.ts";

test("total de páginas: con ninguno hay una sola, y se redondea hacia arriba", () => {
  assert.equal(totalDePaginas(0, 10), 1);
  assert.equal(totalDePaginas(10, 10), 1);
  assert.equal(totalDePaginas(11, 10), 2);
});

test("página válida: se lleva al rango que existe", () => {
  assert.equal(paginaValida(0, 5), 1);
  assert.equal(paginaValida(9, 5), 5);
  assert.equal(paginaValida(3, 5), 3);
});

test("paginar: los elementos de cada página, y la última puede ser más corta", () => {
  const todos = [1, 2, 3, 4, 5, 6, 7];
  assert.deepEqual(paginar(todos, 1, 3), [1, 2, 3]);
  assert.deepEqual(paginar(todos, 3, 3), [7]);
  assert.deepEqual(paginar([], 1, 3), []);
});
