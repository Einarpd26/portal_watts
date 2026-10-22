// Prueba de la pantalla de importacion por lote (CU-16) en un navegador real.
// Uso: PORTAL_URL=http://localhost:3000 node e2e/importar-rutas.mjs [carpeta de capturas]
// Requiere el portal y Supabase locales con el seed recien cargado (supabase db reset).
// Con CONFIRMAR=1 tambien confirma la importacion y vuelve a importar el mismo archivo: eso guarda datos.
// Usuario: PORTAL_EMAIL / PORTAL_PASSWORD (por defecto el Fiscalizador de Santa Cruz del seed).
import { chromium } from 'playwright';
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const URL_BASE = process.env.PORTAL_URL ?? 'http://localhost:3000';
const SALIDA = resolve(process.argv[2] ?? 'e2e/salida');
const ARCHIVO = resolve('supabase/fixtures/rutas-lote-prueba.geojson');
mkdirSync(SALIDA, { recursive: true });

const resultados = [];
const verificar = (nombre, ok, detalle = '') => {
  resultados.push(ok);
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${nombre}${detalle ? ` -> ${detalle}` : ''}`);
};

const navegador = await chromium.launch();
const pagina = await (await navegador.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage();
const errores = [];
pagina.on('pageerror', (e) => errores.push(String(e)));
pagina.on('console', (m) => m.type() === 'error' && !m.text().includes('tiles.openfreemap') && errores.push(m.text()));

await pagina.goto(`${URL_BASE}/login`);
await pagina.locator('input[type=email]').fill(process.env.PORTAL_EMAIL ?? 'fiscalizador.scz@carameloswatts.com');
await pagina.locator('input[type=password]').fill(process.env.PORTAL_PASSWORD ?? 'Password123!');
await pagina.getByRole('button', { name: 'Iniciar Sesión' }).click();
await pagina.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

await pagina.goto(`${URL_BASE}/territorio`);
await pagina.getByRole('tab', { name: 'Importar rutas' }).click();
verificar('La pestaña Importar rutas existe y abre', await pagina.getByText('1. Sucursal').isVisible());
await pagina.screenshot({ path: `${SALIDA}/01-inicial.png` });

// Fiscalizador de Santa Cruz: la sucursal elegible es solo la suya
const opciones = await pagina.getByLabel('Sucursal de destino').locator('option').allTextContents();
verificar('Solo ofrece las sucursales del alcance', opciones.join('|') === 'Elige la sucursal|Santa Cruz', opciones.join('|'));
verificar('Vista previa deshabilitada sin sucursal ni archivo', await pagina.getByRole('button', { name: 'Ver vista previa' }).isDisabled());

await pagina.getByLabel('Sucursal de destino').selectOption({ label: 'Santa Cruz' });
await pagina.getByLabel('Archivo GeoJSON de rutas').setInputFiles(ARCHIVO);
await pagina.getByText('16 rutas leídas, 4 con errores en el archivo').waitFor();
verificar('Lee el archivo: 16 rutas y 4 con errores', true);
await pagina.screenshot({ path: `${SALIDA}/02-archivo.png` });

await pagina.getByRole('button', { name: 'Ver vista previa' }).click();
await pagina.getByLabel('Resultados de la vista previa').waitFor();
verificar('Aparece el panel de resultados a la derecha', true);
const caja = await pagina.getByLabel('Resultados de la vista previa').boundingBox();
verificar('El panel está en el lado derecho', caja !== null && caja.x > 900, `x=${caja?.x}`);
const filtros = await pagina.getByRole('group', { name: 'Filtrar por estado' }).innerText();
console.log('Filtros:', filtros.replace(/\n+/g, ' | '));
verificar('Muestra 20 rutas', /Todas\s*20/.test(filtros));
const conteo = filtros.replace(/\s+/g, ' ');
verificar('Conteos: 5 nuevas, 1 actualizada, 1 sin cambios, 13 rechazadas', /Nuevas 5/.test(conteo) && /Actualizadas 1/.test(conteo) && /Sin cambios 1/.test(conteo) && /Rechazadas 13/.test(conteo), conteo);
await pagina.waitForTimeout(2500); // deja cargar el mapa base
await pagina.screenshot({ path: `${SALIDA}/03-vista-previa.png` });

await pagina.getByRole('button', { name: /^Rechazadas/ }).click();
const filas = await pagina.getByLabel('Rutas del archivo').getByRole('listitem').count();
verificar('El filtro Rechazadas deja 13 filas', filas === 13, `filas=${filas}`);
await pagina.getByLabel('Rutas del archivo').getByRole('button').first().click();
verificar('Al elegir una rechazada muestra qué corregir en el origen', await pagina.getByText('Qué corregir en el origen').first().isVisible());
await pagina.waitForTimeout(1200);
await pagina.screenshot({ path: `${SALIDA}/04-rechazada-elegida.png` });

await pagina.getByLabel('Buscar ruta o zona').fill('r-s');
verificar('La búsqueda filtra por código', (await pagina.getByLabel('Rutas del archivo').getByRole('listitem').count()) >= 1);
await pagina.getByLabel('Buscar ruta o zona').fill('');

await pagina.getByRole('button', { name: 'Ocultar resultados' }).click();
verificar('Se pliega el panel de resultados', !(await pagina.getByLabel('Resultados de la vista previa').isVisible()));
await pagina.screenshot({ path: `${SALIDA}/05-plegado.png` });
await pagina.getByRole('button', { name: 'Mostrar resultados' }).click();

const [descarga] = await Promise.all([pagina.waitForEvent('download'), pagina.getByRole('button', { name: /Descargar informe/ }).click()]);
const destino = `${SALIDA}/${descarga.suggestedFilename()}`;
await descarga.saveAs(destino);
verificar('Descarga el informe en Excel', destino.endsWith('.xlsx') && statSync(destino).size > 2000, `${descarga.suggestedFilename()} ${statSync(destino).size} bytes`);

if (process.env.CONFIRMAR === '1') {
  await pagina.getByRole('button', { name: 'Confirmar importación (6)' }).click();
  await pagina.getByText(/Importación confirmada en Santa Cruz: 5 nuevas y 1 actualizadas/).waitFor({ timeout: 30000 });
  verificar('Confirma: 5 nuevas y 1 actualizada', true);
  await pagina.screenshot({ path: `${SALIDA}/06-confirmada.png` });

  // Segunda pasada con el mismo archivo: lo guardado queda sin cambios y lo rechazado sigue rechazado
  await pagina.getByRole('button', { name: 'Importar otro archivo' }).click();
  await pagina.getByLabel('Sucursal de destino').selectOption({ label: 'Santa Cruz' });
  await pagina.getByLabel('Archivo GeoJSON de rutas').setInputFiles(ARCHIVO);
  await pagina.getByRole('button', { name: 'Ver vista previa' }).click();
  await pagina.getByLabel('Resultados de la vista previa').waitFor();
  const segunda = (await pagina.getByRole('group', { name: 'Filtrar por estado' }).innerText()).replace(/\s+/g, ' ');
  verificar('Reimportación: 0 nuevas, 7 sin cambios, 13 rechazadas', /Nuevas 0/.test(segunda) && /Sin cambios 7/.test(segunda) && /Rechazadas 13/.test(segunda), segunda);
  verificar('Con nada para guardar, confirmar queda deshabilitado', await pagina.getByRole('button', { name: /Confirmar importación/ }).isDisabled());
  await pagina.screenshot({ path: `${SALIDA}/07-reimportacion.png` });
}

verificar('Sin errores en la consola del navegador', errores.length === 0, errores.slice(0, 3).join(' // '));
await navegador.close();
const fallas = resultados.filter((x) => !x).length;
console.log(`\n${resultados.length - fallas}/${resultados.length} verificaciones correctas`);
process.exit(fallas ? 1 : 0);
