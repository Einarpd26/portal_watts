import test from "node:test";
import assert from "node:assert/strict";
import { alcanceDeCobertura } from "../src/utils/clientesScope.ts";
import {
  FILTROS_COBERTURA_INICIALES,
  depurarFiltrosCobertura,
  filtrarCobertura,
  momentoDeCalculo,
  nombreDelMes,
  opcionesCoberturaSegunFiltros,
  ordenarCobertura,
  resumirCobertura,
  tramoDe,
} from "../src/utils/coberturaRutas.ts";
import type { RutaCobertura } from "../src/types/index.ts";

const ruta = (id: number, codigo_ruta: string, atendidos: number, habilitados: number, extra: Partial<RutaCobertura> = {}): RutaCobertura => ({
  id,
  codigo_ruta,
  ruta: `Ruta ${codigo_ruta}`,
  id_zona: 1,
  codigo_zona: "ZN",
  id_sucursal: 1,
  sucursal_nombre: "Central",
  id_supervisor: 10,
  supervisor_nombre: "Daniel",
  clientes_habilitados: habilitados,
  clientes_atendidos: atendidos,
  porcentaje: habilitados === 0 ? 0 : Math.round((1000 * atendidos) / habilitados) / 10,
  geojson: { type: "Polygon", coordinates: [] },
  ...extra,
});

const rol = (codigo: string, alcance_tipo: string, id_sucursal: number | null) => ({ codigo, permisos: ["mapa:consultar"], alcance_tipo, id_sucursal });

test("tramo: los límites son 50 y 80", () => {
  assert.equal(tramoDe(0), "baja");
  assert.equal(tramoDe(49.9), "baja");
  assert.equal(tramoDe(50), "media");
  assert.equal(tramoDe(79.9), "media");
  assert.equal(tramoDe(80), "alta");
  assert.equal(tramoDe(100), "alta");
});

test("resumen: el porcentaje general pondera por clientes, no promedia los porcentajes", () => {
  const r = resumirCobertura([ruta(1, "R-1", 10, 10), ruta(2, "R-2", 0, 90)]);
  assert.equal(r.porcentaje, 10);
  assert.equal(r.clientesAtendidos, 10);
  assert.equal(r.clientesHabilitados, 100);
  assert.equal(r.rutasBajas, 1);
  assert.equal(r.rutas, 2);
});

test("resumen: sin rutas o sin clientes habilitados no divide por cero", () => {
  assert.equal(resumirCobertura([]).porcentaje, 0);
  assert.equal(resumirCobertura([ruta(1, "R-1", 0, 0)]).porcentaje, 0);
});

test("filtros: por zona, por supervisor y por ruta", () => {
  const rutas = [ruta(1, "R-1", 5, 10), ruta(2, "R-2", 5, 10, { id_zona: 2, id_supervisor: 11 }), ruta(3, "R-3", 5, 10, { id_supervisor: null })];
  assert.equal(filtrarCobertura(rutas, FILTROS_COBERTURA_INICIALES).length, 3);
  assert.deepEqual(filtrarCobertura(rutas, { ...FILTROS_COBERTURA_INICIALES, idZona: 2 }).map((r) => r.id), [2]);
  assert.deepEqual(filtrarCobertura(rutas, { ...FILTROS_COBERTURA_INICIALES, idSupervisor: 10 }).map((r) => r.id), [1]);
  assert.deepEqual(filtrarCobertura(rutas, { ...FILTROS_COBERTURA_INICIALES, idRuta: 3 }).map((r) => r.id), [3]);
});

test("orden: de menor a mayor por defecto, con desempate por código", () => {
  const rutas = [ruta(1, "R-B", 8, 10), ruta(2, "R-A", 2, 10), ruta(3, "R-C", 2, 10)];
  assert.deepEqual(ordenarCobertura(rutas, "menor").map((r) => r.codigo_ruta), ["R-A", "R-C", "R-B"]);
  assert.deepEqual(ordenarCobertura(rutas, "mayor").map((r) => r.codigo_ruta), ["R-B", "R-A", "R-C"]);
  assert.deepEqual(ordenarCobertura(rutas, "codigo").map((r) => r.codigo_ruta), ["R-A", "R-B", "R-C"]);
});

test("fechas: mes en español y momento del recálculo en hora de Bolivia", () => {
  assert.equal(nombreDelMes("2026-11-01"), "noviembre de 2026");
  assert.equal(nombreDelMes(null), null);
  assert.equal(momentoDeCalculo("2026-11-19T07:00:00+00:00"), "19/11/2026 03:00");
  assert.equal(momentoDeCalculo("2026-11-19T02:30:00Z"), "18/11/2026 22:30");
  assert.equal(momentoDeCalculo(null), null);
});

