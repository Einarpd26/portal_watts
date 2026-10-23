import test from "node:test";
import assert from "node:assert/strict";
import {
  BOLIVIA_BBOX,
  LOTE_MAX_BYTES,
  LOTE_MAX_RUTAS,
  interpretarLoteRutas,
} from "../src/utils/rutaValidation.ts";

// Santa Cruz de la Sierra, en [longitud, latitud]
const anillo = (dx = 0) => [
  [-63.2 + dx, -17.79], [-63.19 + dx, -17.79], [-63.19 + dx, -17.78], [-63.2 + dx, -17.78], [-63.2 + dx, -17.79],
];

const feature = (props: Record<string, unknown>, coordinates: unknown = [anillo()]) => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Polygon", coordinates },
});

const propsValidas = { codigo_ruta: "r-1", ruta: "Ruta uno", codigo_zona: "zn", descripcion_ruta: "Norte" };
const coleccion = (...features: unknown[]) => JSON.stringify({ type: "FeatureCollection", features });

test("lote: acepta una ruta válida y normaliza los códigos a mayúsculas", () => {
  const r = interpretarLoteRutas(coleccion(feature(propsValidas)));
  assert.ok(r.ok);
  assert.equal(r.rutas.length, 1);
  assert.equal(r.rechazadas.length, 0);
  assert.equal(r.rutas[0].codigo_ruta, "R-1");
  assert.equal(r.rutas[0].codigo_zona, "ZN");
  assert.equal(r.rutas[0].ruta, "Ruta uno");
  assert.equal(r.rutas[0].descripcion_ruta, "Norte");
  assert.equal(r.rutas[0].indice, 0);
  assert.deepEqual(r.rutas[0].poligono.type, "Polygon");
});

test("lote: la descripción es opcional", () => {
  const { descripcion_ruta: _omitida, ...sinDescripcion } = propsValidas;
  const r = interpretarLoteRutas(coleccion(feature(sinDescripcion)));
  assert.ok(r.ok);
  assert.equal(r.rutas[0].descripcion_ruta, null);
});

test("lote: el índice de cada ruta es su posición en el archivo, aunque haya rechazadas", () => {
  const r = interpretarLoteRutas(
    coleccion(
      feature({ ...propsValidas, codigo_ruta: "A" }),
      feature({ ...propsValidas, codigo_ruta: "B" }, [[[-63.2, -17.79]]]),
      feature({ ...propsValidas, codigo_ruta: "C" }, [anillo(0.5)])
    )
  );
  assert.ok(r.ok);
  assert.deepEqual(r.rutas.map((x) => [x.indice, x.codigo_ruta]), [[0, "A"], [2, "C"]]);
  assert.deepEqual(r.rechazadas.map((x) => [x.indice, x.codigo_ruta]), [[1, "B"]]);
});

test("lote: modo parcial, una ruta inválida no detiene a las demás", () => {
  const r = interpretarLoteRutas(
    coleccion(
      feature({ ...propsValidas, codigo_ruta: "A" }),
      { type: "Feature", properties: { ...propsValidas, codigo_ruta: "B" }, geometry: { type: "Point", coordinates: [-63.2, -17.79] } },
      feature({ ...propsValidas, codigo_ruta: "C" }, [anillo(0.5)])
    )
  );
  assert.ok(r.ok);
  assert.equal(r.rutas.length, 2);
  assert.equal(r.rechazadas.length, 1);
  assert.equal(r.rechazadas[0].motivo, "geometria");
});

test("lote: rechaza el MultiPolygon y el anillo abierto", () => {
  const multi = { type: "Feature", properties: propsValidas, geometry: { type: "MultiPolygon", coordinates: [[anillo()]] } };
  const abierto = feature({ ...propsValidas, codigo_ruta: "B" }, [anillo().slice(0, 4)]);
  const r = interpretarLoteRutas(coleccion(multi, abierto));
  assert.ok(r.ok);
  assert.equal(r.rutas.length, 0);
  assert.deepEqual(r.rechazadas.map((x) => x.motivo), ["geometria", "geometria"]);
});

test("lote: rechaza una ruta sin geometría", () => {
  const sinGeometria = { type: "Feature", properties: propsValidas, geometry: null };
  const r = interpretarLoteRutas(coleccion(sinGeometria));
  assert.ok(r.ok);
  assert.equal(r.rechazadas[0].motivo, "geometria");
});

test("lote: latitud y longitud invertidas quedan fuera de Bolivia y se rechazan", () => {
  // El formato [latitud, longitud] del ERP: sigue dentro del rango del planeta pero no de Bolivia
  const invertido = [[-17.79, -63.2], [-17.79, -63.19], [-17.78, -63.19], [-17.78, -63.2], [-17.79, -63.2]];
  const r = interpretarLoteRutas(coleccion(feature(propsValidas, [invertido])));
  assert.ok(r.ok);
  assert.equal(r.rutas.length, 0);
  assert.equal(r.rechazadas[0].motivo, "fuera_de_bolivia");
  assert.match(r.rechazadas[0].mensaje, /Bolivia/);
});

