import test from "node:test";
import assert from "node:assert";
import { getPasswordChangeState, isRecoverySession } from "../src/utils/passwordChange.ts";

const NOW = Date.parse("2026-10-05T12:00:00.000Z");

test("passwordChange: sin marca de cambio obligatorio el estado es none", () => {
  assert.strictEqual(getPasswordChangeState(undefined, NOW), "none");
  assert.strictEqual(getPasswordChangeState({ must_change_password: false }, NOW), "none");
});

test("passwordChange: temporal vigente exige el cambio", () => {
  const meta = { must_change_password: true, temp_password_expires_at: "2026-10-06T12:00:00.000Z" };
  assert.strictEqual(getPasswordChangeState(meta, NOW), "required");
});

test("passwordChange: temporal vencida sin usar queda expired", () => {
  const meta = { must_change_password: true, temp_password_expires_at: "2026-10-04T12:00:00.000Z" };
  assert.strictEqual(getPasswordChangeState(meta, NOW), "expired");
});

function fakeJwt(payload: object): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.firma`;
}

test("isRecoverySession: reconoce una sesión creada por recuperación", () => {
  assert.strictEqual(isRecoverySession(fakeJwt({ amr: [{ method: "otp", timestamp: 1 }] })), true);
  assert.strictEqual(isRecoverySession(fakeJwt({ amr: [{ method: "recovery", timestamp: 1 }] })), true);
  assert.strictEqual(isRecoverySession(fakeJwt({ amr: ["magiclink"] })), true);
});

test("isRecoverySession: un login con contraseña no cuenta como recuperación", () => {
  assert.strictEqual(isRecoverySession(fakeJwt({ amr: [{ method: "password", timestamp: 1 }] })), false);
  assert.strictEqual(
    isRecoverySession(fakeJwt({ amr: [{ method: "otp", timestamp: 2 }, { method: "password", timestamp: 1 }] })),
    false
  );
});

test("isRecoverySession: falla cerrado ante tokens ilegibles o sin amr", () => {
  assert.strictEqual(isRecoverySession(undefined), false);
  assert.strictEqual(isRecoverySession("no-es-un-jwt"), false);
  assert.strictEqual(isRecoverySession(fakeJwt({})), false);
  assert.strictEqual(isRecoverySession(fakeJwt({ amr: [] })), false);
});
