// Genera supabase/fixtures/rutas-lote-prueba.geojson: un lote para probar la importacion por lote (CU-16)
// contra la base local con el seed (sucursal "Santa Cruz"). Cubre todos los estados y los tipos de rechazo.
// Uso: node scripts/generar-geojson-prueba-lote.mjs
import { writeFileSync } from 'node:fs';

const caja = (x0, y0, x1, y1) => [[[x0, y0], [x0, y1], [x1, y1], [x1, y0], [x0, y0]]];
const celda = (x0, y0, lado = 0.01) => caja(x0, y0, +(x0 + lado).toFixed(6), +(y0 + lado).toFixed(6));

const ruta = (codigo_ruta, ruta, codigo_zona, coordinates, descripcion_ruta = null) => ({
  type: 'Feature',
  properties: { codigo_ruta, ruta, codigo_zona, ...(descripcion_ruta ? { descripcion_ruta } : {}) },
  geometry: { type: 'Polygon', coordinates },
});

// El seed deja una cuadricula de celdas de 0,01 grados: ZN en y -17.79..-17.78 y ZS en y -17.80..-17.79,
// x de -63.20 a -63.16. ZC (Zona Centro) no tiene rutas.
const features = [
  // --- Nuevas (5) ---
  ruta('PRB-N01', 'Prueba Centro 1', 'ZC', celda(-63.15, -17.79), 'Zona Centro, primera cuadra'),
  ruta('PRB-N02', 'Prueba Centro 2', 'ZC', celda(-63.14, -17.79)),
  ruta('PRB-N03', 'Prueba Centro 3', 'ZC', celda(-63.13, -17.79)),
  ruta('PRB-N04', 'Prueba Norte 5', 'ZN', celda(-63.16, -17.79)),
  ruta('PRB-N05', 'Prueba Sur 5', 'ZS', celda(-63.16, -17.8)),

  // --- Actualizada (1): R-N1 se achica y cambia de nombre; su zona no cambia ---
  ruta('R-N1', 'Ruta Norte 1 (ajustada)', 'ZN', caja(-63.199, -17.789, -63.191, -17.781), 'Sector norte, primera cuadra'),
  // --- Sin cambios (1): R-S1 tal como esta en el seed ---
  ruta('R-S1', 'Ruta Sur 1', 'ZS', celda(-63.2, -17.8), 'Sector sur, primera cuadra'),

  // --- Rechazadas por el archivo ---
  ruta('PRB-N01', 'Prueba repetida', 'ZC', celda(-63.3, -17.79)), // codigo repetido en el archivo
  ruta('PRB R05', 'Codigo con espacio', 'ZC', celda(-63.31, -17.79)), // datos invalidos
  ruta('PRB-R03', 'Latitud y longitud invertidas', 'ZN', caja(-17.79, -63.2, -17.78, -63.19)), // fuera de Bolivia
  { type: 'Feature', properties: { codigo_ruta: 'PRB-R06', ruta: 'No es un poligono', codigo_zona: 'ZN' }, geometry: { type: 'Point', coordinates: [-63.18, -17.78] } }, // geometria

  // --- Rechazadas por la base de datos ---
  ruta('PRB-R01', 'Zona que no existe', 'ZX', celda(-63.32, -17.79)), // zona inexistente
  ruta('R-S2', 'Ruta que ya esta en ZS', 'ZN', celda(-63.19, -17.8)), // el codigo ya esta en otra zona
  ruta('PRB-R07', 'Lazo (se cruza a si misma)', 'ZC', [[[-63.34, -17.79], [-63.33, -17.78], [-63.33, -17.79], [-63.34, -17.78], [-63.34, -17.79]]]), // geometria invalida
  ruta('PRB-R08', 'Astilla sobre R-N3', 'ZN', celda(-63.18, -17.78005)), // menos del 1 % de R-N3
  ruta('PRB-R09', 'Solape chico sobre R-N4', 'ZN', celda(-63.17, -17.7805)), // 5 %
  ruta('PRB-R10', 'Solape parcial sobre R-S3 y R-S4', 'ZS', celda(-63.175, -17.805)), // 25 % de cada una
  ruta('PRB-R11', 'Contenida en R-S1', 'ZS', celda(-63.197, -17.797, 0.004)), // dentro de otra ruta
  ruta('PRB-R12', 'Contiene a R-S1', 'ZS', caja(-63.205, -17.805, -63.185, -17.785)), // contiene a otras
  ruta('PRB-R13', 'Invade a Zona Centro', 'ZN', celda(-63.12, -17.79)), // el contorno de ZN taparia las rutas de ZC
];

const salida = new URL('../supabase/fixtures/rutas-lote-prueba.geojson', import.meta.url);
writeFileSync(salida, JSON.stringify({ type: 'FeatureCollection', features }, null, 2) + '\n');
console.log(`${features.length} rutas -> supabase/fixtures/rutas-lote-prueba.geojson`);
