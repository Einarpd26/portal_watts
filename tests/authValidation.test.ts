import test from "node:test";
import assert from "node:assert/strict";
import { validateLoginForm } from "../src/utils/authValidation.ts";
import { validatePassword } from "../src/utils/passwordPolicy.ts";
import { getPasswordChangeState } from "../src/utils/passwordChange.ts";

test("CU-01 Validación de campos vacíos en el formulario de login", () => {
  const result = validateLoginForm("", "");
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.email, "Ingresa tu correo electrónico institucional.");
  assert.strictEqual(result.errors.password, "Ingresa tu contraseña.");
});

test("CU-01 Validación de correo con solo espacios", () => {
  const result = validateLoginForm("   ", "miPassword123");
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.email, "Ingresa tu correo electrónico institucional.");
  assert.strictEqual(result.errors.password, undefined);
});

test("CU-01 Validación de formato de correo incorrecto", () => {
  const invalidEmails = [
    "gerencia",
    "gerencia@",
    "@carameloswatts.com",
    "gerencia@carameloswatts",
    "gerencia watts@carameloswatts.com",
  ];

  for (const email of invalidEmails) {
    const result = validateLoginForm(email, "Clave1234");
    assert.strictEqual(result.isValid, false, `Esperado inválido para: ${email}`);
    assert.strictEqual(
      result.errors.email,
      "Ingresa un formato de correo válido (ej. usuario@carameloswatts.com)."
    );
  }
});

test("CU-01 Limpieza automática de espacios (trim) en correo válido", () => {
  const result = validateLoginForm("  gerencia@carameloswatts.com  ", "Watts2026*");
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.trimmedEmail, "gerencia@carameloswatts.com");
  assert.strictEqual(result.errors.email, undefined);
  assert.strictEqual(result.errors.password, undefined);
});

test("CU-01 Validación de contraseña faltante con correo válido", () => {
  const result = validateLoginForm("gerencia@carameloswatts.com", "");
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.errors.email, undefined);
  assert.strictEqual(result.errors.password, "Ingresa tu contraseña.");
});

test("CU-01 Política de contraseñas (validatePassword)", () => {
  // Corta (< 8 caracteres)
  const short = validatePassword("Ab1");
  assert.strictEqual(short.valid, false);
  assert.ok(short.errors.includes("Mínimo 8 caracteres"));

  // Sin mayúscula
  const noUpper = validatePassword("password123");
  assert.strictEqual(noUpper.valid, false);
  assert.ok(noUpper.errors.includes("Al menos una mayúscula"));

  // Sin minúscula
  const noLower = validatePassword("PASSWORD123");
  assert.strictEqual(noLower.valid, false);
  assert.ok(noLower.errors.includes("Al menos una minúscula"));

  // Sin número
  const noNum = validatePassword("PasswordSinNumero");
  assert.strictEqual(noNum.valid, false);
  assert.ok(noNum.errors.includes("Al menos un número"));

  // Contraseña válida
  const valid = validatePassword("Watts2026Seguro");
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.errors.length, 0);
});

test("CU-01 A3 Control de estado de contraseña temporal (getPasswordChangeState)", () => {
  // Sin marca de cambio obligatorio
  assert.strictEqual(getPasswordChangeState(undefined), "none");
  assert.strictEqual(getPasswordChangeState({ must_change_password: false }), "none");

  // Marca activa y vigente
  const now = 1700000000000;
  const futureExpiry = new Date(now + 72 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(
    getPasswordChangeState(
      { must_change_password: true, temp_password_expires_at: futureExpiry },
      now
    ),
    "required"
  );

  // Marca activa pero vencida (72h superadas)
  const pastExpiry = new Date(now - 1000).toISOString();
  assert.strictEqual(
    getPasswordChangeState(
      { must_change_password: true, temp_password_expires_at: pastExpiry },
      now
    ),
    "expired"
  );
});
