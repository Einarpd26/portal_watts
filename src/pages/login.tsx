import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// Mapeo de códigos de error de Supabase Auth a mensajes legibles (CU-01, flujo A1).
// Cubre tanto errores de submit (authError.code) como errores de callback
// (router.query.error, tokens-de-marca.md §7.4: ?error=pkce-failed).
// Nunca exponer el mensaje crudo en inglés al usuario.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Todavía no se confirmó tu correo electrónico. Revisa tu bandeja de entrada.",
  user_not_found: "No existe una cuenta con ese correo electrónico.",
  "pkce-failed": "La autenticación no pudo completarse. Inténtalo de nuevo.",
  access_denied: "La autenticación no pudo completarse. Inténtalo de nuevo.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [dismissedQueryError, setDismissedQueryError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshUser } = useAuth();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    setDismissedQueryError(false);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setFormError(
        LOGIN_ERROR_MESSAGES[authError.code ?? ""] ??
          "Ocurrió un error al iniciar sesión. Inténtalo de nuevo."
      );
      setLoading(false);
      return;
    }

    // Éxito: refrescamos el contexto ANTES de navegar para que /dashboard
    // reciba la sesión ya en memoria, sin esperar un F5.
    await refreshUser();
    // El middleware ve la cookie HttpOnly y nos deja pasar.
    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(140deg,#7f1d1d_0%,#991b1b_35%,#dc2626_100%)] p-4">
      {/* Textura diagonal decorativa (tokens-de-marca.md §5.2) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(255,255,255,.03) 0px, rgba(255,255,255,.03) 1px, transparent 1px, transparent 14px)",
        }}
      />

      {/* Orbs decorativos (tokens-de-marca.md §5.2) */}
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-24 h-[22rem] w-[22rem] rounded-full bg-white/[.06]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-white/[.06]" />

      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-login">
        <div className="flex flex-col items-center gap-7">
          <Image
            src="/watts_logo_rojo.png"
            alt="Caramelos Watts"
            width={120}
            height={120}
            priority
            className="rounded-2xl object-cover"
          />

          {error && (
            <Alert state="error" onClose={handleCloseError}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin} className="w-full space-y-4" noValidate>
            <Input
              label="Correo Electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gerencia@carameloswatts.com"
              autoComplete="email"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              showPasswordToggle
            />

            <Button type="submit" size="lg" isLoading={loading}>
              Iniciar Sesión
            </Button>
          </form>

          {/* TODO(CU-??): implementar flujo de recuperación con auth.sendPasswordResetEmail.
              Mientras tanto, el botón solo informa que está pendiente. */}
          <button
            type="button"
            onClick={() => setFormError("La recuperación de contraseña está pendiente de implementación.")}
            className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
    </div>
  );
}