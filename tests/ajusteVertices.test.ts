import test from "node:test";
import assert from "node:assert/strict";
import { verticeMasCercano, verticesDeRutas, type Proyectar } from "../src/utils/ajusteVertices.ts";

const caja = (x0: number, y0: number, x1: number, y1: number) => ({
  type: "Polygon" as const,
  coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
});
// Proyección de prueba: 1 grado = 1000 píxeles
const proyectar: Proyectar = (lng, lat) => ({ x: lng * 1000, y: -lat * 1000 });

test("ajuste: junta los vértices sin repetir los compartidos ni el de cierre", () => {
  const v = verticesDeRutas([caja(0, 0, 1, 1), caja(1, 0, 2, 1)]);
  assert.equal(v.length, 6);
});

test("ajuste: se pega al vértice vecino dentro del radio", () => {
  const v = verticesDeRutas([caja(0, 0, 1, 1)]);
  assert.deepEqual(verticeMasCercano({ x: 1005, y: -1003 }, v, proyectar, 12), [1, 1]);
});

test("ajuste: fuera del radio no se pega", () => {
  const v = verticesDeRutas([caja(0, 0, 1, 1)]);
  assert.equal(verticeMasCercano({ x: 1020, y: -1000 }, v, proyectar, 12), undefined);
});

test("ajuste: elige el más cercano cuando hay varios dentro del radio", () => {
  const v: [number, number][] = [[0, 0], [0.008, 0]];
  assert.deepEqual(verticeMasCercano({ x: 7, y: 0 }, v, proyectar, 12), [0.008, 0]);
});

test("ajuste: devuelve las coordenadas exactas del vecino (no las del cursor)", () => {
  const v = verticesDeRutas([caja(-63.17, -17.79, -63.16, -17.78)]);
  const r = verticeMasCercano(proyectar(-63.16 + 0.000004, -17.79), v, proyectar, 12);
  assert.deepEqual(r, [-63.16, -17.79]);
});
