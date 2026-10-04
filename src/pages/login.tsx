"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/layout/AuthLayout";
import { validateLoginForm, type LoginFormErrors } from "@/utils/authValidation";
import { logAuthEvent } from "@/utils/logAuthEvent";
import { logger } from "@/lib/logger";

// Mapeo de códigos de error de Supabase Auth a mensajes legibles (CU-01, flujo A1).
// Cubre tanto errores de submit (authError.code) como errores de callback
// (router.query.error, tokens-de-marca.md §7.4: ?error=pkce-failed).
// Nunca exponer el mensaje crudo en inglés al usuario.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  invalid_grant: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Todavía no se confirmó tu correo electrónico. Revisa tu bandeja de entrada.",
  user_not_found: "No existe una cuenta con ese correo electrónico.",
  temp_password_expired:
    "Tu contraseña temporal expiró. Solicita a un administrador que te genere un nuevo acceso.",
  "pkce-failed": "La autenticación no pudo completarse. Inténtalo de nuevo.",
  access_denied: "Acceso denegado. Inténtalo de nuevo.",
  user_banned: "Tu cuenta ha sido suspendida. Comunícate con la administración.",
};

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dismissedQueryError, setDismissedQueryError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // Si ya tiene sesión activa y llega al login, redirigir según su rol
  useEffect(() => {
    if (!authLoading && user) {
      const destination =
        user.rol_codigo === "GERENCIA_COMERCIAL" || user.rol_codigo === "FISCALIZADOR"
          ? "/admin/usuarios"
          : "/dashboard";
      router.replace(destination).catch((err: unknown) => {
        logger.error("Error redirigiendo usuario autenticado:", err);
      });
    }
  }, [authLoading, user, router]);

  // Error del callback de autenticación (?error=... en la URL, tokens-de-marca §7.4).
  // Se deriva del query en el render (sin effect); el usuario puede cerrarlo.
  const queryError =
    typeof router.query.error === "string" ? router.query.error : null;
  const error =
    formError ??
    (!dismissedQueryError && queryError
      ? LOGIN_ERROR_MESSAGES[queryError] ??
        "La autenticación no pudo completarse. Inténtalo de nuevo."
      : null);

  const handleCloseError = () => {
    setFormError(null);
    setDismissedQueryError(true);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setDismissedQueryError(false);

    // Validación cliente de campos requeridos y formato de correo (CU-01)
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // 1. Login server-side: bloqueo, contraseña y conteo de intentos se deciden en el servidor
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: validation.trimmedEmail, password }),
      });

      if (!loginRes.ok) {
        let body: { error?: string; code?: string } = {};
        try {
          body = (await loginRes.json()) as { error?: string; code?: string };
        } catch (parseErr: unknown) {
          logger.error("Respuesta de /api/auth/login sin JSON válido:", parseErr);
        }
        const isCredentialOrLock = body.code === "invalid_credentials" || body.code === "account_locked";
        setFormError(
          isCredentialOrLock
            ? body.error ?? "Correo o contraseña incorrectos."
            : LOGIN_ERROR_MESSAGES[body.code ?? ""] ??
                "Ocurrió un error al iniciar sesión. Inténtalo de nuevo."
        );
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // CU-01 Flujo A2 / A3: Verificación de estado de cuenta y permisos
      const result = await refreshUser();
      if (!result.success) {
        // Registrar rechazo de cuenta en bitácora
        // Se registra mientras la sesión aún existe (el servidor deriva la identidad de ella)
        await logAuthEvent({
          accion: "LOGIN_RECHAZADO",
          razon: result.error ?? "Verificación de perfil fallida",
        });

        // Destruir la cookie de Supabase Auth para no dejar sesión zombie
        await supabase.auth.signOut();
        setLoading(false);

        if (result.error === "Cuenta dada de baja") {
          setFormError("Tu cuenta se encuentra inactiva o dada de baja. Comunícate con la administración.");
        } else if (result.error === "Usuario sin perfil asignado") {
          setFormError("Esta cuenta no tiene un perfil comercial asignado. Comunícate con la administración.");
        } else {
          setFormError(result.error ?? "No fue posible verificar las credenciales de tu cuenta.");
        }
        return;
      }

      // Redirección directa según rol
      const rol = result.user?.rol_codigo;
      const targetRoute =
        rol === "GERENCIA_COMERCIAL" || rol === "FISCALIZADOR"
          ? "/admin/usuarios"
          : "/dashboard";

      await router.replace(targetRoute);
    } catch (err: unknown) {
      logger.error("Error durante el inicio de sesión:", err);
      setFormError("Ocurrió un error inesperado al iniciar sesión. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {error && (
        <Alert state="error" onClose={handleCloseError}>
          {error}
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          handleLogin(e).catch((err: unknown) => {
            logger.error("Error no controlado en handleLogin:", err);
          });
        }}
        className="w-full space-y-4"
        noValidate
      >
        <Input
          label="Correo Electrónico"
          type="email"
          value={email}
          error={fieldErrors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          placeholder="gerencia@carameloswatts.com"
          autoComplete="email"
          required
        />

        <Input
          label="Contraseña"
          type="password"
          value={password}
          error={fieldErrors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          showPasswordToggle
        />

        <Button type="submit" size="lg" isLoading={loading}>
          Iniciar Sesión
        </Button>
      </form>

      {/* CU-01 Flujo A4: Recuperación de contraseña */}
      <Link
        href="/auth/forgot-password"
        className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </AuthLayout>
  );
}

export default LoginPage;