import test from "node:test";
import assert from "node:assert/strict";
import { alcanceDeClientes } from "../src/utils/clientesScope.ts";
import { CLASES_ABC, FILTROS_INICIALES, colorDeCliente, COLOR_SIN_CLASE, conteoPorClase, filtrarClientes, tieneUbicacion } from "../src/utils/clientesMapa.ts";
import type { ClaseAbc, ClienteMapa } from "../src/types/index.ts";

const rol = (codigo: string, alcance_tipo: string, id_sucursal: number | null, permisos = ["mapa:consultar"]) => ({ codigo, permisos, alcance_tipo, id_sucursal });

const cliente = (id: number, id_ruta: number, clasificacion: ClaseAbc | null, extra: Partial<ClienteMapa> = {}): ClienteMapa => ({
  id,
  codigo_cliente: `C-${id}`,
  nombre_completo: `Cliente ${id}`,
  nombre_comercial: null,
  direccion: `Calle ${id}`,
  referencia: null,
  rubro: "Tienda",
  telefono: null,
  latitud: -17.78,
  longitud: -63.18,
  id_ruta,
  clasificacion,
  total_ventas: 100,
  porcentaje_acumulado: 0.5,
  ultima_compra: null,
  ...extra,
});

test("alcance: sin el permiso de consulta se deniega", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("SUPERVISOR", "SUCURSAL", 1, [])] }), { tipo: "denegado" });
  assert.deepEqual(alcanceDeClientes({ roles: [] }), { tipo: "denegado" });
});

test("alcance: Gerencia con alcance global ve toda la empresa", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("GERENCIA_COMERCIAL", "GLOBAL", null)] }), { tipo: "global" });
});

test("alcance: el Fiscalizador queda acotado a su sucursal", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("FISCALIZADOR", "SUCURSAL", 2)] }), {
    tipo: "acotado",
    sucursales: [2],
    comoSupervisor: false,
    comoVendedor: false,
  });
});

test("alcance: el Supervisor y el Vendedor se resuelven por zonas y por rutas titulares, no por sucursal", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("SUPERVISOR", "SUCURSAL", 1)] }), { tipo: "acotado", sucursales: [], comoSupervisor: true, comoVendedor: false });
  assert.deepEqual(alcanceDeClientes({ roles: [rol("VENDEDOR", "SUCURSAL", 1)] }), { tipo: "acotado", sucursales: [], comoSupervisor: false, comoVendedor: true });
});

test("alcance: con varios roles se une lo que permite cada uno, y el global gana", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("FISCALIZADOR", "SUCURSAL", 1), rol("SUPERVISOR", "SUCURSAL", 1)] }), {
    tipo: "acotado",
    sucursales: [1],
    comoSupervisor: true,
    comoVendedor: false,
  });
  assert.deepEqual(alcanceDeClientes({ roles: [rol("SUPERVISOR", "SUCURSAL", 1), rol("GERENCIA_COMERCIAL", "GLOBAL", null)] }), { tipo: "global" });
});

test("alcance: un rol de sucursal sin sede no puede acotarse y se deniega", () => {
  assert.deepEqual(alcanceDeClientes({ roles: [rol("FISCALIZADOR", "SUCURSAL", null)] }), { tipo: "denegado" });
});

test("color: cada clase tiene el suyo y el no habilitado es gris", () => {
  const colores = CLASES_ABC.map((c) => colorDeCliente(c));
  assert.equal(new Set(colores).size, CLASES_ABC.length);
  assert.equal(colorDeCliente(null), COLOR_SIN_CLASE);
  assert.equal(colores.includes(COLOR_SIN_CLASE), false);
});

test("filtros: sin filtros activos se ve todo", () => {
  const clientes = [cliente(1, 1, "A"), cliente(2, 1, "I"), cliente(3, 2, null)];
  assert.equal(filtrarClientes(clientes, FILTROS_INICIALES).length, 3);
});

test("filtros: por clase, por ruta y los no habilitados se ocultan aparte", () => {
  const clientes = [cliente(1, 1, "A"), cliente(2, 1, "B"), cliente(3, 2, "A"), cliente(4, 2, null)];
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, clases: new Set<ClaseAbc>(["A"]) }).map((c) => c.id), [1, 3, 4]);
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, clases: new Set<ClaseAbc>(["A"]), sinClase: false }).map((c) => c.id), [1, 3]);
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, idRuta: 2 }).map((c) => c.id), [3, 4]);
});

test("filtros: la búsqueda ignora mayúsculas y tildes y mira código, nombre y dirección", () => {
  const clientes = [cliente(1, 1, "A", { nombre_completo: "Tienda Don José" }), cliente(2, 1, "A", { direccion: "Av. Cañoto 10" })];
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, texto: "jose" }).map((c) => c.id), [1]);
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, texto: "CANOTO" }).map((c) => c.id), [2]);
  assert.deepEqual(filtrarClientes(clientes, { ...FILTROS_INICIALES, texto: "c-2" }).map((c) => c.id), [2]);
});

test("conteo: cuenta cada clase y los sin clasificar", () => {
  const conteo = conteoPorClase([cliente(1, 1, "A"), cliente(2, 1, "A"), cliente(3, 1, "I"), cliente(4, 1, null)]);
  assert.deepEqual(conteo, { A: 2, B: 0, C: 0, I: 1, sinClase: 1 });
});

test("ubicación: un cliente sin coordenadas no se puede dibujar", () => {
  assert.equal(tieneUbicacion(cliente(1, 1, "A")), true);
  assert.equal(tieneUbicacion(cliente(2, 1, "A", { latitud: null, longitud: null })), false);
});

test("formato: fecha, porcentaje y monto de la ficha del cliente", async () => {
  const { formatearFecha, formatearPorcentaje, formatearMonto } = await import("../src/utils/formatoClientes.ts");
  assert.equal(formatearFecha("2026-11-17"), "17/11/2026");
  assert.equal(formatearFecha(null), null);
  assert.equal(formatearPorcentaje(0.8234), "82 %");
  assert.ok(formatearMonto(12345.5).startsWith("Bs 12"));
});
