"use client";

import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { logger } from "@/lib/logger";
import { validatePassword } from "@/utils/passwordPolicy";

// CU-01 A3 — Cambio obligatorio de la contraseña temporal en el primer inicio
// de sesión. El proxy redirige acá a toda cuenta con la marca activa.
export default function CambiarPasswordPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(`La contraseña no cumple los requisitos: ${validation.errors.join(", ").toLowerCase()}.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Vencida: el proxy cierra la sesión y lo manda al login con el aviso
        if (data.code === "TEMP_PASSWORD_EXPIRED") {
          await router.replace("/login?error=temp_password_expired");
          return;
        }
        setError(data.error ?? "No se pudo actualizar la contraseña.");
        return;
      }

      // Sincronizamos el token y el perfil ANTES de navegar; si la sesión no
      // sobrevivió al cambio, pedimos iniciar sesión con la contraseña nueva.
      const supabase = createClient();
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
        await router.replace("/login");
        return;
      }
      await refreshUser();
      await router.replace("/");
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await createClient().auth.signOut();
    await router.push("/login");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(140deg,#7f1d1d_0%,#991b1b_35%,#dc2626_100%)] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,.03)_0px,rgba(255,255,255,.03)_1px,transparent_1px,transparent_14px)]"
      />
      <div aria-hidden className="pointer-events-none absolute -top-28 -right-24 h-[22rem] w-[22rem] rounded-full bg-white/[.06]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-white/[.06]" />

      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-login">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/watts_logo_rojo.png"
            alt="Caramelos Watts"
            width={96}
            height={96}
            priority
            className="rounded-2xl object-cover"
          />

          <div className="text-center">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Definí tu nueva contraseña</h1>
            <p className="mt-1 text-sm text-gray-600">
              Por seguridad, reemplazá la contraseña temporal antes de continuar.
            </p>
          </div>

          {error && (
            <Alert state="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              handleSubmit(e).catch((err: unknown) => logger.error("Error cambiando la contraseña temporal:", err));
            }} className="w-full space-y-4" noValidate>
            <Input
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              showPasswordToggle
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              showPasswordToggle
            />
            <p className="text-xs text-gray-500">
              Mínimo 8 caracteres, con mayúscula, minúscula y número.
            </p>

            <Button type="submit" size="lg" isLoading={loading}>
              Guardar contraseña
            </Button>
          </form>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
