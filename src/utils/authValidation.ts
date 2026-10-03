export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface LoginFormValidationResult {
  isValid: boolean;
  errors: LoginFormErrors;
  trimmedEmail: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida los campos del formulario de inicio de sesión (CU-01).
 * Verifica campos obligatorios, formato de correo y normaliza espacios (trim).
 */
export function validateLoginForm(email: string, password: string): LoginFormValidationResult {
  const errors: LoginFormErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = "Ingresa tu correo electrónico institucional.";
  } else if (!EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = "Ingresa un formato de correo válido (ej. usuario@carameloswatts.com).";
  }

  if (!password) {
    errors.password = "Ingresa tu contraseña.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    trimmedEmail,
  };
}
