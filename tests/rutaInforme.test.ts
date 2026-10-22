import test from "node:test";
import assert from "node:assert/strict";
import {
  UMBRALES_SOLAPE,
  armarInforme,
  clasificarSolape,
  resumirInforme,
  type ConflictoInforme,
  type RechazoDelArchivo,
  type ResultadoDeLote,
} from "../src/utils/rutaInforme.ts";

const conflicto = (c: Partial<ConflictoInforme> & { area_m2: number; area_ruta_m2: number }): ConflictoInforme => ({
  codigo_ruta: "R-X",
  codigo_zona: "ZN",
  ...c,
});

test("solape: el umbral de cada tipo se mide contra la ruta menor de la pareja", () => {
  const propia = 1000;
  // Conflicto de 2000 m²: la menor es la propia (1000)
  const tipo = (inter: number) => clasificarSolape(propia, [conflicto({ area_m2: inter, area_ruta_m2: 2000 })]).tipo;
  assert.equal(tipo(5), "astilla"); // 0,5 %
  assert.equal(tipo(9.9), "astilla"); // justo debajo del 1 %
  assert.equal(tipo(10), "solape_chico"); // exactamente 1 %
  assert.equal(tipo(99), "solape_chico"); // justo debajo del 10 %
  assert.equal(tipo(100), "solape_parcial"); // exactamente 10 %
  assert.equal(tipo(950), "solape_parcial"); // exactamente 95 %: todavía no es contención
  assert.equal(tipo(951), "contenida_en_otra"); // más del 95 % de la menor
});

test("solape: si la ruta conflictiva es la menor, la medida es sobre ella", () => {
  // Propia 1000 m²; la otra mide 100 m² y está 99 % dentro: la propia la contiene
  const r = clasificarSolape(1000, [conflicto({ codigo_ruta: "R-CHICA", area_m2: 99, area_ruta_m2: 100 })]);
  assert.equal(r.tipo, "contiene_a_otras");
  assert.deepEqual(r.contenidas.map((c) => c.codigo_ruta), ["R-CHICA"]);
});

test("solape: una ruta que contiene a varias cuenta todas las contenidas", () => {
  const r = clasificarSolape(
    50000,
    [
      conflicto({ codigo_ruta: "A", area_m2: 100, area_ruta_m2: 100 }),
      conflicto({ codigo_ruta: "B", area_m2: 200, area_ruta_m2: 200 }),
      conflicto({ codigo_ruta: "C", area_m2: 10, area_ruta_m2: 4000 }), // solo un borde
    ]
  );
  assert.equal(r.tipo, "contiene_a_otras");
  assert.deepEqual(r.contenidas.map((c) => c.codigo_ruta), ["A", "B"]);
});

test("solape: manda el peor conflicto", () => {
  const r = clasificarSolape(1000, [
    conflicto({ codigo_ruta: "SLIVER", area_m2: 1, area_ruta_m2: 5000 }),
    conflicto({ codigo_ruta: "PARCIAL", area_m2: 400, area_ruta_m2: 5000 }),
  ]);
  assert.equal(r.tipo, "solape_parcial");
  assert.equal(r.peor?.codigo_ruta, "PARCIAL");
});

test("solape: sin conflictos conocidos se trata como parcial para que alguien lo revise", () => {
  assert.equal(clasificarSolape(1000, []).tipo, "solape_parcial");
});

test("solape: los umbrales son los del diseño", () => {
  assert.deepEqual(UMBRALES_SOLAPE, { astilla: 0.01, chico: 0.1, contenida: 0.95 });
});

const rechazada = (extra: Partial<ResultadoDeLote>): ResultadoDeLote => ({
  indice: 0,
  codigo_ruta: "R-1",
  estado: "rechazada",
  ...extra,
});

const informeDe = (resultados: ResultadoDeLote[], delArchivo: RechazoDelArchivo[] = [], codigos = ["R-1"]) =>
  armarInforme({
    resultados,
    rechazadasDelArchivo: delArchivo,
    zonasPorIndice: new Map(resultados.map((r) => [r.indice, "ZC"])),
    codigosDelArchivo: new Set(codigos),
  });

