import test from "node:test";
import assert from "node:assert/strict";
import writeExcelFile from "write-excel-file/node";
import { hojasDelInforme, nombreDelArchivo, type CeldaExcel } from "../src/utils/rutaInformeExcel.ts";
import { resumirInforme, type FilaInforme } from "../src/utils/rutaInforme.ts";

const base: FilaInforme = {
  posicion: 1, codigo_ruta: "R-1", codigo_zona: "ZC", estado: "nueva", tipo: null, problema: "", detalle: "",
  en_conflicto: "", area_comun_m2: null, pct_de_esta_ruta: null, pct_de_la_otra: null, accion: "",
};

const filas: FilaInforme[] = [
  { ...base, posicion: 1, codigo_ruta: "R-1", estado: "nueva" },
  { ...base, posicion: 2, codigo_ruta: "R-2", estado: "actualizada" },
  { ...base, posicion: 3, codigo_ruta: "R-3", estado: "sin_cambios" },
  {
    ...base, posicion: 4, codigo_ruta: "R-4", estado: "rechazada", tipo: "astilla", problema: "Astilla (menos del 1 % de la ruta menor)",
    detalle: "", en_conflicto: "R-9 (zona ZN)", area_comun_m2: 4.5, pct_de_esta_ruta: 0.5, pct_de_la_otra: 0.1,
    accion: "Recortar el borde que comparte con R-9 (zona ZN) (≈ 4,5 m²) en el origen.",
  },
  {
    ...base, posicion: 5, codigo_ruta: null, codigo_zona: null, estado: "rechazada", tipo: "datos_invalidos",
    problema: "Datos inválidos", detalle: "El código es obligatorio.", accion: "Corregir en el origen: El código es obligatorio.",
  },
];

const meta = { sucursal: "Santa Cruz", archivo: "rutas.geojson", generado: "22/10/2026 14:30", confirmado: true };
const texto = (c: CeldaExcel) => (c !== null && typeof c === "object" ? c.value : c);

test("excel: arma tres hojas con los nombres esperados", () => {
  const hojas = hojasDelInforme(filas, resumirInforme(filas), meta);
  assert.deepEqual(hojas.map((h) => h.sheet), ["Resumen", "Rechazadas", "Importadas"]);
});

test("excel: la hoja de rechazadas tiene un título fijo en negrita y una fila por ruta rechazada", () => {
  const rechazadas = hojasDelInforme(filas, resumirInforme(filas), meta)[1];
  assert.equal(rechazadas.stickyRowsCount, 1);
  assert.equal(rechazadas.data.length, 1 + 2);
  for (const celda of rechazadas.data[0]) {
    assert.ok(celda !== null && typeof celda === "object" && celda.fontWeight === "bold", "los títulos van en negrita");
  }
  assert.equal(rechazadas.columns.length, rechazadas.data[0].length);
  assert.ok(rechazadas.data.every((fila) => fila.length === rechazadas.data[0].length), "todas las filas tienen las mismas columnas");
});

test("excel: la fila de una rechazada lleva el tipo, los conflictos, las áreas y la acción", () => {
  const fila = hojasDelInforme(filas, resumirInforme(filas), meta)[1].data[1].map(texto);
  assert.deepEqual(fila, [4, "R-4", "ZC", "Astilla (menos del 1 % de la ruta menor)", "", "R-9 (zona ZN)", 4.5, 0.5, 0.1,
    "Recortar el borde que comparte con R-9 (zona ZN) (≈ 4,5 m²) en el origen."]);
});

test("excel: lo que falta queda vacío y no como cero", () => {
  const fila = hojasDelInforme(filas, resumirInforme(filas), meta)[1].data[2].map(texto);
  assert.equal(fila[1], null); // sin código
  assert.equal(fila[6], null); // sin área
  assert.equal(fila[7], null);
});

test("excel: los códigos son texto para que Excel no los convierta en número", () => {
  const celdaCodigo = hojasDelInforme(filas, resumirInforme(filas), meta)[1].data[1][1];
  assert.ok(celdaCodigo !== null && typeof celdaCodigo === "object");
  assert.equal(celdaCodigo.format, "@");
});

