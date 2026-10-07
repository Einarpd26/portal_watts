"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/utils/passwordPolicy";
import { logAuthEvent } from "@/utils/logAuthEvent";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/layout/AuthLayout";
import { logger } from "@/lib/logger";

type Step = "otp" | "password";
type PasswordState = "idle" | "saving" | "success";

export function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("otp");
  const [error, setError] = useState<string | null>(null);

  // Paso 1: OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Paso 2: Contraseña
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordState, setPasswordState] = useState<PasswordState>("idle");

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = otpEmail.trim();
    const trimmedCode = otpCode.trim();

    if (!trimmedEmail) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    if (!trimmedCode) {
      setError("Ingresa el código de 6 dígitos que recibiste por correo.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedCode,
        type: "recovery",
      });

      if (verifyError) {
        throw verifyError;
      }

      setStep("password");
    } catch (err: unknown) {
      // Un código incorrecto o vencido es un caso esperado, no un fallo del sistema: se registra
      // como aviso y sin el objeto de error (console.error con un Error abre el overlay de Next en desarrollo)
      logger.warn("Código de recuperación rechazado:", err instanceof Error ? err.message : String(err));
      setError("Código inválido o expirado. Verifica el código e inténtalo de nuevo.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Ingresa la nueva contraseña.");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(`Requisitos no cumplidos: ${validation.errors.join(", ").toLowerCase()}.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setPasswordState("saving");
      const supabase = createClient();

      // Asegurar que la sesión de recovery esté sincronizada antes de actualizar
      await supabase.auth.getSession();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      // Registrar auditoría de recuperación exitosa y restablecer bloqueos previos
      await logAuthEvent({
        accion: "RECUPERACION_PASSWORD",
      });

      setPasswordState("success");

      // Cerrar la sesión de recuperación para forzar inicio limpio con la nueva clave
      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace("/login").catch((navErr: unknown) => {
          logger.error("Error redirigiendo a login tras reset:", navErr);
        });
      }, 2500);
    } catch (err: unknown) {
      logger.error("Error actualizando contraseña en reset-password:", err);
      setError("No se pudo actualizar la contraseña. Inténtalo de nuevo o solicita un nuevo código.");
      setPasswordState("idle");
    }
  };

  return (
    <AuthLayout>
      {step === "otp" ? (
        <>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Verificar Código
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              Ingresa tu correo y el código numérico recibido en tu bandeja de entrada.
            </p>
          </div>

          {error && (
            <Alert state="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              handleVerifyOtp(e).catch((err: unknown) => {
                logger.error("Error no controlado en handleVerifyOtp:", err);
              });
            }}
            className="w-full space-y-4"
            noValidate
          >
            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="usuario@carameloswatts.com"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              disabled={isVerifyingOtp}
              required
              autoComplete="email"
            />

            <Input
              label="Código de Seguridad"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              disabled={isVerifyingOtp}
              required
              autoComplete="one-time-code"
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isVerifyingOtp}
              disabled={isVerifyingOtp || !otpEmail || !otpCode}
            >
              Verificar Código
            </Button>
          </form>

          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
            >
              ¿No recibiste el código? Solicitar uno nuevo
            </Link>
            <Link
              href="/login"
              className="text-xs text-gray-500 transition-colors hover:text-gray-700"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              Nueva Contraseña
            </h1>
            <p className="mt-1 text-xs text-gray-600">
              Ingresa una nueva contraseña segura para acceder al portal.
            </p>
          </div>

          {passwordState === "success" ? (
            <div className="w-full space-y-4">
              <Alert state="success" title="¡Contraseña restablecida!">
                Tu clave de acceso se actualizó con éxito. Serás redirigido al inicio de sesión...
              </Alert>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                handleResetPassword(e).catch((err: unknown) => {
                  logger.error("Error no controlado en handleResetPassword:", err);
                });
              }}
              className="w-full space-y-4"
              noValidate
            >
              {error && (
                <Alert state="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Input
                label="Nueva Contraseña"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={passwordState === "saving"}
                required
                showPasswordToggle
                autoComplete="new-password"
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordState === "saving"}
                required
                showPasswordToggle
                autoComplete="new-password"
              />

              <p className="text-xs text-gray-500">
                Mínimo 8 caracteres, con al menos una mayúscula, una minúscula y un número.
              </p>

              <Button
                type="submit"
                size="lg"
                isLoading={passwordState === "saving"}
                disabled={passwordState === "saving" || !password || !confirmPassword}
              >
                Guardar Nueva Contraseña
              </Button>
            </form>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs font-medium text-primary-600 transition-colors hover:text-primary-700"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

export default ResetPasswordPage;