test("informe: una astilla dice qué borde recortar y con qué ruta", () => {
  const [fila] = informeDe([
    rechazada({
      motivo: "superposicion",
      area_m2: 1000,
      conflictos: [conflicto({ codigo_ruta: "R-VECINA", codigo_zona: "ZN", area_m2: 4.5, area_ruta_m2: 8000 })],
    }),
  ]);
  assert.equal(fila.tipo, "astilla");
  assert.equal(fila.posicion, 1);
  assert.equal(fila.en_conflicto, "R-VECINA (zona ZN)");
  assert.equal(fila.area_comun_m2, 4.5);
  assert.equal(fila.pct_de_esta_ruta, 0.5);
  assert.equal(fila.pct_de_la_otra, 0.1);
  assert.match(fila.accion, /Recortar el borde que comparte con R-VECINA/);
});

test("informe: un solape parcial da el área y el porcentaje de cada ruta", () => {
  const [fila] = informeDe([
    rechazada({
      motivo: "superposicion",
      area_m2: 1000,
      conflictos: [conflicto({ codigo_ruta: "R-VECINA", area_m2: 400, area_ruta_m2: 2000 })],
    }),
  ]);
  assert.equal(fila.tipo, "solape_parcial");
  assert.equal(fila.pct_de_esta_ruta, 40);
  assert.equal(fila.pct_de_la_otra, 20);
  assert.match(fila.accion, /400 m²/);
  assert.match(fila.accion, /40 %/);
});

test("informe: una ruta contenida en otra pide decidir cuál conserva el área", () => {
  const [fila] = informeDe([
    rechazada({ motivo: "superposicion", area_m2: 100, conflictos: [conflicto({ codigo_ruta: "R-GRANDE", area_m2: 100, area_ruta_m2: 9000 })] }),
  ]);
  assert.equal(fila.tipo, "contenida_en_otra");
  assert.match(fila.accion, /dentro de R-GRANDE/);
  assert.match(fila.accion, /cuál conserva el área/);
});

test("informe: una ruta que contiene a otras sugiere excluirla si es un paraguas", () => {
  const contenidas = Array.from({ length: 191 }, (_, i) => conflicto({ codigo_ruta: `R-${i}`, area_m2: 50, area_ruta_m2: 50 }));
  const [fila] = informeDe([rechazada({ motivo: "superposicion", area_m2: 450_000_000, conflictos: contenidas })]);
  assert.equal(fila.tipo, "contiene_a_otras");
  assert.match(fila.accion, /Contiene a 191 rutas/);
  assert.match(fila.accion, /excluirla del lote/);
  // La lista es corta aunque sean 191
  assert.match(fila.en_conflicto, /y 186 más/);
  assert.ok(fila.en_conflicto.length < 200);
});

test("informe: una ruta en conflicto que es del mismo archivo se marca", () => {
  const [fila] = informeDe(
    [rechazada({ indice: 1, codigo_ruta: "R-2", motivo: "superposicion", area_m2: 1000, conflictos: [conflicto({ codigo_ruta: "R-1", area_m2: 300, area_ruta_m2: 1000 })] })],
    [],
    ["R-1", "R-2"]
  );
  assert.match(fila.en_conflicto, /R-1 \(del mismo archivo\)/);
});

test("informe: geometría inválida da el motivo y el lugar del defecto", () => {
  const [fila] = informeDe([rechazada({ motivo: "geometria_invalida", detalle: "Self-intersection[-63.2 -17.79]" })]);
  assert.equal(fila.tipo, "geometria_invalida");
  assert.match(fila.accion, /Self-intersection\[-63\.2 -17\.79\]/);
});

test("informe: invasión y cobertura ajena nombran las zonas", () => {
  const [inv, cob] = informeDe([
    rechazada({ motivo: "invasion", invasiones: [{ codigo_ruta: "R-S1", codigo_zona: "ZS" }] }),
    rechazada({ indice: 1, codigo_ruta: "R-2", motivo: "cobertura", coberturas: [{ codigo_zona: "ZN" }] }),
  ]);
  assert.equal(inv.tipo, "invasion");
  assert.match(inv.accion, /R-S1/);
  assert.match(inv.accion, /trasladar/i);
  assert.equal(cob.tipo, "cobertura_ajena");
  assert.match(cob.accion, /zona ZN/);
});

