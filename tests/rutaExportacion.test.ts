import test from "node:test";
import assert from "node:assert/strict";
import { armarColeccionTerritorio, nombreArchivoExportacion } from "../src/utils/rutaExportacion.ts";
import type { ContornoZona, RutaExportable } from "../src/types/index.ts";

const poligono = { type: "Polygon" as const, coordinates: [[[-63.2, -17.79], [-63.19, -17.79], [-63.19, -17.78], [-63.2, -17.79]]] };
const ruta: RutaExportable = {
  id: 7, codigo_ruta: "R-N1", ruta: "Ruta Norte 1", descripcion_ruta: null,
  id_zona: 3, codigo_zona: "ZN", zona: "Zona Norte", geojson: poligono,
};
const contorno: ContornoZona = { id_zona: 3, geojson: poligono };
const zonas = new Map([[3, { codigo_zona: "ZN", zona: "Zona Norte" }]]);

test("exportación: una ruta sola produce una colección importable de una entidad", () => {
  const c = armarColeccionTerritorio([ruta], [], zonas);
  assert.equal(c.type, "FeatureCollection");
  assert.equal(c.features.length, 1);
  assert.deepEqual(c.features[0].geometry, poligono);
  assert.equal(c.features[0].properties.tipo, "ruta");
  assert.equal(c.features[0].properties.codigo_ruta, "R-N1");
});

test("exportación: los contornos de zona van primero y se distinguen por su tipo", () => {
  const c = armarColeccionTerritorio([ruta], [contorno], zonas);
  assert.deepEqual(c.features.map((f) => f.properties.tipo), ["zona", "ruta"]);
  assert.equal(c.features[0].properties.codigo_zona, "ZN");
});

test("exportación: el nombre del archivo identifica el objetivo y la fecha", () => {
  assert.equal(nombreArchivoExportacion({ tipo: "ruta", codigo: "R-N1" }, "2026-10-08"), "ruta-r-n1-2026-10-08.geojson");
  assert.equal(nombreArchivoExportacion({ tipo: "zona", codigo: "ZN" }, "2026-10-08"), "zona-zn-2026-10-08.geojson");
  assert.equal(nombreArchivoExportacion({ tipo: "todo" }, "2026-10-08"), "territorio-2026-10-08.geojson");
});

test("exportación: el nombre no admite caracteres que rompan la cabecera", () => {
  assert.equal(nombreArchivoExportacion({ tipo: "zona", codigo: 'Zó "N"/1' }, "2026-10-08"), "zona-zo-n-1-2026-10-08.geojson");
});
