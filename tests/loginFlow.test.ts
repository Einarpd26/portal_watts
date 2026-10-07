import test from "node:test";
import assert from "node:assert/strict";
import { procesarLogin, type LoginDeps } from "../src/utils/loginFlow.ts";
import type { LockoutEvaluation } from "../src/utils/lockoutUtils.ts";

const EMAIL = "gerencia@carameloswatts.com";
const IP = "190.181.45.12";

const LIBRE: LockoutEvaluation = { bloqueado: false, estado: "LIBRE", intentosFallidos: 0, intentosRestantes: 3 };
const BLOQUEADO: LockoutEvaluation = {
  bloqueado: true,
  estado: "BLOQUEO_TEMPORAL",
  minutosRestantes: 15,
  nivelBloqueo: 1,
  desbloqueaEnUtc: "2026-10-07T00:15:00.000Z",
  mensaje: "Cuenta bloqueada temporalmente.",
};

// Crea dependencias falsas que registran cada llamada en orden
function crearDeps(overrides: Partial<LoginDeps> = {}) {
  const llamadas: string[] = [];
  const deps: LoginDeps = {
    verificarBloqueo: async () => {
      llamadas.push("verificarBloqueo");
      return LIBRE;
    },
    ipExcedioLimite: async () => {
      llamadas.push("ipExcedioLimite");
      return false;
    },
    iniciarSesion: async () => {
      llamadas.push("iniciarSesion");
      return { userId: "user-1", errorCode: null, errorMessage: null };
    },
    registrarFallo: async () => {
      llamadas.push("registrarFallo");
      return {
        evaluation: { bloqueado: false, estado: "LIBRE", intentosFallidos: 1, intentosRestantes: 2 },
        mensaje: "Correo o contraseña incorrectos. Te quedan 2 intentos.",
      };
    },
    registrarExito: async () => {
      llamadas.push("registrarExito");
    },
    auditarInicio: async () => {
      llamadas.push("auditarInicio");
    },
    ...overrides,
  };
  return { deps, llamadas };
}

test("login: un par correo-IP bloqueado se rechaza con 423 sin verificar la contraseña", async () => {
  const { deps, llamadas } = crearDeps({ verificarBloqueo: async () => BLOQUEADO });

  const r = await procesarLogin(deps, EMAIL, "cualquiera", IP);

  assert.equal(r.status, 423);
  assert.equal(r.body.code, "account_locked");
  assert.equal(r.body.error, "Cuenta bloqueada temporalmente.");
  assert.deepEqual(llamadas, []);
});

test("login: el tope por IP responde 429 antes de consumir el presupuesto del proveedor", async () => {
  const { deps, llamadas } = crearDeps({ ipExcedioLimite: async () => true });

  const r = await procesarLogin(deps, EMAIL, "x", IP);

  assert.equal(r.status, 429);
  assert.equal(r.body.code, "ip_rate_limited");
  assert.ok(!llamadas.includes("iniciarSesion"));
});

test("login: el bloqueo se consulta antes que el tope por IP y que la contraseña", async () => {
  const { deps, llamadas } = crearDeps();

  await procesarLogin(deps, EMAIL, "ok", IP);

  assert.deepEqual(llamadas.slice(0, 3), ["verificarBloqueo", "ipExcedioLimite", "iniciarSesion"]);
});

test("login: credenciales inválidas suman un fallo y responden 401", async () => {
  const { deps, llamadas } = crearDeps({
    iniciarSesion: async () => ({ userId: null, errorCode: "invalid_credentials", errorMessage: "Invalid login credentials" }),
  });

  const r = await procesarLogin(deps, EMAIL, "mala", IP);

  assert.equal(r.status, 401);
  assert.equal(r.body.code, "invalid_credentials");
  assert.equal(r.body.lockout?.bloqueado, false);
  assert.ok(llamadas.includes("registrarFallo"));
  assert.ok(!llamadas.includes("registrarExito"));
  assert.ok(!llamadas.includes("auditarInicio"));
});

test("login: el tercer fallo bloquea y responde 423 con account_locked", async () => {
  const { deps } = crearDeps({
    iniciarSesion: async () => ({ userId: null, errorCode: "invalid_credentials", errorMessage: "x" }),
    registrarFallo: async () => ({ evaluation: BLOQUEADO, mensaje: "Has alcanzado 3 intentos fallidos." }),
  });

  const r = await procesarLogin(deps, EMAIL, "mala", IP);

  assert.equal(r.status, 423);
  assert.equal(r.body.code, "account_locked");
  assert.equal(r.body.error, "Has alcanzado 3 intentos fallidos.");
});

test("login: el fallo se registra con el correo y la IP del intento", async () => {
  let recibido: [string, string] | null = null;
  const { deps } = crearDeps({
    iniciarSesion: async () => ({ userId: null, errorCode: "invalid_grant", errorMessage: "x" }),
    registrarFallo: async (email, ip) => {
      recibido = [email, ip];
      return { evaluation: LIBRE, mensaje: "m" };
    },
  });

  await procesarLogin(deps, EMAIL, "mala", IP);

  assert.deepEqual(recibido, [EMAIL, IP]);
});

test("login: errores del proveedor que no son de contraseña no cuentan como intento fallido", async () => {
  const { deps, llamadas } = crearDeps({
    iniciarSesion: async () => ({ userId: null, errorCode: "email_not_confirmed", errorMessage: "Email not confirmed" }),
  });

  const r = await procesarLogin(deps, EMAIL, "ok", IP);

  assert.equal(r.status, 401);
  assert.equal(r.body.code, "email_not_confirmed");
  assert.ok(!llamadas.includes("registrarFallo"));
});

test("login: un error sin código se informa como unknown y tampoco cuenta", async () => {
  const { deps, llamadas } = crearDeps({
    iniciarSesion: async () => ({ userId: null, errorCode: null, errorMessage: null }),
  });

  const r = await procesarLogin(deps, EMAIL, "ok", IP);

  assert.equal(r.status, 401);
  assert.equal(r.body.code, "unknown");
  assert.equal(r.body.error, "No fue posible iniciar sesión.");
  assert.ok(!llamadas.includes("registrarFallo"));
});

test("login: un inicio válido reinicia contadores y audita, y responde 200", async () => {
  const auditado: Array<[string, string]> = [];
  const { deps, llamadas } = crearDeps({
    auditarInicio: async (userId, email) => {
      llamadas.push("auditarInicio");
      auditado.push([userId, email]);
    },
  });

  const r = await procesarLogin(deps, EMAIL, "correcta", IP);

  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { success: true });
  assert.deepEqual(llamadas, ["verificarBloqueo", "ipExcedioLimite", "iniciarSesion", "registrarExito", "auditarInicio"]);
  assert.deepEqual(auditado, [["user-1", EMAIL]]);
});