test("informe: una ruta que ya existe en otra zona manda al traslado", () => {
  const [fila] = informeDe([rechazada({ motivo: "en_otra_zona", codigo_zona: "ZN" })]);
  assert.equal(fila.tipo, "ruta_en_otra_zona");
  assert.match(fila.accion, /zona ZN/);
  assert.match(fila.accion, /CU-06/);
});

test("informe: zona inexistente y fuera de alcance", () => {
  const [a, b] = informeDe([
    rechazada({ motivo: "zona_inexistente" }),
    rechazada({ indice: 1, codigo_ruta: "R-2", motivo: "fuera_de_alcance" }),
  ]);
  assert.equal(a.tipo, "zona_inexistente");
  assert.match(a.accion, /ZC/);
  assert.equal(b.tipo, "fuera_de_alcance");
});

test("informe: los rechazos del archivo se incorporan en su posición", () => {
  const filas = informeDe(
    [{ indice: 2, codigo_ruta: "R-3", estado: "nueva" }],
    [
      { indice: 0, codigo_ruta: "R-1", motivo: "fuera_de_bolivia", mensaje: "El polígono está fuera de Bolivia." },
      { indice: 1, codigo_ruta: null, motivo: "datos_invalidos", mensaje: "El código es obligatorio." },
    ],
    ["R-3"]
  );
  assert.deepEqual(filas.map((f) => [f.posicion, f.estado]), [[1, "rechazada"], [2, "rechazada"], [3, "nueva"]]);
  assert.equal(filas[0].tipo, "fuera_de_bolivia");
  assert.match(filas[0].accion, /longitud, latitud/);
  assert.equal(filas[1].tipo, "datos_invalidos");
  assert.equal(filas[1].codigo_ruta, null);
});

test("informe: una ruta repetida en el archivo apunta a la primera", () => {
  const [fila] = informeDe([], [{ indice: 4, codigo_ruta: "R-1", motivo: "codigo_repetido_en_archivo", mensaje: "El código R-1 ya aparece en la posición 1 del archivo." }]);
  assert.equal(fila.tipo, "codigo_repetido");
  assert.match(fila.accion, /posición 1/);
});

test("informe: las rutas importadas no llevan problema ni acción", () => {
  const filas = informeDe(
    [
      { indice: 0, codigo_ruta: "R-1", estado: "nueva" },
      { indice: 1, codigo_ruta: "R-2", estado: "actualizada" },
      { indice: 2, codigo_ruta: "R-3", estado: "sin_cambios" },
    ],
    [],
    ["R-1", "R-2", "R-3"]
  );
  for (const f of filas) {
    assert.equal(f.tipo, null);
    assert.equal(f.accion, "");
  }
});

test("informe: el resumen cuenta por estado y por tipo de problema", () => {
  const filas = informeDe(
    [
      { indice: 0, codigo_ruta: "R-1", estado: "nueva" },
      { indice: 1, codigo_ruta: "R-2", estado: "actualizada" },
      { indice: 2, codigo_ruta: "R-3", estado: "sin_cambios" },
      rechazada({ indice: 3, codigo_ruta: "R-4", motivo: "superposicion", area_m2: 1000, conflictos: [conflicto({ area_m2: 1, area_ruta_m2: 9000 })] }),
      rechazada({ indice: 4, codigo_ruta: "R-5", motivo: "superposicion", area_m2: 1000, conflictos: [conflicto({ area_m2: 2, area_ruta_m2: 9000 })] }),
      rechazada({ indice: 5, codigo_ruta: "R-6", motivo: "zona_inexistente" }),
    ],
    [],
    ["R-1", "R-2", "R-3", "R-4", "R-5", "R-6"]
  );
  const r = resumirInforme(filas);
  assert.deepEqual(r.por_estado, { nueva: 1, actualizada: 1, sin_cambios: 1, rechazada: 3 });
  assert.deepEqual(r.por_tipo, { astilla: 2, zona_inexistente: 1 });
  assert.equal(r.total, 6);
});
