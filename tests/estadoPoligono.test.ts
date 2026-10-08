import test from "node:test";
import assert from "node:assert/strict";
import { estadoDelPoligono, formatoArea, type EntradaEstadoPoligono } from "../src/utils/estadoPoligono.ts";

const base: EntradaEstadoPoligono = { editando: false, dibujando: false, dibujoConPoligono: false, isEvaluando: false, evaluacion: null };
const evaluacion = { valida: true, motivo: null, vertices: 5, area_m2: 1_174_000, conflictos: [] };

test("estado: alta sin polígono queda pendiente; edición sin cambios conserva el guardado", () => {
  assert.deepEqual(estadoDelPoligono(base), { tipo: "pendiente" });
  assert.deepEqual(estadoDelPoligono({ ...base, editando: true }), { tipo: "guardado" });
});

test("estado: dibujando distingue entre dibujar de cero y editar vértices", () => {
  assert.deepEqual(estadoDelPoligono({ ...base, dibujando: true }), { tipo: "dibujando", editando: false });
  assert.deepEqual(estadoDelPoligono({ ...base, dibujando: true, dibujoConPoligono: true }), { tipo: "dibujando", editando: true });
});

test("estado: validando tiene prioridad sobre cualquier resultado anterior", () => {
  assert.deepEqual(estadoDelPoligono({ ...base, isEvaluando: true, evaluacion }), { tipo: "validando" });
});

test("estado: un polígono válido se puede seguir ajustando solo mientras se dibuja", () => {
  assert.deepEqual(estadoDelPoligono({ ...base, evaluacion }), { tipo: "valido", vertices: 5, area_m2: 1_174_000, ajustable: false });
  assert.equal((estadoDelPoligono({ ...base, dibujando: true, evaluacion }) as { ajustable: boolean }).ajustable, true);
});

test("estado: un polígono inválido lleva su motivo y sus conflictos", () => {
  const conflicto = { id: 8, codigo_ruta: "R-N1", area_m2: 10, geojson: null, fuera_de_alcance: false };
  const r = estadoDelPoligono({ ...base, evaluacion: { ...evaluacion, valida: false, motivo: "Se superpone", conflictos: [conflicto] } });
  assert.deepEqual(r, { tipo: "invalido", motivo: "Se superpone", conflictos: [conflicto], ajustable: false });
});

test("área: hectáreas desde 1 ha y metros cuadrados por debajo", () => {
  assert.equal(formatoArea(586.77), "587 m²");
  assert.equal(formatoArea(10_000), "1 ha");
});
