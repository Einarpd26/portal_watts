import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluarEstadoBloqueo,
  calcularEscalamientoBloqueo,
  generarMensajeIntentoFallido,
} from "../src/utils/lockoutUtils.ts";

test("Bloqueo OWASP: Cuenta sin registro previo está libre con 3 intentos restantes", () => {
  const evalResult = evaluarEstadoBloqueo(null);
  assert.strictEqual(evalResult.bloqueado, false);
  assert.strictEqual(evalResult.estado, "LIBRE");
  assert.strictEqual(evalResult.intentosRestantes, 3);
});

test("Bloqueo OWASP: Mensajes preventivos de intentos restantes (1 y 2 fallos)", () => {
  assert.strictEqual(
    generarMensajeIntentoFallido(1),
    "Correo o contraseña incorrectos. Te quedan 2 intento(s) antes del bloqueo de seguridad."
  );
  assert.strictEqual(
    generarMensajeIntentoFallido(2),
    "Correo o contraseña incorrectos. Te quedan 1 intento(s) antes del bloqueo de seguridad."
  );
});

test("Bloqueo OWASP Ciclo 1: 3 fallos consecutivos provocan bloqueo de 15 minutos", () => {
  const now = new Date("2026-10-02T21:30:00.000Z");
  const escalation = calcularEscalamientoBloqueo(0, now);

  assert.strictEqual(escalation.nuevoNivelBloqueo, 1);
  assert.strictEqual(escalation.duracionMinutos, 15);
  assert.strictEqual(escalation.esPermanente, false);
  assert.strictEqual(escalation.accionBitacora, "BLOQUEO_TEMPORAL_15M");
  assert.strictEqual(escalation.bloqueadoHasta, "2026-10-02T21:45:00.000Z");
});

test("Bloqueo OWASP Ciclo 2: 3 fallos tras el primer ciclo provocan bloqueo de 1 hora", () => {
  const now = new Date("2026-10-02T21:30:00.000Z");
  const escalation = calcularEscalamientoBloqueo(1, now);

  assert.strictEqual(escalation.nuevoNivelBloqueo, 2);
  assert.strictEqual(escalation.duracionMinutos, 60);
  assert.strictEqual(escalation.esPermanente, false);
  assert.strictEqual(escalation.accionBitacora, "BLOQUEO_TEMPORAL_1H");
  assert.strictEqual(escalation.bloqueadoHasta, "2026-10-02T22:30:00.000Z");
});

test("Bloqueo OWASP Ciclo 3: 3 fallos tras acumular 2 bloqueos provocan bloqueo permanente", () => {
  const now = new Date("2026-10-02T21:30:00.000Z");
  const escalation = calcularEscalamientoBloqueo(2, now);

  assert.strictEqual(escalation.nuevoNivelBloqueo, 3);
  assert.strictEqual(escalation.duracionMinutos, null);
  assert.strictEqual(escalation.esPermanente, true);
  assert.strictEqual(escalation.accionBitacora, "BLOQUEO_PERMANENTE");
  assert.strictEqual(escalation.bloqueadoHasta, null);
});

test("Bloqueo OWASP: Detección de bloqueo temporal activo y expirado", () => {
  const now = new Date("2026-10-02T21:35:00.000Z");

  // Bloqueo hasta las 21:45 (faltan 10 minutos)
  const activo = evaluarEstadoBloqueo(
    {
      email: "prueba@carameloswatts.com",
      intentos_fallidos: 3,
      bloqueos_acumulados: 1,
      bloqueado_hasta: "2026-10-02T21:45:00.000Z",
      es_permanente: false,
    },
    now
  );

  assert.strictEqual(activo.bloqueado, true);
  assert.strictEqual(activo.estado, "BLOQUEO_TEMPORAL");
  if (activo.estado === "BLOQUEO_TEMPORAL") {
    assert.strictEqual(activo.minutosRestantes, 10);
  }

  // Mismo registro evaluado a las 21:50 (ya pasaron los 15 minutos)
  const expiradoTime = new Date("2026-10-02T21:50:00.000Z");
  const expirado = evaluarEstadoBloqueo(
    {
      email: "prueba@carameloswatts.com",
      intentos_fallidos: 3,
      bloqueos_acumulados: 1,
      bloqueado_hasta: "2026-10-02T21:45:00.000Z",
      es_permanente: false,
    },
    expiradoTime
  );

  assert.strictEqual(expirado.bloqueado, false);
  assert.strictEqual(expirado.estado, "LIBRE");
});

test("Bloqueo OWASP: Cuenta con bloqueo permanente se rechaza indefectiblemente", () => {
  const evalPermanente = evaluarEstadoBloqueo({
    email: "atacante@carameloswatts.com",
    intentos_fallidos: 3,
    bloqueos_acumulados: 3,
    bloqueado_hasta: null,
    es_permanente: true,
  });

  assert.strictEqual(evalPermanente.bloqueado, true);
  assert.strictEqual(evalPermanente.estado, "BLOQUEO_PERMANENTE");
});
