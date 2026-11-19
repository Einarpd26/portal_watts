import test from "node:test";
import assert from "node:assert/strict";
import {
  COLOR_DUPLICADA,
  COLOR_OTRO_DIA,
  COLOR_PLANIFICADA,
  COLOR_SIN_PLANIFICAR,
  PALETA_SLOTS,
  accionDelPincel,
  colorDeSlot,
  descripcionDeVisita,
  etiquetaDeSlot,
  propiedadesDeRutas,
  quedaDuplicada,
} from "../src/utils/planificacionMapa.ts";
import type { Frecuencia, VisitaPlanificada } from "../src/types/index.ts";
import type { DiaKey } from "../src/utils/diasSemana.ts";

const visita = (id: number, id_slot: number, id_ruta: number, dia: DiaKey, frecuencia: Frecuencia = "semanal"): VisitaPlanificada => ({
  id,
  id_slot,
  id_ruta,
  codigo_ruta: `R-${id_ruta}`,
  ruta: `Ruta ${id_ruta}`,
  dia,
  frecuencia,
});

const SLOTS = [{ id: 10 }, { id: 20 }];
const PLAN_LU = { modo: "planificacion", dia: "LU" } as const;
const COB_LU = { modo: "cobertura", dia: "LU" } as const;
const COB_TODOS = { modo: "cobertura", dia: null } as const;
const RUTAS = [
  { id: 1, codigo_ruta: "R-1" },
  { id: 2, codigo_ruta: "R-2" },
  { id: 3, codigo_ruta: "R-3" },
];

test("paleta: cada slot recibe un color por su posición y la paleta se repite", () => {
  assert.equal(colorDeSlot(0), PALETA_SLOTS[0]);
  assert.equal(colorDeSlot(1), PALETA_SLOTS[1]);
  assert.equal(colorDeSlot(PALETA_SLOTS.length), PALETA_SLOTS[0]);
});

test("paleta: no usa los colores reservados al gris y a la duplicada", () => {
  const colores = PALETA_SLOTS as readonly string[];
  assert.equal(colores.includes(COLOR_SIN_PLANIFICAR), false);
  assert.equal(colores.includes(COLOR_DUPLICADA), false);
  assert.equal(colores.includes(COLOR_OTRO_DIA), false);
  assert.equal(new Set(colores).size, colores.length);
});

test("etiqueta del slot: usa su nombre y, si no tiene, su posición", () => {
  assert.equal(etiquetaDeSlot({ nombre: "Norte" }, 0), "Norte");
  assert.equal(etiquetaDeSlot({ nombre: null }, 2), "Slot 3");
});

test("planificación: el color dice el estado, sin importar el slot", () => {
  const [r1, r2, r3, r4] = propiedadesDeRutas(
    [...RUTAS, { id: 4, codigo_ruta: "R-4" }],
    [visita(1, 20, 1, "LU"), visita(2, 10, 2, "LU"), visita(3, 10, 3, "MA")],
    SLOTS,
    PLAN_LU
  );
  assert.deepEqual([r1.estado, r1.color], ["del_dia", COLOR_PLANIFICADA]);
  assert.deepEqual([r2.estado, r2.color], ["del_dia", COLOR_PLANIFICADA]);
  assert.deepEqual([r3.estado, r3.color], ["otro_dia", COLOR_OTRO_DIA]);
  assert.deepEqual([r4.estado, r4.color], ["sin_planificar", COLOR_SIN_PLANIFICAR]);
});

test("planificación: una ruta de otro día se marca tenue y nombra los días", () => {
  const [r1] = propiedadesDeRutas(RUTAS, [visita(1, 10, 1, "MA"), visita(2, 10, 1, "JU", "eventual")], SLOTS, PLAN_LU);
  assert.equal(r1.estado, "otro_dia");
  assert.equal(r1.etiqueta, "R-1 · Mar/Jue");
});

test("planificación: con el pincel activo se resaltan las rutas de ese slot en el día activo", () => {
  const visitas = [visita(1, 10, 1, "LU"), visita(2, 20, 2, "LU"), visita(3, 10, 3, "MA")];
  const props = propiedadesDeRutas(RUTAS, visitas, SLOTS, { ...PLAN_LU, idSlotPincel: 10 });
  assert.deepEqual(props.map((p) => p.delPincel), [true, false, false]);
  assert.deepEqual(propiedadesDeRutas(RUTAS, visitas, SLOTS, PLAN_LU).map((p) => p.delPincel), [false, false, false]);
});

test("cobertura: la ruta toma el color del slot que la cubre el día activo", () => {
  const [r1, r2, r3] = propiedadesDeRutas(RUTAS, [visita(1, 20, 1, "LU"), visita(2, 10, 2, "LU")], SLOTS, COB_LU);
  assert.equal(r1.estado, "del_dia");
  assert.equal(r1.color, PALETA_SLOTS[1]);
  assert.equal(r2.color, PALETA_SLOTS[0]);
  assert.equal(r3.estado, "sin_planificar");
  assert.equal(r3.color, COLOR_SIN_PLANIFICAR);
});

test("cobertura: con un día elegido, lo que solo se visita otro día queda gris", () => {
  const [r1] = propiedadesDeRutas(RUTAS, [visita(1, 10, 1, "MA")], SLOTS, COB_LU);
  assert.equal(r1.estado, "sin_planificar");
  assert.equal(r1.color, COLOR_SIN_PLANIFICAR);
});

