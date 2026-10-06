import test from "node:test";
import assert from "node:assert";
import { getPasswordChangeState } from "../src/utils/passwordChange.ts";

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
