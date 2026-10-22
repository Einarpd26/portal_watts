import test from "node:test";
import assert from "node:assert/strict";
import {
  GEOJSON_MAX_BYTES,
  GEOJSON_MAX_VERTICES,
  interpretarGeoJson,
  mensajeCodigoDuplicado,
  validarRuta,
  type RutaEntrada,
} from "../src/utils/rutaValidation.ts";

const anillo = [[-63.2, -17.79], [-63.19, -17.79], [-63.19, -17.78], [-63.2, -17.78], [-63.2, -17.79]];
const poligono = { type: "Polygon", coordinates: [anillo] };
const texto = (o: unknown) => JSON.stringify(o);

test("geojson: acepta un Polygon suelto", () => {
  const r = interpretarGeoJson(texto(poligono));
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.poligono.coordinates[0][0], [-63.2, -17.79]);
});

test("geojson: acepta un Feature y un FeatureCollection con una sola ruta", () => {
  const feature = { type: "Feature", properties: {}, geometry: poligono };
  assert.equal(interpretarGeoJson(texto(feature)).ok, true);
  assert.equal(interpretarGeoJson(texto({ type: "FeatureCollection", features: [feature] })).ok, true);
});

test("geojson: rechaza un FeatureCollection con varias entidades o vacío", () => {
  const feature = { type: "Feature", properties: {}, geometry: poligono };
  const dos = interpretarGeoJson(texto({ type: "FeatureCollection", features: [feature, feature] }));
  const ninguna = interpretarGeoJson(texto({ type: "FeatureCollection", features: [] }));
  assert.deepEqual([dos.ok, ninguna.ok], [false, false]);
  if (!dos.ok) assert.equal(dos.error, "multiples");
});

test("geojson: rechaza MultiPolygon, Point y tipos desconocidos", () => {
  const multi = interpretarGeoJson(texto({ type: "MultiPolygon", coordinates: [[anillo]] }));
  const punto = interpretarGeoJson(texto({ type: "Point", coordinates: [0, 0] }));
  const feature = interpretarGeoJson(texto({ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] } }));
  for (const r of [multi, punto, feature]) {
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "tipo");
  }
});

test("geojson: rechaza texto vacío y JSON mal formado", () => {
  const vacio = interpretarGeoJson("   ");
  const roto = interpretarGeoJson("{ no es json");
  assert.deepEqual([vacio.ok, roto.ok], [false, false]);
  if (!vacio.ok && !roto.ok) assert.deepEqual([vacio.error, roto.error], ["vacio", "json_invalido"]);
});

test("geojson: rechaza un anillo abierto", () => {
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [anillo.slice(0, 4)] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "anillo_abierto");
});

test("geojson: rechaza anillos con menos de 4 posiciones", () => {
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [anillo.slice(0, 3)] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "coordenadas");
});

test("geojson: rechaza coordenadas fuera de rango (latitud y longitud invertidas)", () => {
  const invertido = anillo.map(([lon, lat]) => [lat, lon]).map(([a, b]) => [a * 10, b * 10]);
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [[...invertido.slice(0, 4), invertido[0]]] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "rango");
});

test("geojson: rechaza posiciones no numéricas", () => {
  const sucio = anillo.map((p, i) => (i === 1 ? ["x", p[1]] : p));
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [sucio] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "coordenadas");
});

test("geojson: descarta la altitud y deja [longitud, latitud]", () => {
  const conZ = anillo.map(([lon, lat]) => [lon, lat, 400]);
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [conZ] }));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.poligono.coordinates[0][0].length, 2);
});

test("geojson: rechaza un archivo que supera el tamaño máximo", () => {
  const grande = interpretarGeoJson(" ".repeat(GEOJSON_MAX_BYTES) + texto(poligono));
  assert.equal(grande.ok, false);
  if (!grande.ok) assert.equal(grande.error, "tamano");
});

test("geojson: rechaza un polígono con demasiados vértices", () => {
  const n = GEOJSON_MAX_VERTICES + 10;
  const muchos = Array.from({ length: n }, (_, i) => [-63 + (i % 100) * 1e-5, -17 + Math.floor(i / 100) * 1e-5]);
  muchos.push(muchos[0]);
  const r = interpretarGeoJson(texto({ type: "Polygon", coordinates: [muchos] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "vertices");
});

const valida: RutaEntrada = { codigo_ruta: " rn-9 ", ruta: " Ruta Nueva ", descripcion_ruta: "  ", id_zona: 3 };

test("rutas: normaliza el código a mayúsculas y la descripción vacía a null", () => {
  const r = validarRuta(valida, { exigirZona: true });
  assert.equal(r.isValid, true);
  assert.deepEqual(r.data, { codigo_ruta: "RN-9", ruta: "Ruta Nueva", descripcion_ruta: null, id_zona: 3 });
});

test("rutas: rechaza código vacío, con espacios o demasiado largo", () => {
  for (const codigo of ["", "R N", "R".repeat(21)]) {
    const r = validarRuta({ ...valida, codigo_ruta: codigo }, { exigirZona: true });
    assert.equal(r.isValid, false, `código "${codigo}"`);
    assert.ok(r.errors.codigo_ruta);
  }
});

test("rutas: exige la zona solo en el alta", () => {
  assert.equal(validarRuta({ ...valida, id_zona: null }, { exigirZona: true }).isValid, false);
  assert.equal(validarRuta({ ...valida, id_zona: null }, { exigirZona: false }).isValid, true);
});

test("rutas: rechaza nombre corto y descripción larga", () => {
  const r = validarRuta({ ...valida, ruta: "A", descripcion_ruta: "x".repeat(256) }, { exigirZona: true });
  assert.ok(r.errors.ruta && r.errors.descripcion_ruta);
});

test("rutas: el mensaje de código repetido nombra la zona que ya lo usa (ADR-002 D8)", () => {
  assert.equal(
    mensajeCodigoDuplicado("R-N1", "ZN"),
    "El código R-N1 ya lo usa una ruta de la zona ZN. El código de una ruta es único en todo el sistema."
  );
});

test("rutas: el mensaje de código repetido no inventa una zona si no se conoce", () => {
  assert.equal(mensajeCodigoDuplicado("R-N1"), "El código R-N1 ya lo usa otra ruta. El código de una ruta es único en todo el sistema.");
  assert.equal(mensajeCodigoDuplicado("R-N1", ""), "El código R-N1 ya lo usa otra ruta. El código de una ruta es único en todo el sistema.");
});
