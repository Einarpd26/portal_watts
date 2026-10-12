import test from "node:test";
import assert from "node:assert/strict";
import { descripcionSuperposicion, detalleInvasion, mensajeCobertura, mensajeCoberturaTraslado, mensajeInvasion, mensajeInvasionTraslado, motivoInvasion, revisionDeZonasAjenas } from "../src/utils/invasionZona.ts";
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

const cobertura = (c: Partial<ConflictoRuta>): ConflictoRuta => ({
  tipo: "cobertura", id: null, codigo_ruta: null, codigo_zona: "ZS", area_m2: 10, geojson: null, fuera_de_alcance: false, trasladable: false, ...c,
});

test("cobertura: nombra la zona cuyo contorno cubriría la ruta y pide ajustar el polígono", () => {
  assert.equal(
    mensajeCobertura([cobertura({})]),
    "La ruta quedaría dentro del contorno de la zona ZS, y una zona no puede cubrir rutas de otra. Ajusta el polígono."
  );
});

test("cobertura: una zona fuera del alcance se nombra y se pide a Gerencia o al Fiscalizador que la modifiquen", () => {
  assert.equal(
    mensajeCobertura([cobertura({ codigo_zona: "ZC", fuera_de_alcance: true })]),
    "La ruta quedaría dentro del contorno de la zona ZC (fuera de tus zonas), y una zona no puede cubrir rutas de otra. Ajusta el polígono o pide a la Gerencia o al Fiscalizador que modifiquen la zona ZC."
  );
});

test("cobertura: varias zonas se listan y solo se pide modificar las ajenas", () => {
  assert.equal(
    mensajeCobertura([cobertura({}), cobertura({ codigo_zona: "ZC", fuera_de_alcance: true })]),
    "La ruta quedaría dentro del contorno de las zonas ZS y ZC (fuera de tus zonas), y una zona no puede cubrir rutas de otra. Ajusta el polígono o pide a la Gerencia o al Fiscalizador que modifiquen la zona ZC."
  );
});

test("cobertura en un traslado: la zona de origen la seguiría cubriendo", () => {
  assert.equal(
    mensajeCoberturaTraslado([cobertura({ codigo_zona: "ZG" })]),
    "El contorno de la zona ZG seguiría cubriendo la ruta tras el traslado, y una zona no puede cubrir rutas de otra. Traslada antes las rutas de esa zona que la rodean."
  );
});

test("invasión: una ruta fuera del alcance revela la zona (no el código) y se pide revisarla", () => {
  const ajena = invasion({ id: null, codigo_ruta: null, codigo_zona: "ZC", fuera_de_alcance: true, trasladable: false });
  assert.equal(
    detalleInvasion("ZN", [ajena]),
    "Cubriría otra ruta de la zona ZC (fuera de tus zonas). Ajusta el polígono. Pide a la Gerencia o al Fiscalizador que revisen la zona ZC."
  );
  assert.equal(
    detalleInvasion("ZN", [ajena, ajena, invasion({})]),
    "Cubriría R-S1 (zona ZS) y 2 rutas de la zona ZC (fuera de tus zonas). Ajusta el polígono o traslada R-S1 a la zona ZN. Pide a la Gerencia o al Fiscalizador que revisen la zona ZC."
  );
});

test("superposición: lista las rutas visibles y la zona de las que están fuera del alcance", () => {
  const ajena = invasion({ tipo: "superposicion", id: null, codigo_ruta: null, codigo_zona: "ZC", fuera_de_alcance: true, trasladable: false });
  assert.equal(descripcionSuperposicion([invasion({ tipo: "superposicion" }), ajena]), "R-S1 (zona ZS) y otra ruta de la zona ZC (fuera de tus zonas)");
  assert.equal(revisionDeZonasAjenas([ajena]), "Pide a la Gerencia o al Fiscalizador que revisen la zona ZC.");
  assert.equal(revisionDeZonasAjenas([invasion({ tipo: "superposicion" })]), "");
});
