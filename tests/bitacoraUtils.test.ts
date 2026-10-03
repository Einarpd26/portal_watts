import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { formatToUtcString, getClientIp, getClientUserAgent } from "../src/utils/bitacoraUtils.ts";

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

test("Bitácora Utils: getClientIp extrae la IP de x-forwarded-for con múltiples IPs", () => {
  const req = {
    headers: {
      "x-forwarded-for": "190.181.45.12, 10.0.0.1",
    },
    socket: {
      remoteAddress: "127.0.0.1",
    },
  } as unknown as IncomingMessage & { headers: Record<string, string | string[] | undefined> };

  const ip = getClientIp(req);
  assert.strictEqual(ip, "190.181.45.12");
});

test("Bitácora Utils: getClientIp recurre a x-real-ip o socket", () => {
  const reqWithRealIp = {
    headers: {
      "x-real-ip": "181.115.12.3",
    },
  } as unknown as IncomingMessage & { headers: Record<string, string | string[] | undefined> };
  assert.strictEqual(getClientIp(reqWithRealIp), "181.115.12.3");

  const reqFallback = {
    headers: {},
    socket: {
      remoteAddress: "192.168.1.100",
    },
  } as unknown as IncomingMessage & { headers: Record<string, string | string[] | undefined> };
  assert.strictEqual(getClientIp(reqFallback), "192.168.1.100");
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
