# CU-06: Trasladar ruta entre zonas

**Objective:** Implement route transfer between zones of the same branch (sucursal), restricted to Gerencia and Fiscalizador.

**Why:** Completes Ciclo 2 / Fase D. Only remaining CU in the cycle.

**Scope:** Actors Gerencia Comercial + Fiscalizador (not Supervisor). Same sucursal constraint (ADR-002 D4). Polygon unchanged. RN-05 (planificacion_rutas) deferred to Ciclo 3 / CU-09.

**Constraints:**
- Supervisor role cannot transfer (403 at API layer, hidden button at UI layer)
- Destination zone must be in the same sucursal as the route
- Destination zone must be within caller's scope

---

## Tasks

- [x] **T1 — lib:** Add `trasladarRuta(id, idZonaDestino)` to `src/lib/rutas.ts`
- [x] **T2 — API:** `src/pages/api/admin/rutas/[id]/trasladar.ts` (POST) — also promoted `[id].ts` → `[id]/index.ts`
- [x] **T3 — Modal:** `src/components/territorio/TrasladarRutaModal.tsx`
- [x] **T4 — Wire:** `ListaRutas` + `RutasPanel` wired to modal + API; exposed `showToast`/`reload` from hook

## Acceptance criteria

- Gerencia can transfer any route to any zone of the same sucursal
- Fiscalizador can transfer routes within their sucursal
- Supervisor gets 403 from API and sees no button
- Destination zone from another sucursal is rejected (400)
- Transfer is recorded in bitácora (TERRITORIO / TRASLADAR_RUTA)
- A toast confirms success; the list refreshes

## Applicable checks

- `npm test` — relevant tests pass
- TypeScript: `tsc --noEmit` exit 0
- Manual: browser test golden path (Gerencia transfers a route)

## Rollback boundary

Remove `trasladar.ts`, revert `rutas.ts` (remove `trasladarRuta`), revert `ListaRutas.tsx` and `RutasPanel.tsx` (remove `onTrasladar` prop + modal state), delete `TrasladarRutaModal.tsx`.
