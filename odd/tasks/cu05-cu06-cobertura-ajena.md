# Una zona no debe cubrir nunca rutas de otras zonas (cobertura ajena) - CU-05 y CU-06

**Objective:** a zone envelope must never cover routes of other zones, also when the route that
lands inside an existing foreign envelope is a *new* or *moved* one (ADR-002 D7 only checked the
zone that grows). Business decision from the user (12 Oct 2026): "la envolvente de una zona no
debe de cubrir nunca rutas de otras zonas".

**Problem:** CP-22 (CU-06) showed that traslado first, then alta of a route inside ZT1's envelope,
is accepted and ZT1 ends up covering a foreign route.

**Rule to add:** when saving (alta/edit) or moving a route, reject it if its polygon would sit
inside (interior-intersect, `T********`) the envelope of ANOTHER zone, except when it already did
(inherited, same exemption as D7 point 1). On a traslado the source zone gets no exemption: its
envelope without the route must not cover it.

**Authorized scope:** SQL (new migration, replaces ruta_evaluar / ruta_guardar / ruta_trasladar
bodies, adds zona_coberturas_ajenas), TS plumbing and messages, tests, docs (ADR-002 D7, specs,
matrices). No other behavior changes.

**Mode:** TDD off by config; ordinary checks: pgTAP + npm test + tsc + eslint + API pass.

## Tasks
- [x] T1 Migration `20261012020000_ruta_cobertura_ajena.sql` + pgTAP (rutas.test.sql)
- [x] T2 TS plumbing: types, rutas.ts, rutasApi.ts, validar.ts, trasladar.ts, database.ts
- [x] T3 Messages (invasionZona.ts) + BarraModoMapa + unit tests
- [x] T4 Apply migration locally, run pgTAP, npm test, tsc, eslint
- [x] T5 API evidence: re-run cierre-ciclo2 (CP-22 now expects a rejection), CU-06 and CU-05 passes, fix scripts
- [x] T6 Docs: ADR-002 amendment, spec CU-05 A4 / CU-06 A3, matrices (CP-22 and new cases), README, plan
- [x] T7 Commit in both repos (no push)

## Acceptance
- Traslado-first then alta inside the envelope: the alta is rejected (409) with a clear message.
- A route inherited inside a foreign envelope still can be edited (data and polygon) without block.
- Traslado that would leave the source envelope covering the moved route is rejected.
- Seed routes and local data untouched after the passes.

## Progress / evidence
- pgTAP 69/69 (rutas.test.sql plan 43: +9 cobertura ajena); npm test 126/126; tsc and eslint clean.
- API: cierre-ciclo2 29/29 (CP-22 now rejects, both orders observed); traslado 31/31; rutas 91/91 after adapting A6/K1/K2/X7a to D7.
- UI: cierre-ciclo2.mjs CP-68 (cobertura) shows amber contour + message; capture cu05-cobertura-ajena.png.
- Local DB: R-N1 restored to seed (ZN, original box) to run pgTAP; previous state saved in scratchpad r-n1-antes.txt.
