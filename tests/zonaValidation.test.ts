import test from "node:test";
import assert from "node:assert/strict";
import { validarZona, type ZonaEntrada } from "../src/utils/zonaValidation.ts";

const valida: ZonaEntrada = {
  codigo_zona: "zn",
  zona: "  Zona Norte ",
  descripcion_zona: " Norte de la ciudad ",
  canal_venta: " Minorista ",
  id_sucursal: 1,
};

test("zonas: normaliza el código a mayúsculas y recorta espacios", () => {
  const r = validarZona(valida, { exigirSucursal: true });
  assert.equal(r.isValid, true);
  assert.deepEqual(r.data, {
    codigo_zona: "ZN",
    zona: "Zona Norte",
    descripcion_zona: "Norte de la ciudad",
    canal_venta: "Minorista",
    id_sucursal: 1,
  });
});

test("zonas: los campos opcionales vacíos se guardan como null", () => {
  const r = validarZona({ ...valida, descripcion_zona: "  ", canal_venta: "" }, { exigirSucursal: true });
  assert.equal(r.data.descripcion_zona, null);
  assert.equal(r.data.canal_venta, null);
});

test("zonas: el código es obligatorio, acotado y sin espacios ni símbolos", () => {
  assert.ok(validarZona({ ...valida, codigo_zona: "  " }, { exigirSucursal: true }).errors.codigo_zona);
  assert.ok(validarZona({ ...valida, codigo_zona: "A".repeat(21) }, { exigirSucursal: true }).errors.codigo_zona);
  assert.ok(validarZona({ ...valida, codigo_zona: "Z N" }, { exigirSucursal: true }).errors.codigo_zona);
  assert.ok(validarZona({ ...valida, codigo_zona: "Z#1" }, { exigirSucursal: true }).errors.codigo_zona);
  assert.equal(validarZona({ ...valida, codigo_zona: "ZN-1_a" }, { exigirSucursal: true }).errors.codigo_zona, undefined);
});

test("zonas: el nombre tiene límites de longitud", () => {
  assert.ok(validarZona({ ...valida, zona: "A" }, { exigirSucursal: true }).errors.zona);
  assert.ok(validarZona({ ...valida, zona: "x".repeat(101) }, { exigirSucursal: true }).errors.zona);
});

test("zonas: descripción y canal tienen un máximo", () => {
  assert.ok(validarZona({ ...valida, descripcion_zona: "x".repeat(256) }, { exigirSucursal: true }).errors.descripcion_zona);
  assert.ok(validarZona({ ...valida, canal_venta: "x".repeat(51) }, { exigirSucursal: true }).errors.canal_venta);
});

test("zonas: la sucursal es obligatoria al crear pero no al editar", () => {
  const sinSucursal = { ...valida, id_sucursal: null };
  assert.ok(validarZona(sinSucursal, { exigirSucursal: true }).errors.id_sucursal);
  assert.equal(validarZona(sinSucursal, { exigirSucursal: false }).isValid, true);
  assert.ok(validarZona({ ...valida, id_sucursal: 0 }, { exigirSucursal: true }).errors.id_sucursal);
  assert.ok(validarZona({ ...valida, id_sucursal: 1.5 }, { exigirSucursal: true }).errors.id_sucursal);
});
