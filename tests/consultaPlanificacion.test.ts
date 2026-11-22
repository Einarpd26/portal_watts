import test from "node:test";
import assert from "node:assert/strict";
import { FILTROS_CONSULTA_INICIALES, depurarFiltros, filtrarConsulta, opcionesDeConsulta, opcionesSegunFiltros } from "../src/utils/consultaPlanificacion.ts";
import type { RutaConsulta, SlotConsulta, VisitaPlanificada } from "../src/types/index.ts";
import type { DiaKey } from "../src/utils/diasSemana.ts";

const ruta = (id: number, extra: Partial<RutaConsulta> = {}): RutaConsulta => ({
  id,
  codigo_ruta: `R-${id}`,
  ruta: `Ruta ${id}`,
  descripcion_ruta: null,
  id_zona: 1,
  geojson: { type: "Polygon", coordinates: [] },
  codigo_zona: "ZN",
  zona_nombre: "",
  id_sucursal: 1,
  sucursal_nombre: "Santa Cruz",
  id_supervisor: 10,
  supervisor_nombre: "Acosta",
  ...extra,
});
const slot = (id: number, id_vendedor: number | null, id_supervisor = 10): SlotConsulta => ({
  id,
  nombre: null,
  orden: id,
  id_vendedor,
  vendedor_nombre: id_vendedor === null ? null : `Vendedor ${id_vendedor}`,
  id_supervisor,
  supervisor_nombre: `Supervisor ${id_supervisor}`,
});
const visita = (id: number, id_slot: number, id_ruta: number, dia: DiaKey = "LU"): VisitaPlanificada => ({
  id,
  id_slot,
  id_ruta,
  codigo_ruta: `R-${id_ruta}`,
  ruta: `Ruta ${id_ruta}`,
  dia,
  frecuencia: "semanal",
});

const RUTAS = [ruta(1), ruta(2, { id_zona: 2, codigo_zona: "ZS", id_supervisor: 11 }), ruta(3, { id_sucursal: 2, sucursal_nombre: "Interdepartamental", id_zona: 3, codigo_zona: "ZO", id_supervisor: 12 })];
const SLOTS = [slot(100, 50), slot(101, 51, 11), slot(102, null, 12)];
const VISITAS = [visita(1, 100, 1), visita(2, 101, 2), visita(3, 100, 2, "MA")];

test("filtros: sin ninguno se ve todo", () => {
  const r = filtrarConsulta(RUTAS, SLOTS, VISITAS, FILTROS_CONSULTA_INICIALES);
  assert.equal(r.rutas.length, 3);
  assert.equal(r.visitas.length, 3);
});

test("filtros: por sucursal, zona, supervisor y ruta", () => {
  const f = FILTROS_CONSULTA_INICIALES;
  assert.deepEqual(filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...f, idSucursal: 2 }).rutas.map((r) => r.id), [3]);
  assert.deepEqual(filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...f, idZona: 2 }).rutas.map((r) => r.id), [2]);
  assert.deepEqual(filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...f, idSupervisor: 10 }).rutas.map((r) => r.id), [1]);
  assert.deepEqual(filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...f, idRuta: 3 }).rutas.map((r) => r.id), [3]);
});

test("filtros: las visitas que quedan son las de las rutas que quedan", () => {
  const r = filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idZona: 2 });
  assert.deepEqual(r.visitas.map((v) => v.id), [2, 3]);
});

test("filtros: por vendedor deja las rutas que visita y conserva todas sus visitas (para ver la duplicada completa)", () => {
  const r = filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idVendedor: 50 });
  assert.deepEqual(r.rutas.map((x) => x.id), [1, 2]);
  assert.deepEqual(r.visitas.map((v) => v.id), [1, 2, 3]);
});

test("filtros: el día no recorta las rutas, solo colorea", () => {
  const r = filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, dia: "MA" });
  assert.equal(r.rutas.length, 3);
});

test("filtros: combinados se suman (todos deben cumplirse)", () => {
  const r = filtrarConsulta(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idSucursal: 1, idVendedor: 51 });
  assert.deepEqual(r.rutas.map((x) => x.id), [2]);
});

