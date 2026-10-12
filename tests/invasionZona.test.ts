import test from "node:test";
import assert from "node:assert/strict";
import { detalleInvasion, mensajeInvasion, mensajeInvasionTraslado, motivoInvasion } from "../src/utils/invasionZona.ts";
import type { ConflictoRuta } from "../src/types/index.ts";

const invasion = (c: Partial<ConflictoRuta>): ConflictoRuta => ({
  tipo: "invasion", id: 1, codigo_ruta: "R-S1", codigo_zona: "ZS", area_m2: 10, geojson: null, fuera_de_alcance: false, trasladable: true, ...c,
});

test("invasión: el motivo nombra la zona que crece", () => {
  assert.equal(motivoInvasion("ZN"), "La zona ZN pasaría a cubrir rutas de otra zona.");
});

test("invasión: sugiere trasladar la ruta cubierta a la zona que crece", () => {
  assert.equal(detalleInvasion("ZN", [invasion({})]), "Cubriría R-S1 (zona ZS). Ajusta el polígono o traslada R-S1 a la zona ZN.");
});

test("invasión: varias rutas se listan y solo se sugiere trasladar las trasladables", () => {
  const d = detalleInvasion("ZN", [invasion({}), invasion({ id: 2, codigo_ruta: "C-1", codigo_zona: "ZC", trasladable: false }), invasion({ id: 3, codigo_ruta: "R-S2" })]);
  assert.equal(d, "Cubriría R-S1 (zona ZS), C-1 (zona ZC) y R-S2 (zona ZS). Ajusta el polígono o traslada R-S1 y R-S2 a la zona ZN.");
});

test("invasión: una ruta fuera del alcance no revela su código ni se sugiere trasladar", () => {
  const fuera = invasion({ id: null, codigo_ruta: null, codigo_zona: null, fuera_de_alcance: true, trasladable: false });
  assert.equal(detalleInvasion("ZN", [fuera]), "Cubriría otra ruta fuera de tus zonas. Ajusta el polígono.");
  assert.equal(detalleInvasion("ZN", [fuera, fuera]), "Cubriría 2 rutas fuera de tus zonas. Ajusta el polígono.");
});

test("invasión: el mensaje completo une motivo y detalle", () => {
  assert.equal(mensajeInvasion("ZN", [invasion({})]), "La zona ZN pasaría a cubrir rutas de otra zona. Cubriría R-S1 (zona ZS). Ajusta el polígono o traslada R-S1 a la zona ZN.");
});

test("invasión en un traslado: lista las rutas cubiertas y sugiere trasladar primero las trasladables", () => {
  assert.equal(
    mensajeInvasionTraslado("ZN", [invasion({}), invasion({ id: null, codigo_ruta: null, codigo_zona: null, fuera_de_alcance: true, trasladable: false })]),
    "La zona ZN pasaría a cubrir rutas de otra zona. Cubriría R-S1 (zona ZS) y otra ruta fuera de tus zonas. Traslada primero R-S1 a la zona ZN."
  );
});

test("invasión en un traslado: sin rutas trasladables no hay sugerencia ni se pide ajustar el polígono", () => {
  assert.equal(
    mensajeInvasionTraslado("ZN", [invasion({ codigo_ruta: "C-1", codigo_zona: "ZC", trasladable: false })]),
    "La zona ZN pasaría a cubrir rutas de otra zona. Cubriría C-1 (zona ZC)."
  );
});
