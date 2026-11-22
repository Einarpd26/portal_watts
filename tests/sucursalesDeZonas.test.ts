import test from "node:test";
import assert from "node:assert/strict";
import { sucursalesDeZonas, zonaCompatible, zonasDeSucursal } from "../src/utils/sucursalesDeZonas.ts";
import type { ZonaDeRuta } from "../src/types/index.ts";

const zona = (id: number, id_sucursal: number, sucursal_nombre: string): ZonaDeRuta => ({ id, codigo_zona: `Z${id}`, zona: `Zona ${id}`, id_sucursal, sucursal_nombre });
const zonas = [zona(1, 2, "Sur"), zona(2, 2, "Sur"), zona(3, 1, "Central")];

test("sucursales: una por sucursal, ordenadas por nombre", () => {
  assert.deepEqual(sucursalesDeZonas(zonas), [{ id: 1, nombre: "Central" }, { id: 2, nombre: "Sur" }]);
  assert.deepEqual(sucursalesDeZonas([]), []);
});

test("zonas de la sucursal: sin sucursal son todas", () => {
  assert.deepEqual(zonasDeSucursal(zonas, null).map((z) => z.id), [1, 2, 3]);
  assert.deepEqual(zonasDeSucursal(zonas, 2).map((z) => z.id), [1, 2]);
  assert.deepEqual(zonasDeSucursal(zonas, 9), []);
});

test("zona elegida: se conserva si la sucursal la contiene y se limpia si no", () => {
  assert.equal(zonaCompatible(zonas, 2, 1), 1);
  assert.equal(zonaCompatible(zonas, 1, 1), null);
  assert.equal(zonaCompatible(zonas, null, 3), 3);
  assert.equal(zonaCompatible(zonas, 2, null), null);
});
