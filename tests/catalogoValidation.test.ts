import test from "node:test";
import assert from "node:assert";
import { esCatalogoTipo, validarCatalogo } from "../src/utils/catalogoValidation.ts";

test("catálogos: solo sucursales y cargos son tipos válidos", () => {
  assert.strictEqual(esCatalogoTipo("sucursales"), true);
  assert.strictEqual(esCatalogoTipo("cargos"), true);
  assert.strictEqual(esCatalogoTipo("roles"), false);
  assert.strictEqual(esCatalogoTipo(undefined), false);
});

test("catálogos: normaliza espacios y acepta datos válidos", () => {
  const r = validarCatalogo("sucursales", "  La Paz ", " Sede occidental ");
  assert.strictEqual(r.isValid, true);
  assert.deepStrictEqual(r.data, { nombre: "La Paz", descripcion: "Sede occidental" });
});

test("catálogos: el nombre es obligatorio y acotado", () => {
  assert.ok(validarCatalogo("cargos", " ", "").errors.nombre);
  assert.ok(validarCatalogo("cargos", "A", "").errors.nombre);
  assert.ok(validarCatalogo("cargos", "x".repeat(101), "").errors.nombre);
});

test("catálogos: la descripción es obligatoria en sucursales y opcional en cargos", () => {
  assert.ok(validarCatalogo("sucursales", "Oruro", "  ").errors.descripcion);
  assert.strictEqual(validarCatalogo("cargos", "Cajero", "").isValid, true);
});

test("catálogos: la descripción no puede superar el máximo", () => {
  assert.ok(validarCatalogo("cargos", "Cajero", "x".repeat(256)).errors.descripcion);
});
