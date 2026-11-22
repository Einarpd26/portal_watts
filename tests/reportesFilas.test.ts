import test from "node:test";
import assert from "node:assert/strict";
import { FORMATO_GRILLA, reporteClientes, reporteCobertura, reporteGrilla, reportePlanificacion } from "../src/utils/reportesFilas.ts";
import { FILTROS_COBERTURA_INICIALES } from "../src/utils/coberturaRutas.ts";
import { FILTROS_CONSULTA_INICIALES } from "../src/utils/consultaPlanificacion.ts";
import { FILTROS_INICIALES } from "../src/utils/clientesMapa.ts";
import type { ClaseAbc, ClienteMapa, CoberturaListado, ConsultaPlanificacion, RutaConsulta, RutaCobertura, SlotItem, VisitaPlanificada } from "../src/types/index.ts";

const geo = { type: "Polygon" as const, coordinates: [] };
const cob = (id: number, codigo: string, atendidos: number, habilitados: number, zona = 1): RutaCobertura => ({
  id,
  codigo_ruta: codigo,
  ruta: `Ruta ${codigo}`,
  id_zona: zona,
  codigo_zona: `Z${zona}`,
  id_sucursal: 1,
  sucursal_nombre: "Central",
  id_supervisor: 10,
  supervisor_nombre: "Acosta",
  clientes_habilitados: habilitados,
  clientes_atendidos: atendidos,
  porcentaje: Math.round((1000 * atendidos) / habilitados) / 10,
  geojson: geo,
});

test("cobertura: una fila por ruta, de menor a mayor, con el recálculo y el filtro en las notas", () => {
  const datos: CoberturaListado = { rutas: [cob(1, "R-1", 9, 10), cob(2, "R-2", 1, 10), cob(3, "R-3", 5, 10, 2)], contornos: [], mes: "2026-11-01", calculado_en: "2026-11-20T07:00:00Z" };
  const r = reporteCobertura(datos, { ...FILTROS_COBERTURA_INICIALES, idZona: 1 }, "menor");
  assert.deepEqual(r.filas.map((f) => f[0]), ["R-2", "R-1"]);
  assert.equal(r.filas[0][6], 10);
  assert.equal(r.filas[0][7], "Menos del 50 %");
  assert.match(r.titulo, /noviembre de 2026/);
  assert.ok(r.notas.some((n) => n.includes("20/11/2026 03:00")));
  assert.ok(r.notas.some((n) => n === "Filtros: Zona: Z1"));
});

test("cobertura: el relleno de la cifra sigue el tramo y las demás columnas no se pintan", () => {
  const datos: CoberturaListado = { rutas: [cob(1, "R-1", 9, 10)], contornos: [], mes: "2026-11-01", calculado_en: null };
  const r = reporteCobertura(datos, FILTROS_COBERTURA_INICIALES, "menor");
  assert.equal(r.relleno?.(0, 6, 90), "FFDCFCE7");
  assert.equal(r.relleno?.(0, 0, "R-1"), undefined);
});

const rutaC = (id: number, zona: number): RutaConsulta => ({
  id,
  codigo_ruta: `R-${id}`,
  ruta: `Ruta ${id}`,
  descripcion_ruta: null,
  id_zona: zona,
  geojson: geo,
  codigo_zona: `Z${zona}`,
  id_sucursal: 1,
  sucursal_nombre: "Santa Cruz",
  id_supervisor: 10,
  supervisor_nombre: "Acosta",
});
const consulta: ConsultaPlanificacion = {
  rutas: [rutaC(1, 1), rutaC(2, 1), rutaC(3, 1)],
  contornos: [],
  slots: [{ id: 100, nombre: null, orden: 0, id_vendedor: 50, vendedor_nombre: "Mendoza", id_supervisor: 10, supervisor_nombre: "Acosta" }],
  visitas: [
    { id: 1, id_slot: 100, id_ruta: 1, codigo_ruta: "R-1", ruta: "Ruta 1", dia: "LU", frecuencia: "semanal" },
    { id: 2, id_slot: 100, id_ruta: 1, codigo_ruta: "R-1", ruta: "Ruta 1", dia: "MA", frecuencia: "semanal" },
    { id: 3, id_slot: 100, id_ruta: 2, codigo_ruta: "R-2", ruta: "Ruta 2", dia: "MI", frecuencia: "par" },
  ],
};

test("planificación: una fila por visita, la duplicada marcada y las rutas sin visitas al final como «Sin planificar»", () => {
  const r = reportePlanificacion(consulta, FILTROS_CONSULTA_INICIALES);
  assert.deepEqual(r.filas.map((f) => [f[2], f[6], f[8]]), [["R-1", "Lunes", "Sí"], ["R-1", "Martes", "Sí"], ["R-2", "Miércoles", "No"], ["R-3", null, "No"]]);
  assert.equal(r.filas[3][5], "Sin planificar");
  assert.equal(r.relleno?.(0, 8, "Sí"), "FFFEF3C7");
});

test("planificación: con un día elegido salen solo las visitas de ese día, y la nota aclara qué es «sin planificar»", () => {
  const r = reportePlanificacion(consulta, { ...FILTROS_CONSULTA_INICIALES, dia: "LU" });
  assert.deepEqual(r.filas.map((f) => f[2]), ["R-1", "R-3"]);
  assert.ok(r.notas[0].includes("1 visitas el lunes") && r.notas[0].includes("ninguna visita en la semana"));
});