test("cobertura: «todos» pinta toda la semana y la etiqueta lista los días", () => {
  const [r1, r2] = propiedadesDeRutas(RUTAS, [visita(1, 20, 1, "JU"), visita(2, 20, 1, "LU", "impar")], SLOTS, COB_TODOS);
  assert.equal(r1.estado, "del_dia");
  assert.equal(r1.color, PALETA_SLOTS[1]);
  assert.equal(r1.etiqueta, "R-1 · Lun/Jue");
  assert.equal(r2.estado, "sin_planificar");
});

test("cobertura: nunca resalta el pincel", () => {
  const props = propiedadesDeRutas(RUTAS, [visita(1, 10, 1, "LU")], SLOTS, { ...COB_LU, idSlotPincel: 10 });
  assert.equal(props[0].delPincel, false);
});

test("etiqueta: la frecuencia distinta de semanal se abrevia en el código de la ruta", () => {
  const visitas = [visita(1, 10, 1, "LU", "impar"), visita(2, 10, 2, "LU", "par"), visita(3, 10, 3, "LU", "eventual")];
  for (const opciones of [PLAN_LU, COB_LU]) {
    assert.deepEqual(propiedadesDeRutas(RUTAS, visitas, SLOTS, opciones).map((p) => p.etiqueta), ["R-1 imp", "R-2 par", "R-3 ev"]);
  }
});

test("etiqueta: una ruta semanal no lleva sufijo", () => {
  assert.equal(propiedadesDeRutas(RUTAS, [visita(1, 10, 1, "LU")], SLOTS, PLAN_LU)[0].etiqueta, "R-1");
});

test("duplicada: usa la misma regla que la grilla (RN-04) en los dos modos y las eventuales no cuentan", () => {
  const dup = [visita(1, 10, 1, "LU"), visita(2, 20, 1, "MA")];
  const conEventual = [visita(1, 10, 1, "LU"), visita(2, 20, 1, "MA", "eventual")];
  for (const opciones of [PLAN_LU, COB_LU, COB_TODOS]) {
    assert.equal(propiedadesDeRutas(RUTAS, dup, SLOTS, opciones)[0].duplicada, true);
    assert.equal(propiedadesDeRutas(RUTAS, conEventual, SLOTS, opciones)[0].duplicada, false);
  }
});

test("cobertura: si dos slots cubren la ruta el mismo día, manda el primero en el orden", () => {
  const [r1] = propiedadesDeRutas(RUTAS, [visita(1, 20, 1, "LU"), visita(2, 10, 1, "LU")], SLOTS, COB_LU);
  assert.equal(r1.color, PALETA_SLOTS[0]);
  assert.equal(r1.duplicada, true);
});

test("cobertura: una visita de un slot que ya no existe no rompe el cálculo", () => {
  const [r1] = propiedadesDeRutas(RUTAS, [visita(1, 99, 1, "LU")], SLOTS, COB_LU);
  assert.equal(r1.estado, "del_dia");
  assert.equal(r1.color, PALETA_SLOTS[0]);
});

test("descripción de la visita: día, slot y frecuencia", () => {
  assert.equal(descripcionDeVisita({ dia: "LU", frecuencia: "semanal" }, "Slot 1"), "Lun · Slot 1 · semanal");
  assert.equal(descripcionDeVisita({ dia: "MI", frecuencia: "impar" }, "Norte"), "Mié · Norte · sem. impar");
});

test("pincel: sobre una ruta que no está en ese slot y día, planifica", () => {
  const visitas = [visita(1, 10, 1, "LU"), visita(2, 20, 2, "LU"), visita(3, 10, 2, "MA")];
  assert.deepEqual(accionDelPincel(visitas, { idSlot: 10, dia: "LU", idRuta: 2, frecuencia: "semanal" }), { tipo: "agregar" });
});

test("pincel: sobre una ruta que ya está en ese slot y día, la quita", () => {
  const visitas = [visita(7, 10, 1, "LU"), visita(8, 20, 1, "LU")];
  assert.deepEqual(accionDelPincel(visitas, { idSlot: 10, dia: "LU", idRuta: 1, frecuencia: "semanal" }), {
    tipo: "quitar",
    idVisita: 7,
  });
});

test("pincel: con par e impar en la misma celda quita la de la frecuencia activa, o la primera si no hay", () => {
  const visitas = [visita(1, 10, 1, "LU", "impar"), visita(2, 10, 1, "LU", "par")];
  assert.deepEqual(accionDelPincel(visitas, { idSlot: 10, dia: "LU", idRuta: 1, frecuencia: "par" }), { tipo: "quitar", idVisita: 2 });
  assert.deepEqual(accionDelPincel(visitas, { idSlot: 10, dia: "LU", idRuta: 1, frecuencia: "semanal" }), { tipo: "quitar", idVisita: 1 });
});

test("aviso: planificar una ruta ya planificada la deja duplicada, salvo que sea eventual", () => {
  const visitas = [{ id_ruta: 1, frecuencia: "semanal" as const }];
  assert.equal(quedaDuplicada(visitas, { id_ruta: 1, frecuencia: "semanal" }), true);
  assert.equal(quedaDuplicada(visitas, { id_ruta: 1, frecuencia: "eventual" }), false);
  assert.equal(quedaDuplicada(visitas, { id_ruta: 2, frecuencia: "semanal" }), false);
});
