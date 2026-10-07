"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthLayout from "@/components/layout/AuthLayout";
import { logger } from "@/lib/logger";

type ForgotState = "idle" | "loading" | "sent" | "error";

export function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ForgotState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Ingresa tu correo electrónico institucional.");
      setState("error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg("Ingresa un formato de correo electrónico válido.");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setErrorMsg(data.error || "No se pudo procesar la solicitud.");
        setState("error");
        return;
      }

      setState("sent");
    } catch (err: unknown) {
      logger.error("Error en forgot-password submit:", err);
      setErrorMsg("Error de conexión al servidor. Inténtalo de nuevo.");
      setState("error");
    }
  };

  return (
    <AuthLayout
      title="Recuperar Contraseña"
      subtitle="Ingresa tu correo institucional para restablecer tu acceso."
    >
      {state === "sent" ? (
        <div className="w-full space-y-4">
          <Alert state="success" title="¡Solicitud procesada!">
            Si existe una cuenta activa para <strong>{email}</strong>, recibirás un correo con un código de 6 dígitos y un enlace al formulario donde ingresarlo. Revisa tu bandeja de entrada y spam.
          </Alert>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              router.push("/auth/reset-password").catch((navErr: unknown) => {
                logger.error("Error navegando al formulario de código:", navErr);
              });
            }}
          >
            Ya tengo mi código
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => {
              setState("idle");
              setEmail("");
              setErrorMsg(null);
            }}
          >
            Enviar a otro correo
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            handleForgotPassword(e).catch((err: unknown) => {
              logger.error("Error no controlado en handleForgotPassword:", err);
            });
          }}
          className="w-full space-y-4"
          noValidate
        >
          {state === "error" && errorMsg && (
            <Alert
              state="error"
              onClose={() => {
                setState("idle");
                setErrorMsg(null);
              }}
            >
              {errorMsg}
            </Alert>
          )}

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@carameloswatts.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === "loading"}
            required
            autoComplete="email"
          />

          <Button
            type="submit"
            size="lg"
            isLoading={state === "loading"}
            disabled={state === "loading" || !email}
          >
            Enviar Instrucciones
          </Button>
        </form>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
