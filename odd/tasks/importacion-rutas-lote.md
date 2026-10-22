# Importación de rutas por lote (CU-16) y código de ruta único global

- **Estado:** fase de documentación en curso (borrador sin commit en `Ing_Req_Mod_Angelica`). Sin código aún.
- **Ciclo:** 3 (extiende CU-05, como CU-06).
- **Modo TDD / runner:** para la fase de código se resolverá con el usuario; el proyecto usa `node:test` (`npm test`) y pgTAP (`npx supabase test db`).

## Objetivo
Permitir cargar o actualizar muchas rutas a la vez desde un único GeoJSON `FeatureCollection`, con vista previa, informe por ruta y modo **parcial**, y que el sistema acepte datos de varias fuentes (ERP de `inventory-manager`, QGIS, otras) sin conocerlas.

## Decisiones acordadas con el usuario
1. El portal define un **formato de intercambio** (`FeatureCollection`); cada fuente tiene su exportador, fuera del alcance del portal. El exportador del ERP vive en `inventory-manager` (invierte lat/lon, cierra el anillo, aplica el prefijo `DEP-`, une `erp.rutas` con `erp.rutas_poligonos`).
2. Modo **parcial**: se importan las válidas y se informan las rechazadas.
3. Ruta existente: **actualiza** geometría, nombre y descripción; **nunca** cambia la zona (eso es CU-06). Idéntica = "sin cambios".
4. **`codigo_ruta` único global** (hoy es único por zona, `unique_ruta_zona`). Motivo: en el ERP es clave primaria y el archivo solo conoce `codigo_zona`/`codigo_ruta`; la identidad de la fuente coincide con la del portal. Verificado: 0 duplicados en la base local (10 rutas del seed). El portal no está en producción.
5. La **sucursal se elige en la pantalla** de importación (un archivo = una sucursal), no va en el archivo, porque `codigo_zona` es único solo por sucursal y los nombres de sucursal del ERP no coinciden con los del portal.
6. Se rechaza lo que cae fuera de Bolivia (detecta lat/lon invertidos, que pasan el chequeo de rango).

## Alcance autorizado
Documentación en `D:\90. Einar\Ing_Req_Mod_Angelica`. **Commit y push a `main` de ese repo: preguntar al usuario antes.** Nada de código del portal hasta que el usuario apruebe la documentación.

## Tareas
### Documentación
- [x] D1. `priorizacion-casos-de-uso.md`: fila CU-16 y justificación (encuadre: Ciclo 2 reabierto, el usuario lo autorizó)
- [x] D2. `especificacion-casos-de-uso.md`: CU-16; ajustado CU-05 (paso 6, A5, A6) y CU-06 (sin control de duplicado)
- [x] D3. `ADR-002`: D8 (código de ruta único global) y D9 (importación por lote parcial y formato de intercambio)
- [x] D4. `matriz-validacion-cu16-importacion-lote.md` nueva (19 CP, todos PENDIENTE); ajustados CP-14 de CU-05 y CP-15 de CU-06 a PENDIENTE
- [x] D5. `Informe-Final-de-Proyecto.md`: sincronizado (priorización, RF-07, DDL y tabla de `rutas`, CU-05, CU-06, CU-16, totales 132 de 138 + 19 de CU-16)
- [x] D6. `08_pruebas/README.md`: fila de CU-16 y conteos de CU-05 (66/3) y CU-06 (21/3)
- [x] D6b. (22 oct) Informe de correcciones: CU-16 A2/A6 + tipos de solape + canal, ADR-002 D9 puntos 10 y 11, matriz CU-16 con CP-20 y CP-21 (21 CP), README e Informe con 21. Escrito en el árbol de trabajo de docs, sin commit
- [x] D7. Publicado en `main` de docs: D1-D6 (6008f27) y D6b (aa0e040, informe en Excel)

