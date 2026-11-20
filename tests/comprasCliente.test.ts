import test from "node:test";
import assert from "node:assert/strict";
import { resumirCompras, ULTIMAS_COMPRAS } from "../src/utils/comprasCliente.ts";

const linea = (ntr_venta: number, fecha_venta: string, importe: number | null) => ({ ntr_venta, fecha_venta, importe_total_producto: importe });

test("sin ventas no hay ticket promedio ni compras", () => {
  assert.deepEqual(resumirCompras([]), { ticket_promedio: null, compras: [] });
});

test("las líneas de una misma venta se suman en una sola compra", () => {
  const r = resumirCompras([linea(1, "2026-11-01", 100), linea(1, "2026-11-01", 50.5), linea(2, "2026-11-05", 20)]);
  assert.equal(r.compras.length, 2);
  assert.deepEqual(r.compras.find((c) => c.ntr_venta === 1), { ntr_venta: 1, fecha_venta: "2026-11-01", total: 150.5, productos: 2 });
});

test("el ticket promedio es el total por compra, no por línea", () => {
  // Dos compras: 150 y 50 → promedio 100 (por línea serían 66,67)
  const r = resumirCompras([linea(1, "2026-11-01", 100), linea(1, "2026-11-01", 50), linea(2, "2026-11-05", 50)]);
  assert.equal(r.ticket_promedio, 100);
});

test("las compras van de la más reciente a la más antigua", () => {
  const r = resumirCompras([linea(1, "2026-10-01", 10), linea(3, "2026-11-09", 10), linea(2, "2026-11-01", 10)]);
  assert.deepEqual(r.compras.map((c) => c.ntr_venta), [3, 2, 1]);
});

test("solo se devuelven las últimas compras, pero el promedio usa todas", () => {
  const lineas = Array.from({ length: ULTIMAS_COMPRAS + 3 }, (_, i) => linea(i + 1, `2026-11-${String(i + 1).padStart(2, "0")}`, 10 * (i + 1)));
  const r = resumirCompras(lineas);
  assert.equal(r.compras.length, ULTIMAS_COMPRAS);
  assert.equal(r.compras[0]?.ntr_venta, ULTIMAS_COMPRAS + 3);
  assert.equal(r.ticket_promedio, 45); // (10+20+...+80)/8
});

test("un importe nulo cuenta como cero", () => {
  const r = resumirCompras([linea(1, "2026-11-01", null), linea(1, "2026-11-01", 40)]);
  assert.equal(r.compras[0]?.total, 40);
});