test("opciones: salen de lo que hay al alcance y los slots sin vendedor no aportan vendedores", () => {
  const o = opcionesDeConsulta(RUTAS, SLOTS);
  assert.deepEqual(o.sucursales, [[2, "Interdepartamental"], [1, "Santa Cruz"]]);
  assert.deepEqual(o.zonas.map(([, n]) => n), ["ZN", "ZO", "ZS"]);
  assert.equal(o.supervisores.length, 3);
  assert.deepEqual(o.vendedores.map(([id]) => id), [50, 51]);
});

test("opciones: la zona se muestra por su nombre y, si no lo tiene, por su codigo", () => {
  const o = opcionesDeConsulta([ruta(1, { zona_nombre: "Zona Norte" }), ruta(2, { id_zona: 2, codigo_zona: "ZS", zona_nombre: "" })], []);
  assert.deepEqual(o.zonas, [[1, "Zona Norte"], [2, "ZS"]]);
});

const ids = (pares: Array<[number, string]>) => pares.map(([id]) => id);

test("encadenados: sin filtros ofrecen todo y la lista de rutas incluye las que no tienen visitas", () => {
  const o = opcionesSegunFiltros(RUTAS, SLOTS, VISITAS, FILTROS_CONSULTA_INICIALES);
  assert.deepEqual(ids(o.vendedores), [50, 51]);
  assert.deepEqual(ids(o.rutas), [1, 2, 3]);
  assert.equal(o.supervisores.length, 3);
});

test("encadenados: con un supervisor elegido solo se ofrecen los vendedores que visitan sus rutas", () => {
  const o = opcionesSegunFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idSupervisor: 10 });
  assert.deepEqual(ids(o.vendedores), [50]);
  assert.deepEqual(ids(o.rutas), [1]);
  assert.deepEqual(ids(o.zonas), [1]);
});

test("encadenados: un filtro no se acota a sí mismo: elegido un supervisor, la lista de supervisores sigue completa", () => {
  const o = opcionesSegunFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idSupervisor: 10 });
  assert.equal(o.supervisores.length, 3);
});

test("encadenados: la planificación de un slot ajeno sobre las rutas del supervisor también ofrece a su vendedor", () => {
  // El vendedor 50 (slot del supervisor 10) visita la ruta 2, que es de la zona del supervisor 11
  const o = opcionesSegunFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idSupervisor: 11 });
  assert.deepEqual(ids(o.vendedores), [50, 51]);
});

test("encadenados: elegido un vendedor, solo se ofrecen los supervisores de las rutas que visita", () => {
  const o = opcionesSegunFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idVendedor: 51 });
  assert.deepEqual(ids(o.supervisores), [11]);
  assert.deepEqual(ids(o.rutas), [2]);
});

test("depurar: al elegir un supervisor se limpia el vendedor que no visita sus rutas, y el supervisor se conserva", () => {
  const f = depurarFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idVendedor: 51, idSupervisor: 10 }, "idSupervisor");
  assert.equal(f.idSupervisor, 10);
  assert.equal(f.idVendedor, null);
});

test("depurar: al elegir un vendedor se limpia el supervisor que no lo tiene, y el vendedor se conserva", () => {
  const f = depurarFiltros(RUTAS, SLOTS, VISITAS, { ...FILTROS_CONSULTA_INICIALES, idVendedor: 51, idSupervisor: 10 }, "idVendedor");
  assert.equal(f.idVendedor, 51);
  assert.equal(f.idSupervisor, null);
});

test("depurar: una combinación posible no se toca, y el día nunca se toca", () => {
  const f = { ...FILTROS_CONSULTA_INICIALES, idSupervisor: 11, idVendedor: 51, dia: "LU" as DiaKey };
  assert.deepEqual(depurarFiltros(RUTAS, SLOTS, VISITAS, f, "idVendedor"), f);
});

test("depurar: quitar un filtro (valor nulo) no limpia nada más", () => {
  const f = { ...FILTROS_CONSULTA_INICIALES, idSupervisor: 11, idVendedor: 51 };
  assert.deepEqual(depurarFiltros(RUTAS, SLOTS, VISITAS, { ...f, idVendedor: null }, "idVendedor"), { ...f, idVendedor: null });
});