test("lote: Bolivia incluye Santa Cruz, La Paz, Cochabamba y Tarija", () => {
  const ciudades: Array<[number, number]> = [[-63.18, -17.78], [-68.15, -16.5], [-66.16, -17.39], [-64.73, -21.53]];
  for (const [lon, lat] of ciudades) {
    assert.ok(lon >= BOLIVIA_BBOX.lonMin && lon <= BOLIVIA_BBOX.lonMax, `longitud ${lon}`);
    assert.ok(lat >= BOLIVIA_BBOX.latMin && lat <= BOLIVIA_BBOX.latMax, `latitud ${lat}`);
  }
});

test("lote: un código de ruta repetido en el archivo se rechaza desde la segunda aparición", () => {
  const r = interpretarLoteRutas(
    coleccion(
      feature({ ...propsValidas, codigo_ruta: "dup" }),
      feature({ ...propsValidas, codigo_ruta: "DUP", ruta: "Otra" }, [anillo(0.5)])
    )
  );
  assert.ok(r.ok);
  assert.deepEqual(r.rutas.map((x) => x.indice), [0]);
  assert.equal(r.rechazadas[0].indice, 1);
  assert.equal(r.rechazadas[0].motivo, "codigo_repetido_en_archivo");
  assert.match(r.rechazadas[0].mensaje, /posición 1/);
});

test("lote: valida los datos administrativos de cada ruta", () => {
  const r = interpretarLoteRutas(
    coleccion(
      feature({ ...propsValidas, codigo_ruta: "con espacios" }),
      feature({ ...propsValidas, codigo_ruta: "B", ruta: "A" }),
      feature({ ...propsValidas, codigo_ruta: "C", codigo_zona: "" }),
      feature({ ruta: "Sin código", codigo_zona: "ZN" }),
      { type: "Feature", properties: null, geometry: { type: "Polygon", coordinates: [anillo()] } }
    )
  );
  assert.ok(r.ok);
  assert.equal(r.rutas.length, 0);
  assert.deepEqual(r.rechazadas.map((x) => x.motivo), Array(5).fill("datos_invalidos"));
});

test("lote: las propiedades que no son texto se rechazan", () => {
  const r = interpretarLoteRutas(coleccion(feature({ ...propsValidas, codigo_ruta: 123 })));
  assert.ok(r.ok);
  assert.equal(r.rechazadas[0].motivo, "datos_invalidos");
});

test("lote: rechaza completo un archivo que no es JSON, está vacío o no es un FeatureCollection", () => {
  const casos: Array<[string, string]> = [
    ["", "vacio"],
    ["no es json", "json_invalido"],
    [JSON.stringify({ type: "Polygon", coordinates: [anillo()] }), "tipo"],
    [JSON.stringify({ type: "Feature", properties: propsValidas, geometry: { type: "Polygon", coordinates: [anillo()] } }), "tipo"],
    [JSON.stringify([]), "tipo"],
    [JSON.stringify({ type: "FeatureCollection" }), "tipo"],
    [JSON.stringify({ type: "FeatureCollection", features: [] }), "sin_rutas"],
  ];
  for (const [texto, esperado] of casos) {
    const r = interpretarLoteRutas(texto);
    assert.equal(r.ok, false, texto);
    if (!r.ok) assert.equal(r.error, esperado, texto);
  }
});

test("lote: rechaza completo un archivo con más rutas que el máximo", () => {
  const muchas = Array.from({ length: LOTE_MAX_RUTAS + 1 }, (_, i) => feature({ ...propsValidas, codigo_ruta: `R-${i}` }));
  const r = interpretarLoteRutas(coleccion(...muchas));
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error, "demasiadas");
    assert.match(r.mensaje, new RegExp(String(LOTE_MAX_RUTAS)));
  }
});

test("lote: acepta exactamente el máximo de rutas", () => {
  const justas = Array.from({ length: LOTE_MAX_RUTAS }, (_, i) =>
    feature({ ...propsValidas, codigo_ruta: `R-${i}`, ruta: `Ruta ${i}` }, [anillo(i * 0.0001)])
  );
  const r = interpretarLoteRutas(coleccion(...justas));
  assert.ok(r.ok);
  assert.equal(r.rutas.length, LOTE_MAX_RUTAS);
});

test("lote: rechaza completo un archivo que supera el tamaño máximo", () => {
  const r = interpretarLoteRutas(" ".repeat(LOTE_MAX_BYTES + 1));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "tamano");
});

test("lote: una ruta con más vértices que el máximo se rechaza sola", () => {
  const muchosVertices = Array.from({ length: 5002 }, (_, i) => [-63.2 + i * 1e-7, -17.79 + (i % 2) * 1e-6]);
  muchosVertices.push(muchosVertices[0]);
  const r = interpretarLoteRutas(
    coleccion(feature({ ...propsValidas, codigo_ruta: "A" }, [muchosVertices]), feature({ ...propsValidas, codigo_ruta: "B" }, [anillo(0.5)]))
  );
  assert.ok(r.ok);
  assert.deepEqual(r.rutas.map((x) => x.codigo_ruta), ["B"]);
  assert.equal(r.rechazadas[0].motivo, "geometria");
});
