import test from "node:test";
import assert from "node:assert/strict";
import { armarColeccionTerritorio, nombreArchivoExportacion, partirRespaldo } from "../src/utils/rutaExportacion.ts";
import type { RutaExportable } from "../src/types/index.ts";

const poligono = { type: "Polygon" as const, coordinates: [[[-63.2, -17.79], [-63.19, -17.79], [-63.19, -17.78], [-63.2, -17.79]]] };
const ruta: RutaExportable = {
  id: 7, codigo_ruta: "R-N1", ruta: "Ruta Norte 1", descripcion_ruta: null,
  id_zona: 3, codigo_zona: "ZN", zona: "Zona Norte", geojson: poligono,
};

test("exportación: una ruta sola produce una colección importable de una entidad", () => {
  const c = armarColeccionTerritorio([ruta]);
  assert.equal(c.type, "FeatureCollection");
  assert.equal(c.features.length, 1);
  assert.deepEqual(c.features[0].geometry, poligono);
  assert.equal(c.features[0].properties.tipo, "ruta");
  assert.equal(c.features[0].properties.codigo_ruta, "R-N1");
});

test("exportación: el archivo trae solo rutas, con lo que CU-16 lee al importar", () => {
  const c = armarColeccionTerritorio([ruta, { ...ruta, id: 8, codigo_ruta: "R-N2" }]);
  assert.deepEqual(c.features.map((f) => f.properties.tipo), ["ruta", "ruta"]);
  const p = c.features[0].properties;
  assert.deepEqual([p.codigo_ruta, p.ruta, p.codigo_zona], ["R-N1", "Ruta Norte 1", "ZN"]);
});

test("exportación: una ruta sin descripción no lleva la propiedad (CU-16 exige texto)", () => {
  const sin = armarColeccionTerritorio([ruta]).features[0].properties;
  assert.equal("descripcion_ruta" in sin, false);
  const con = armarColeccionTerritorio([{ ...ruta, descripcion_ruta: "Warnes" }]).features[0].properties;
  assert.equal(con.descripcion_ruta, "Warnes");
});

const nuevaRuta = (n: number, sucursal: string) => ({ ...ruta, id: n, codigo_ruta: `R-${n}`, sucursal });
const limites = { maxRutas: 250, maxBytes: 4 * 1024 * 1024 };
const prefijo = (s: string) => `territorio-${s.toLowerCase()}`;

test("respaldo: un archivo por sucursal, ordenados por sucursal", () => {
  const rutas = [nuevaRuta(1, "SCZ"), nuevaRuta(2, "DEP"), nuevaRuta(3, "SCZ")];
  const a = partirRespaldo(rutas, "2026-10-24", limites, prefijo);
  assert.deepEqual(a.map((x) => [x.nombre, x.rutas]), [
    ["territorio-dep-2026-10-24-1.geojson", 1],
    ["territorio-scz-2026-10-24-1.geojson", 2],
  ]);
});

test("respaldo: cada sucursal se parte en tandas de hasta el máximo de rutas, sin perder ninguna", () => {
  const rutas = Array.from({ length: 662 }, (_, i) => nuevaRuta(i + 1, "DEP"));
  const a = partirRespaldo(rutas, "2026-10-24", limites, prefijo);
  assert.deepEqual(a.map((x) => x.rutas), [250, 250, 162]);
  assert.deepEqual(a.map((x) => x.parte), [1, 2, 3]);
  const codigos = a.flatMap((x) => (JSON.parse(x.contenido) as { features: Array<{ properties: { codigo_ruta: string } }> }).features.map((f) => f.properties.codigo_ruta));
  assert.deepEqual(codigos, rutas.map((r) => r.codigo_ruta));
});

test("respaldo: también parte por tamaño y ningún archivo supera el máximo de bytes", () => {
  const rutas = Array.from({ length: 10 }, (_, i) => nuevaRuta(i + 1, "SCZ"));
  const porRuta = new TextEncoder().encode(JSON.stringify(armarColeccionTerritorio([rutas[0]]))).length;
  const maxBytes = porRuta * 3 + 40;
  const a = partirRespaldo(rutas, "2026-10-24", { maxRutas: 250, maxBytes }, prefijo);
  assert.ok(a.length > 1);
  assert.equal(a.reduce((n, x) => n + x.rutas, 0), 10);
  for (const x of a) assert.ok(x.bytes <= maxBytes, `${x.nombre} pesa ${x.bytes}`);
});

test("respaldo: el tamaño informado es el del contenido y el JSON va compacto", () => {
  const [a] = partirRespaldo([nuevaRuta(1, "SCZ")], "2026-10-24", limites, prefijo);
  assert.equal(a.bytes, new TextEncoder().encode(a.contenido).length);
  assert.ok(!a.contenido.includes("\n"));
});

test("respaldo: sin rutas no hay archivos", () => {
  assert.deepEqual(partirRespaldo([], "2026-10-24", limites, prefijo), []);
});

test("exportación: el nombre del archivo identifica el objetivo y la fecha", () => {
  assert.equal(nombreArchivoExportacion({ tipo: "ruta", codigo: "R-N1" }, "2026-10-08"), "ruta-r-n1-2026-10-08.geojson");
  assert.equal(nombreArchivoExportacion({ tipo: "zona", codigo: "ZN" }, "2026-10-08"), "zona-zn-2026-10-08.geojson");
  assert.equal(nombreArchivoExportacion({ tipo: "todo" }, "2026-10-08"), "territorio-2026-10-08.geojson");
});

test("exportación: el nombre no admite caracteres que rompan la cabecera", () => {
  assert.equal(nombreArchivoExportacion({ tipo: "zona", codigo: 'Zó "N"/1' }, "2026-10-08"), "zona-zo-n-1-2026-10-08.geojson");
});