test("excel: el texto largo se ajusta en varias líneas", () => {
  const fila = hojasDelInforme(filas, resumirInforme(filas), meta)[1].data[1];
  for (const i of [4, 5, 9]) {
    const celda = fila[i];
    assert.ok(celda !== null && typeof celda === "object" && celda.wrap === true, `la columna ${i} se ajusta`);
  }
});

test("excel: el color del tipo de problema depende del tipo", () => {
  const [astilla, datos] = hojasDelInforme(filas, resumirInforme(filas), meta)[1].data.slice(1).map((f) => f[3]);
  assert.ok(astilla !== null && typeof astilla === "object" && datos !== null && typeof datos === "object");
  assert.ok(astilla.backgroundColor && datos.backgroundColor);
  assert.notEqual(astilla.backgroundColor, datos.backgroundColor);
});

test("excel: el resumen informa el estado del lote y los conteos", () => {
  const resumen = hojasDelInforme(filas, resumirInforme(filas), meta)[0].data.map((f) => f.map(texto));
  const buscar = (etiqueta: string) => resumen.find((f) => f[0] === etiqueta);
  assert.deepEqual(buscar("Sucursal"), ["Sucursal", "Santa Cruz"]);
  assert.deepEqual(buscar("Estado del informe"), ["Estado del informe", "Importación confirmada"]);
  assert.deepEqual(buscar("Rutas en el archivo"), ["Rutas en el archivo", 5]);
  assert.deepEqual(buscar("Nuevas"), ["Nuevas", 1]);
  assert.deepEqual(buscar("Actualizadas"), ["Actualizadas", 1]);
  assert.deepEqual(buscar("Sin cambios"), ["Sin cambios", 1]);
  assert.deepEqual(buscar("Rechazadas"), ["Rechazadas", 2]);
  assert.deepEqual(buscar("Astilla (menos del 1 % de la ruta menor)"), ["Astilla (menos del 1 % de la ruta menor)", 1]);
});

test("excel: una vista previa se marca como tal", () => {
  const resumen = hojasDelInforme(filas, resumirInforme(filas), { ...meta, confirmado: false })[0].data.map((f) => f.map(texto));
  assert.deepEqual(resumen.find((f) => f[0] === "Estado del informe"), ["Estado del informe", "Vista previa: todavía no se guardó nada"]);
});

test("excel: sin rechazadas la hoja lo dice en vez de quedar vacía", () => {
  const soloOk = filas.slice(0, 3);
  const rechazadas = hojasDelInforme(soloOk, resumirInforme(soloOk), meta)[1];
  assert.equal(rechazadas.data.length, 2);
  assert.equal(texto(rechazadas.data[1][0]), "Ninguna ruta fue rechazada.");
});

test("excel: la hoja de importadas lista el estado de cada una", () => {
  const importadas = hojasDelInforme(filas, resumirInforme(filas), meta)[2].data.slice(1).map((f) => f.map(texto));
  assert.deepEqual(importadas, [[1, "R-1", "ZC", "Nueva"], [2, "R-2", "ZC", "Actualizada"], [3, "R-3", "ZC", "Sin cambios"]]);
});

test("excel: el nombre del archivo lleva la fecha y la hora", () => {
  assert.equal(nombreDelArchivo(new Date(2026, 9, 22, 14, 5)), "informe-importacion-rutas-20261022-1405.xlsx");
});

test("excel: la biblioteca genera un archivo xlsx válido con las tres hojas", async () => {
  const hojas = hojasDelInforme(filas, resumirInforme(filas), meta);
  const buffer = await writeExcelFile(hojas).toBuffer();
  // Un .xlsx es un ZIP: empieza con "PK" y los nombres de sus partes figuran sin comprimir
  assert.equal(buffer.subarray(0, 2).toString("latin1"), "PK");
  const contenido = buffer.toString("latin1");
  for (const parte of ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/worksheets/sheet3.xml"]) {
    assert.ok(contenido.includes(parte), `falta ${parte}`);
  }
  assert.ok(buffer.length > 1000);
});
