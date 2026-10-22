import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CUERPO_MAX_PLATAFORMA_BYTES, LOTE_MAX_BYTES } from "../src/utils/rutaValidation.ts";

// Next exige un valor literal en `config.api.bodyParser.sizeLimit`: no puede importar LOTE_MAX_BYTES. Este
// test lee ese literal y comprueba que siga alineado con la constante y con el tope de la plataforma.
const fuente = readFileSync(new URL("../src/pages/api/admin/rutas/lote.ts", import.meta.url), "utf8");

function sizeLimitEnBytes(): number {
  const m = fuente.match(/sizeLimit:\s*'([\d.]+)mb'/);
  assert.ok(m, "no se encontró sizeLimit en 'N mb' en pages/api/admin/rutas/lote.ts");
  return Number(m[1]) * 1024 * 1024; // Next interpreta 'mb' como 1024 * 1024 bytes
}

test("límite del lote: el archivo siempre cabe bajo el tope de la plataforma", () => {
  assert.ok(
    LOTE_MAX_BYTES < CUERPO_MAX_PLATAFORMA_BYTES,
    `LOTE_MAX_BYTES (${LOTE_MAX_BYTES}) debe ser menor que el tope de la plataforma (${CUERPO_MAX_PLATAFORMA_BYTES}): ` +
      "si se necesita más, cambiar cómo viaja el archivo (compresión o almacenamiento) en vez de subir el número"
  );
});

test("límite del lote: el sizeLimit de la API no rechaza antes que la validación del archivo", () => {
  assert.ok(
    sizeLimitEnBytes() >= LOTE_MAX_BYTES,
    "sizeLimit de pages/api/admin/rutas/lote.ts es menor que LOTE_MAX_BYTES: Next cortaría con 413 un archivo que es válido"
  );
});

test("límite del lote: el sizeLimit de la API no supera el tope de la plataforma", () => {
  assert.ok(
    sizeLimitEnBytes() < CUERPO_MAX_PLATAFORMA_BYTES,
    "sizeLimit de pages/api/admin/rutas/lote.ts supera el tope de la plataforma: no serviría de nada"
  );
});
