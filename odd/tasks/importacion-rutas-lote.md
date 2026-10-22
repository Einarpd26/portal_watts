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
- [ ] D7. Revisión del usuario y, solo con su aprobación, commit y push

### Código (pendiente de aprobar la documentación)
- [x] C1. Migración `20261022120000_ruta_codigo_unico_global.sql`: `UNIQUE (codigo_ruta)` global; falla listando los repetidos (verificado en transacción con un repetido); seed ajustado (`ON CONFLICT (codigo_ruta)`)
- [x] C2. `ruta_guardar` controla el duplicado antes de evaluar el polígono e informa `codigo_zona`; `ruta_trasladar` sin control de duplicado; API 409 con `mensajeCodigoDuplicado`. Verificado: `npm test` 142/142, pgTAP 79/79 tras `db reset`, `tsc` sin errores, lint 0 errores
- [ ] C2b. Ajustar los scripts de evidencia del repo de docs: A2b en `evidencia-api-rutas.py` (ahora 409) y T22 en `evidencia-api-traslado.py` (la homónima ya no se puede crear); volver a ejecutarlos con el servidor levantado y cerrar CP-14 de CU-05 y CP-15 de CU-06
- [ ] C3. Funciones de evaluación y guardado por lote (parcial, mismo bloqueo consultivo)
- [ ] C4. API de importación por lote y descarga del informe
- [ ] C5. Pantalla: selector de sucursal, vista previa en el mapa, conteos, lista filtrable
- [ ] C6. Pruebas (node:test, pgTAP, API, navegador) y caso real con las 306 rutas del ERP
- [ ] C7. Exportador en `inventory-manager`

## Criterios de aceptación
Los de la matriz de CU-16 (CP-01 a CP-18) más el CP-14 ajustado de CU-05.

## Progreso y próximo paso
Documentación D1 a D6 escrita en el árbol de trabajo de `Ing_Req_Mod_Angelica` (7 archivos modificados + 1 nuevo), sin commit. Pendiente: aprobación del usuario (D7) y su permiso para commit/push a `main`. No se actualizaron el Word ni el PDF del Informe. Los CP de CU-16 son 19 (no 18). Tras la aprobación, empezar por C1 (migración) en una rama nueva del portal.