const cli = (id: number, ruta: number, clasificacion: ClaseAbc | null, ventas: number): ClienteMapa => ({
  id,
  codigo_cliente: `C-${id}`,
  nombre_completo: `Cliente ${id}`,
  nombre_comercial: null,
  direccion: "Calle 1",
  referencia: null,
  rubro: "Tienda",
  telefono: null,
  latitud: -17.78,
  longitud: -63.18,
  id_ruta: ruta,
  clasificacion,
  total_ventas: ventas,
  porcentaje_acumulado: 0.5,
  ultima_compra: "2026-11-18",
  ...{},
});

test("clientes: ordenados por ruta, clase y ventas; el no habilitado se rotula y la fecha sale como fecha", () => {
  const mapa = {
    rutas: [rutaC(1, 1), rutaC(2, 1)],
    contornos: [],
    clientes: [cli(1, 2, "A", 100), cli(2, 1, "C", 10), cli(3, 1, "A", 50), cli(4, 1, null, 0), cli(5, 1, "A", 90)],
  };
  const r = reporteClientes(mapa, FILTROS_INICIALES);
  assert.deepEqual(r.filas.map((f) => f[0]), ["C-5", "C-3", "C-2", "C-4", "C-1"]);
  assert.equal(r.filas[3][4], "No habilitado");
  assert.ok(r.filas[0][7] instanceof Date);
  assert.equal(r.relleno?.(0, 4, "A"), "FFDCFCE7");
  assert.equal(r.relleno?.(3, 4, "No habilitado"), "FFE5E7EB");
});

test("clientes: los filtros de la pantalla recortan el reporte y quedan anotados", () => {
  const mapa = { rutas: [rutaC(1, 1), rutaC(2, 1)], contornos: [], clientes: [cli(1, 1, "A", 100), cli(2, 1, "I", 0), cli(3, 2, "A", 5)] };
  const r = reporteClientes(mapa, { ...FILTROS_INICIALES, idRuta: 1, clases: new Set<ClaseAbc>(["A"]), sinClase: false });
  assert.deepEqual(r.filas.map((f) => f[0]), ["C-1"]);
  assert.ok(r.notas.some((n) => n.includes("Ruta: R-1") && n.includes("Clases: A")));
});

const slotG = (id: number, orden: number, nombre: string | null, vendedor: string | null): SlotItem => ({ id, orden, nombre, id_vendedor: vendedor ? id * 10 : null, vendedor_nombre: vendedor });
const visitaG = (id: number, id_slot: number, id_ruta: number, codigo: string, dia: VisitaPlanificada["dia"], frecuencia: VisitaPlanificada["frecuencia"]): VisitaPlanificada => ({
  id,
  id_slot,
  id_ruta,
  codigo_ruta: codigo,
  ruta: `Ruta ${codigo}`,
  dia,
  frecuencia,
});

const datosGrilla = () => ({
  slots: [slotG(1, 0, "Titular", "Ana Pérez"), slotG(2, 1, null, null)],
  visitas: [
    visitaG(1, 1, 101, "R-2", "LU", "semanal"),
    visitaG(2, 1, 100, "R-1", "LU", "par"),
    visitaG(3, 1, 100, "R-1", "MI", "semanal"),
  ],
  rutas: [
    { id: 100, codigo_ruta: "R-1", ruta: "Ruta R-1", codigo_zona: "Z1" },
    { id: 101, codigo_ruta: "R-2", ruta: "Ruta R-2", codigo_zona: "Z2" },
  ],
  supervisor: "Laura Gómez",
  fecha: "2026-11-21",
});

test("grilla: tres hojas, la grilla con un slot por fila y un día por columna", () => {
  const [grilla, visitas, control] = reporteGrilla(datosGrilla());
  assert.deepEqual([grilla.hoja, visitas.hoja, control.hoja], ["Grilla", "Visitas", "Control"]);
  assert.deepEqual(grilla.columnas.map((c) => c.encabezado), ["Slot", "Vendedor", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Visitas"]);
  // Lunes: las dos rutas ordenadas por código, con la frecuencia solo cuando no es semanal; martes vacío
  assert.deepEqual(grilla.filas[0], ["Titular", "Ana Pérez", "R-1 (Sem. par)\nR-2", null, "R-1", null, null, null, 3]);
  // Un slot sin nombre ni vendedor se rotula por su posición
  assert.deepEqual(grilla.filas[1], ["Slot 2", "Sin vendedor", null, null, null, null, null, null, 0]);
  assert.ok(grilla.notas.some((n) => n === "Supervisor: Laura Gómez · 2026-11-21"));
});

test("grilla: una fila por visita, con la posición del slot y los códigos de día y frecuencia", () => {
  const [, visitas] = reporteGrilla(datosGrilla());
  assert.equal(visitas.filas.length, 3);
  assert.deepEqual(visitas.filas[0], [1, "Titular", "Ana Pérez", "Z1", "R-1", "Ruta R-1", "Lunes", "LU", "Sem. par", "par"]);
  assert.deepEqual(visitas.filas.map((f) => f[7]), ["LU", "LU", "MI"]);
});

test("grilla: la hoja de control identifica el formato y la versión", () => {
  const [, , control] = reporteGrilla(datosGrilla());
  const campos = Object.fromEntries(control.filas.map((f) => [f[0], f[1]]));
  assert.equal(campos.formato, FORMATO_GRILLA.nombre);
  assert.equal(campos.version, String(FORMATO_GRILLA.version));
  assert.equal(campos.slots, "2");
  assert.equal(campos.visitas, "3");
});

test("grilla: sin slots el archivo sale igual, con las hojas vacías", () => {
  const hojas = reporteGrilla({ ...datosGrilla(), slots: [], visitas: [] });
  assert.deepEqual(hojas.map((h) => h.filas.length), [0, 0, 6]);
});
