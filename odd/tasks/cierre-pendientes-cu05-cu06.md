# Cierre de pendientes verificables de CU-05 y CU-06 (Ciclo 2)

**Objective:** close the pending validation cases that can be checked without a real device or the
4G network, and record the evidence in the docs repo (`Ing_Req_Mod_Angelica`).

**Authorized scope (user, 12 Oct 2026):** tick the overlap-tests item and fix its count; close
CP-35, CP-63, CP-66 (CU-05) and CP-22 (CU-06) with scripts; close CP-34 on screen with a file.
No product-code changes unless a defect blocks a case (then report, do not fix silently).

**Mode:** TDD off (evidence scripts, not product code). Runner: python API scripts + Chrome CDP.

## Tasks
- [x] T1 Tick "pruebas de superposición" in the plan and fix the pgTAP count (20 -> current)
- [x] T2 CP-35 supervisor without zones (API + screen)
- [x] T3 CP-63 out-of-scope invasion against the API with a supervisor
- [x] T4 CP-66 concurrent altas in neighbouring zones (invasion rule)
- [x] T5 CP-22 concurrent traslado + alta (CU-06)
- [x] T6 CP-34 replace polygon from a file on screen
- [x] T7 Update matrices, README counts, plan; commit in the docs repo (no push)

## Acceptance
- Each closed case has script evidence and a raw results JSON in `08_pruebas/evidencia/`.
- Seed data intact after every script (10 routes, zones, supervisor_zonas restored).
- Anything that fails is recorded as such, with the observed output.

## Progress / evidence
- API `evidencia-api-cierre-ciclo2.py`: 28/28 (CP-35, CP-63, CP-66, CP-22 M0-M5); run twice after the last edit.
- UI `ui/cierre-ciclo2.mjs`: CP-35 and CP-34 observed with Chrome CDP; 3 captures.
- CP-22 not APROBADO: traslado-first order lets the alta land inside ZT1 hull (rule checks only the growing zone). Business decision pending.
- Local DB: R-N1 was edited and moved to ZC by Gerencia at 17:48 (not by these scripts); left untouched. New scripts use temp zones ZT1..ZT4 and leave 10 seed routes.