### Código (pendiente de aprobar la documentación)
- [x] C1. Migración `20261022120000_ruta_codigo_unico_global.sql`: `UNIQUE (codigo_ruta)` global; falla listando los repetidos (verificado en transacción con un repetido); seed ajustado (`ON CONFLICT (codigo_ruta)`)
- [x] C2. `ruta_guardar` controla el duplicado antes de evaluar el polígono e informa `codigo_zona`; `ruta_trasladar` sin control de duplicado; API 409 con `mensajeCodigoDuplicado`. Verificado: `npm test` 142/142, pgTAP 79/79 tras `db reset`, `tsc` sin errores, lint 0 errores
- [ ] C2b. Ajustar los scripts de evidencia del repo de docs: A2b en `evidencia-api-rutas.py` (ahora 409) y T22 en `evidencia-api-traslado.py` (la homónima ya no se puede crear); volver a ejecutarlos con el servidor levantado y cerrar CP-14 de CU-05 y CP-15 de CU-06
- [ ] C3. Funciones de evaluación y guardado por lote (parcial, mismo bloqueo consultivo). Diseño: una sola función `ruta_lote_procesar(sucursal, items, ids_zona, confirmar)` que recorre el lote en orden y usa `ruta_evaluar`/`ruta_guardar`; sin confirmar, deshace todo al final (la vista previa es exactamente lo que haría la confirmación). Rama `feat/rutas-lote-funciones`
  - [x] C3a. `interpretarLoteRutas` en `src/utils/rutaValidation.ts` (no en un archivo aparte: `node --experimental-strip-types` no resuelve imports entre utils): lee y valida el `FeatureCollection` (límites, propiedades, Bolivia, códigos repetidos en el archivo) + 16 pruebas `node:test` en `tests/rutaLote.test.ts`
  - [x] C3b. Migración `20261022130000_ruta_lote_procesar.sql` + `rutas_lote.test.sql` (23 pruebas pgTAP: nuevas, actualizadas, sin cambios, en otra zona, zona inexistente, alcance, parcial, orden y vista previa que no guarda)
  - [x] C3c. Medido con las 306 rutas del ERP: 2,35 s en vista previa, sin necesidad de optimizar. HALLAZGO DE DATOS: de 301 polígonos válidos (5 son inválidos), 266 se superponen con al menos otro (581 pares; 285 pares superan el 50% del menor). La regla RN-01 rechazaría la mayoría; hay que decidir con el usuario qué hacer con los datos del ERP
- [ ] C3d. SQL del informe (rama `feat/rutas-lote-informe`, apilada sobre `feat/rutas-lote-funciones`/PR #11): `ruta_evaluar` agrega `area_ruta_m2` a cada conflicto; `ruta_guardar` agrega el `area_m2` propia al rechazo; `ruta_lote_procesar` devuelve `geojson_anterior` en las actualizadas (para la bitácora). La posición de una geometría inválida ya viene en `detalle` (`ST_IsValidReason`)
- [ ] C4a. `src/utils/rutaInforme.ts` (autónomo, sin imports entre utils): clasifica cada rechazo (astilla <1 %, solape chico 1-10 %, parcial 10-95 %, contenida en / contiene a >95 % respecto de la menor; geometría inválida, invasión, cobertura ajena, zona, alcance, en otra zona, fuera de Bolivia, código repetido) y arma la fila del informe con la acción para el origen + pruebas `node:test`
- [ ] C4b. Excel: `write-excel-file` (elegida el 22 oct; plan B `exceljs`), hojas Resumen y Rechazadas con títulos en negrita, color por tipo, texto en varias líneas y fila de títulos fija; se genera en el navegador con importación dinámica (sin viajar de vuelta al servidor) a partir del resultado real, no de una reevaluación (después de confirmar, las importadas figurarían "sin cambios"). Prueba: el mismo constructor genera un Buffer en Node y se revisa que sea un xlsx válido
- [ ] C4c. API `POST /api/admin/rutas/lote` (vista previa y confirmación): alcance (sucursal y zonas), `interpretarLoteRutas`, RPC, filas del informe, bitácora (un evento del lote con totales + la geometría anterior de cada actualizada, RNF-07)
- [ ] C5. Pantalla: selector de sucursal, vista previa en el mapa, conteos, lista filtrable
- [ ] C6. Pruebas (node:test, pgTAP, API, navegador) y caso real con las 306 rutas del ERP
- [ ] C7. Exportador en `inventory-manager`

## Criterios de aceptación
Los de la matriz de CU-16 (CP-01 a CP-21) más el CP-14 de CU-05 y el CP-15 de CU-06 ajustados.

## Progreso y próximo paso
C1 y C2 mergeados (PR #10). C3 (a, b, c) commiteado en la rama `feat/rutas-lote-funciones` (5d91a1d), sin push ni PR. Documentación D6b (informe de correcciones, en Excel) publicada en main de docs (aa0e040). Decisiones del 22 oct: los polígonos paraguas (525 de 69.769 km², que abarca un departamento, y 583, ecommerce, de 450 km², que contiene 191 rutas) se filtran en el exportador de `inventory-manager`; la 525 se importaría igual si no se solapa; el portal informa qué corregir en el origen, no propone polígonos. No se actualizaron el Word ni el PDF del Informe. Próximo paso: PR de C3, luego C3d y C4.
