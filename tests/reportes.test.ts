import test from "node:test";
import assert from "node:assert/strict";
import {
  clientesDesdeQuery,
  coberturaDesdeQuery,
  esTipoReporte,
  nombreArchivoReporte,
  parametrosDeClientes,
  parametrosDeCobertura,
  parametrosDePlanificacion,
  planificacionDesdeQuery,
  urlDeReporte,
} from "../src/utils/reportes.ts";
import { FILTROS_INICIALES } from "../src/utils/clientesMapa.ts";
import { FILTROS_COBERTURA_INICIALES } from "../src/utils/coberturaRutas.ts";
import { FILTROS_CONSULTA_INICIALES } from "../src/utils/consultaPlanificacion.ts";
import type { ClaseAbc } from "../src/types/index.ts";

const aObjeto = (qs: string) => Object.fromEntries(new URLSearchParams(qs));

test("tipo: solo se aceptan los reportes que existen", () => {
  assert.equal(esTipoReporte("cobertura"), true);
  assert.equal(esTipoReporte("clientes"), true);
  assert.equal(esTipoReporte("grilla"), true);
  assert.equal(esTipoReporte("../etc/passwd"), false);
  assert.equal(esTipoReporte(undefined), false);
});

test("cobertura: los filtros viajan en la dirección y vuelven iguales", () => {
  const filtros = { idZona: 2, idSupervisor: 10, idRuta: null };
  const qs = parametrosDeCobertura(filtros, "mayor");
  assert.equal(qs, "zona=2&supervisor=10&orden=mayor");
  assert.deepEqual(coberturaDesdeQuery(aObjeto(qs)), { filtros, orden: "mayor" });
});

test("cobertura: sin filtros solo viaja el orden, y un orden o un id inválido se ignoran", () => {
  assert.equal(parametrosDeCobertura(FILTROS_COBERTURA_INICIALES, "menor"), "orden=menor");
  assert.deepEqual(coberturaDesdeQuery({ orden: "hack", zona: "abc", ruta: "-1" }), { filtros: FILTROS_COBERTURA_INICIALES, orden: "menor" });
});

test("planificación: ida y vuelta de todos los filtros, incluido el día", () => {
  const filtros = { idSucursal: 1, idZona: 2, idSupervisor: 3, idVendedor: 4, idRuta: 5, dia: "MA" as const };
  assert.deepEqual(planificacionDesdeQuery(aObjeto(parametrosDePlanificacion(filtros))), filtros);
  assert.equal(parametrosDePlanificacion(FILTROS_CONSULTA_INICIALES), "");
});

test("planificación: un día que no existe se ignora", () => {
  assert.equal(planificacionDesdeQuery({ dia: "XX" }).dia, null);
  assert.equal(planificacionDesdeQuery({ dia: "DO" }).dia, null);
});

test("clientes: ida y vuelta de clases, no habilitados, ruta y texto", () => {
  const filtros = { idRuta: 7, clases: new Set<ClaseAbc>(["A", "B"]), sinClase: false, texto: "don pepe" };
  const vuelta = clientesDesdeQuery(aObjeto(parametrosDeClientes(filtros)));
  assert.equal(vuelta.idRuta, 7);
  assert.deepEqual([...vuelta.clases], ["A", "B"]);
  assert.equal(vuelta.sinClase, false);
  assert.equal(vuelta.texto, "don pepe");
});

test("clientes: sin parámetros se pide todo, y las clases inválidas no se cuelan", () => {
  const todo = clientesDesdeQuery({});
  assert.deepEqual([...todo.clases], ["A", "B", "C", "I"]);
  assert.equal(todo.sinClase, true);
  assert.deepEqual([...clientesDesdeQuery({ clases: "A,Z,<script>" }).clases], ["A"]);
  assert.equal(parametrosDeClientes(FILTROS_INICIALES), "clases=A%2CB%2CC%2CI&sinclase=1");
});

test("dirección y nombre del archivo", () => {
  assert.equal(urlDeReporte("cobertura", ""), "/api/reportes/cobertura");
  assert.equal(urlDeReporte("clientes", "ruta=3"), "/api/reportes/clientes?ruta=3");
  assert.equal(nombreArchivoReporte("cobertura", "2026-11-20"), "cobertura-rutas_2026-11-20.xlsx");
  assert.equal(nombreArchivoReporte("clientes", "2026-11-20"), "clientes-abc_2026-11-20.xlsx");
});