test("alcance de cobertura: el Vendedor no la consulta; los demás roles, igual que los clientes", () => {
  assert.deepEqual(alcanceDeCobertura({ roles: [rol("VENDEDOR", "SUCURSAL", 1)] }), { tipo: "denegado" });
  assert.deepEqual(alcanceDeCobertura({ roles: [rol("SUPERVISOR", "SUCURSAL", 1)] }), { tipo: "acotado", sucursales: [], comoSupervisor: true, comoVendedor: false });
  assert.deepEqual(alcanceDeCobertura({ roles: [rol("VENDEDOR", "SUCURSAL", 1), rol("FISCALIZADOR", "SUCURSAL", 1)] }), {
    tipo: "acotado",
    sucursales: [1],
    comoSupervisor: false,
    comoVendedor: false,
  });
  assert.deepEqual(alcanceDeCobertura({ roles: [rol("GERENCIA_COMERCIAL", "GLOBAL", null)] }), { tipo: "global" });
});

const RUTAS_ENCADENADAS = [
  ruta(1, "R-1", 5, 10),
  ruta(2, "R-2", 5, 10, { id_zona: 2, codigo_zona: "ZS", id_supervisor: 11, supervisor_nombre: "Ana" }),
  ruta(3, "R-3", 5, 10, { id_zona: 2, codigo_zona: "ZS", id_supervisor: 11, supervisor_nombre: "Ana" }),
];
const idsDe = (pares: Array<[number, string]>) => pares.map(([id]) => id);

test("encadenados: sin filtros ofrecen todo, ordenado", () => {
  const o = opcionesCoberturaSegunFiltros(RUTAS_ENCADENADAS, FILTROS_COBERTURA_INICIALES);
  assert.deepEqual(idsDe(o.zonas), [1, 2]);
  assert.deepEqual(idsDe(o.supervisores), [11, 10]);
  assert.deepEqual(o.rutas.map((r) => r.id), [1, 2, 3]);
});

test("encadenados: con una zona elegida solo se ofrecen sus supervisores y sus rutas, y la lista de zonas sigue completa", () => {
  const o = opcionesCoberturaSegunFiltros(RUTAS_ENCADENADAS, { ...FILTROS_COBERTURA_INICIALES, idZona: 2 });
  assert.deepEqual(idsDe(o.supervisores), [11]);
  assert.deepEqual(o.rutas.map((r) => r.id), [2, 3]);
  assert.deepEqual(idsDe(o.zonas), [1, 2]);
});

test("encadenados: elegida una ruta, solo se ofrecen su zona y su supervisor", () => {
  const o = opcionesCoberturaSegunFiltros(RUTAS_ENCADENADAS, { ...FILTROS_COBERTURA_INICIALES, idRuta: 1 });
  assert.deepEqual(idsDe(o.zonas), [1]);
  assert.deepEqual(idsDe(o.supervisores), [10]);
});

test("depurar: al elegir una zona se limpia la ruta que no es de ella, y la zona se conserva", () => {
  const f = depurarFiltrosCobertura(RUTAS_ENCADENADAS, { idZona: 2, idSupervisor: null, idRuta: 1 }, "idZona");
  assert.deepEqual(f, { idZona: 2, idSupervisor: null, idRuta: null });
});

test("depurar: al elegir una ruta se limpia el supervisor que no la tiene", () => {
  const f = depurarFiltrosCobertura(RUTAS_ENCADENADAS, { idZona: null, idSupervisor: 11, idRuta: 1 }, "idRuta");
  assert.deepEqual(f, { idZona: null, idSupervisor: null, idRuta: 1 });
});

test("depurar: una combinación posible no se toca y quitar un filtro no limpia nada más", () => {
  const posible = { idZona: 2, idSupervisor: 11, idRuta: 3 };
  assert.deepEqual(depurarFiltrosCobertura(RUTAS_ENCADENADAS, posible, "idRuta"), posible);
  assert.deepEqual(depurarFiltrosCobertura(RUTAS_ENCADENADAS, { ...posible, idRuta: null }, "idRuta"), { ...posible, idRuta: null });
});

test("encadenado: la sucursal acota zonas, supervisores y rutas, y se limpia si deja de ser posible", () => {
  const rutas = [ruta(1, "R-1", 5, 10), ruta(2, "R-2", 5, 10, { id_zona: 2, codigo_zona: "ZS", id_sucursal: 2, sucursal_nombre: "Sur", id_supervisor: 11 })];
  const f = { ...FILTROS_COBERTURA_INICIALES, idSucursal: 2 };
  assert.deepEqual(filtrarCobertura(rutas, f).map((r) => r.id), [2]);
  const o = opcionesCoberturaSegunFiltros(rutas, f);
  assert.deepEqual(o.zonas, [[2, "ZS"]]);
  assert.deepEqual(o.supervisores.map(([id]) => id), [11]);
  assert.equal(o.sucursales.length, 2);
  assert.deepEqual(depurarFiltrosCobertura(rutas, { ...f, idZona: 1 }, "idSucursal"), f);
});
