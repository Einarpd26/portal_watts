import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import {
  construirFiltroBitacoraSucursal,
  formatToUtcString,
  getClientIp,
  getClientUserAgent,
  sanitizarTerminoBusqueda,
} from "../src/utils/bitacoraUtils.ts";

test("búsqueda: un término normal se conserva", () => {
  assert.strictEqual(sanitizarTerminoBusqueda("gerencia"), "gerencia");
  assert.strictEqual(sanitizarTerminoBusqueda("  juan perez  "), "juan perez");
});

test("búsqueda: se eliminan los caracteres que romperían el filtro PostgREST o LIKE", () => {
  // Intento de inyectar una condición extra con coma y de usar comodines LIKE
  assert.strictEqual(
    sanitizarTerminoBusqueda("x,id.gt.0"),
    "xid.gt.0"
  );
  assert.strictEqual(sanitizarTerminoBusqueda('a%_*b"()'), "ab");
});

test("búsqueda: un término que queda vacío tras limpiarlo devuelve null", () => {
  assert.strictEqual(sanitizarTerminoBusqueda("%_*"), null);
  assert.strictEqual(sanitizarTerminoBusqueda("   "), null);
});

test("Bitácora UTC 0: formatToUtcString formatea correctamente en UTC", () => {
  // Fecha fija en UTC: 2026-10-02T21:15:00.000Z
  const isoUtc = "2026-10-02T21:15:00.000Z";
  const formatted = formatToUtcString(isoUtc);
  assert.strictEqual(formatted, "2026-10-02 21:15:00 UTC");
});

test("Bitácora UTC 0: formatToUtcString maneja fechas locales convirtiéndolas a UTC 0", () => {
  // Objeto Date con hora específica
  const date = new Date("2026-05-18T00:30:45.000Z");
  const formatted = formatToUtcString(date);
  assert.strictEqual(formatted, "2026-05-18 00:30:45 UTC");
});

test("Bitácora UTC 0: formatToUtcString maneja entradas nulas o inválidas con elegancia", () => {
  assert.strictEqual(formatToUtcString(null), "N/A");
  assert.strictEqual(formatToUtcString(undefined), "N/A");
  assert.strictEqual(formatToUtcString("fecha-invalida"), "Fecha inválida");
});

type FakeReq = IncomingMessage & { headers: Record<string, string | string[] | undefined> };

test("Bitácora Utils: getClientIp ignora x-forwarded-for por defecto (anti-spoofing)", () => {
  const req = {
    headers: { "x-forwarded-for": "6.6.6.6", "x-real-ip": "7.7.7.7" },
    socket: { remoteAddress: "192.168.1.100" },
  } as unknown as FakeReq;

  assert.strictEqual(getClientIp(req, 0), "192.168.1.100");
});

test("Bitácora Utils: getClientIp con proxys de confianza cuenta desde la derecha", () => {
  const req = {
    headers: { "x-forwarded-for": "6.6.6.6, 190.181.45.12, 10.0.0.1" },
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as FakeReq;

  // 1 proxy de confianza: la última entrada es la que él agregó
  assert.strictEqual(getClientIp(req, 1), "10.0.0.1");
  assert.strictEqual(getClientIp(req, 2), "190.181.45.12");
  // Más saltos que entradas: cae al socket
  assert.strictEqual(getClientIp(req, 9), "127.0.0.1");
});

test("Bitácora Utils: getClientIp sin socket devuelve 'desconocida'", () => {
  const req = { headers: {} } as unknown as FakeReq;
  assert.strictEqual(getClientIp(req, 0), "desconocida");
});

test("Bitácora Utils: getClientUserAgent extrae el user-agent correctamente", () => {
  const req = {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    },
  } as unknown as IncomingMessage & { headers: Record<string, string | string[] | undefined> };

  assert.strictEqual(getClientUserAgent(req), "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36");

  const reqEmpty = {
    headers: {},
  } as unknown as IncomingMessage & { headers: Record<string, string | string[] | undefined> };
  assert.strictEqual(getClientUserAgent(reqEmpty), "Desconocido");
});

test("Bitácora Utils: construirFiltroBitacoraSucursal combina actor, destino y correo", () => {
  const filtro = construirFiltroBitacoraSucursal([1, 2], ["a@x.com"]);
  assert.strictEqual(
    filtro,
    'id_persona.in.(1,2),detalles_json->>id_persona.in.(1,2),usuario_email.in.("a@x.com")'
  );
});

test("Bitácora Utils: construirFiltroBitacoraSucursal escapa comillas en correos", () => {
  const filtro = construirFiltroBitacoraSucursal([], ['a"b@x.com']);
  assert.strictEqual(filtro, 'usuario_email.in.("a\\"b@x.com")');
});

test("Bitácora Utils: construirFiltroBitacoraSucursal devuelve null sin personal", () => {
  assert.strictEqual(construirFiltroBitacoraSucursal([], []), null);
});
