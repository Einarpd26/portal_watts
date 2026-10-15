# zona-correccion-sucursal

## Objetivo
Permitir corregir la sucursal de una zona registrada por error (CU-04 A4), sin abrir la edicion libre.

## Problema
Hoy el PATCH de zonas rechaza todo cambio de `id_sucursal`. Corregir un error de registro obliga a tocar la base desde el dashboard de Supabase, sin validacion ni rastro.

## Regla (documentada en Ing_Req_Mod_Angelica, commit fc8476f)
- Solo quien opera con **alcance global** (hoy Gerencia Comercial, RN-03). Criterio por alcance, no por nombre de rol.
- Solo si la zona **no tiene rutas ni supervisor asignado**.
- El codigo no debe existir en la sucursal destino (A2 -> 409).
- Confirmacion expresa y bitacora con sucursal anterior y nueva.
- Mensaje de falta de permiso generico: "No tienes permiso para corregir la sucursal de esta zona."

## Alcance autorizado
`src/utils`, `src/lib/zonas.ts`, `src/pages/api/admin/zonas/[id]/index.ts`, `src/components/territorio/FormularioZona.tsx`, `src/hooks/useGestionTerritorio.ts`, `src/types`, `tests/`, `supabase/migrations`, `supabase/tests/database`.

## Configuracion de pruebas
- TDD: no configurado en el proyecto ni elegido por el usuario; se aplican checks funcionales.
- Runner unitario: `npm test` (node:test). Base de datos: `npx supabase test db` (pgTAP).

## Tareas
- [x] T1 Util puro `estadoCorreccionSucursal` (permiso, rutas, supervisor) + pruebas unitarias.
- [x] T2 Migracion `zona_cambiar_sucursal` (atomica, con bloqueo de la fila) + pruebas pgTAP.
- [x] T3 Repositorio `cambiarSucursalZona` en `src/lib/zonas.ts`.
- [x] T4 API PATCH: permiso, confirmacion, errores y bitacora.
- [x] T5 UI: `FormularioZona` y hook (selector, aviso, confirmacion, mensajes por caso).
- [~] T6 Checks: `npm test`, lint, tipos, pgTAP; actualizar comentarios obsoletos.

## Criterios de aceptacion
CP-26 a CP-29 de `matriz-validacion-cu04-zonas.md`.

## Progreso y proximo paso
Evidencia observada:
- `npm test`: 140 de 140 pruebas (7 nuevas de estado y 2 de alcance global).
- `tsc --noEmit` y `eslint` sobre lo tocado: sin errores.
- pgTAP (`npx supabase test db`, migracion aplicada con `migration up`): las 7 pruebas nuevas de `zona_cambiar_sucursal` pasan. Fallan 3 pruebas previas y ajenas (rutas.test.sql #4 y #13, territorio.test.sql #16 "solo la zona ZC queda sin supervisor", have 2 want 1) porque la base local tiene datos extra de pruebas anteriores; confirmar con `supabase db reset`.
- PENDIENTE: verificacion manual en navegador de /territorio y del PATCH real (CP-26 a CP-29); commit.
