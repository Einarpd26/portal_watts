import test from "node:test";
import assert from "node:assert/strict";
import { coloresPorZona, PALETA_ZONAS, COLOR_CONFLICTO, COLOR_INVALIDO, COLOR_PROPUESTA } from "../src/utils/coloresTerritorio.ts";

test("colores: cada zona recibe un color según su código, sin importar el orden de llegada", () => {
  const a = coloresPorZona([{ id: 3, codigo_zona: "ZN" }, { id: 2, codigo_zona: "ZC" }]);
  const b = coloresPorZona([{ id: 2, codigo_zona: "ZC" }, { id: 3, codigo_zona: "ZN" }]);
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort());
  assert.equal(a.get(2), PALETA_ZONAS[0]);
  assert.equal(a.get(3), PALETA_ZONAS[1]);
});

test("colores: con más zonas que colores, la paleta se repite", () => {
  const zonas = Array.from({ length: PALETA_ZONAS.length + 1 }, (_, i) => ({ id: i + 1, codigo_zona: `Z${String(i).padStart(2, "0")}` }));
  assert.equal(coloresPorZona(zonas).get(PALETA_ZONAS.length + 1), PALETA_ZONAS[0]);
});

test("colores: la paleta de zonas no usa los colores reservados", () => {
  for (const reservado of [COLOR_PROPUESTA, COLOR_CONFLICTO, COLOR_INVALIDO]) {
    assert.equal((PALETA_ZONAS as readonly string[]).includes(reservado), false);
  }
});
