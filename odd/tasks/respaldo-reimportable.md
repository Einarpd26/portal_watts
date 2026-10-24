# Respaldo del territorio reimportable (ADR-002 D10)

## Objetivo
El respaldo GeoJSON de zona y «todo» (CU-05 A3) debe poder reimportarse con CU-16 para recuperar o actualizar rutas.

## Problema
Hoy el archivo trae un `Feature` `tipo: "zona"` por contorno (el importador lo rechaza como `datos_invalidos` y cuenta contra el tope), mezcla sucursales y no respeta los 250 rutas / 4 MB del lote.

## Alcance autorizado (decidido por el usuario)
- El respaldo NO incluye contornos de zona (se recalculan con las rutas).
- Un archivo por sucursal, partido en tandas de hasta `LOTE_MAX_RUTAS` (250) y `LOTE_MAX_BYTES` (4 MB), como el exportador de inventory-manager.
- Descargas múltiples, una por archivo (sin ZIP).
- La exportación de una sola ruta queda como hoy (un archivo directo).
- El importador no cambia.

## Diseño
- `utils/rutaExportacion.ts`: función pura `partirRespaldo` (agrupa por sucursal, parte por cantidad y bytes, JSON compacto) y nombres `territorio-<sucursal>-<fecha>-<n>.geojson`.
- Endpoint `/api/admin/rutas/exportar`: zona y «todo» con `resumen=1` (lista de archivos) y descarga de un archivo por petición (`archivo=<nombre>`), para no depender del límite de respuesta de Vercel (4,5 MB, sin verificar). No llama a `zonas_contorno`.
- Hook `exportar`: pide el resumen y descarga los archivos en secuencia.

## Configuración de pruebas
TDD: no habilitado explícitamente (fuente: sin configuración). Runner: `npm test` (node:test). Se escriben las pruebas junto con el código.

## Tareas
- [x] R1 Función pura `partirRespaldo` + pruebas (sin contornos, por sucursal, por cantidad y por bytes, nombres). 9 pruebas del archivo, 205/205 en total.
- [x] R2 Endpoint: resumen y descarga por archivo; sin contornos; una entrada de bitácora por archivo descargado.
- [x] R3 Hook: descargas múltiples en secuencia y aviso con la cantidad de archivos. El botón no cambia. **Probado solo por API, no en el navegador.**
- [ ] R4 Verificación de punta a punta (parcial, ver Progreso) y casos en la matriz CU-05 del repo de docs (pendiente).

## Checks
`npx tsc --noEmit`, `npx eslint` de los archivos tocados, `npm test`, reimportación real del respaldo en local.

## Progreso
- Docs (ADR-002 D10, CU-05 A3, Plan-Ciclo-2) ya en `main` del repo de docs (70bf468).
- Código en la rama `feat/respaldo-reimportable`: `tsc`, `eslint` y `npm test` (205/205) en verde.
- Verificado por API en local (Gerencia global): el resumen da un archivo por sucursal (Santa Cruz 139 rutas, Interdepartamental 2); el archivo descargado se reimporta en vista previa con 141 `sin_cambios` y 0 rechazadas; editar un nombre da `actualizada`; una zona y una ruta sola se exportan bien.
- **Defecto encontrado y corregido:** las rutas sin descripción salían con `descripcion_ruta: null` y el importador las rechazaba (`datos_invalidos`, 26 de 139 en Santa Cruz). Ya existía en el respaldo de una ruta. Ahora la propiedad se omite si no hay descripción.
- No verificado: la descarga múltiple en el navegador (la pausa de 400 ms entre archivos), el partido real en tandas con más de 250 rutas (solo por pruebas unitarias; la base local tiene 141), recuperar una ruta borrada con una importación real, y el límite de respuesta de Vercel.

## Siguiente paso
Probar en el navegador, subir la rama y abrir el PR; después, los casos de la matriz CU-05 en el repo de docs.
