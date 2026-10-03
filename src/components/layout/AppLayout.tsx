"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "./Navbar";

// Layout compartido de las pantallas internas (tokens-de-marca.md §5.3).
// Variante A: navbar de un solo nivel agrupado por dominio (Operación/Gestión).
// Se monta UNA vez por sesión de navegación SPA gracias al patrón getLayout de
// Pages Router: el navbar persiste entre páginas y solo cambia <main>.
//
// flush=true: sin padding en <main>. Usar en páginas admin que tienen su propio
// header de gradiente full-width (admin/usuarios, admin/personal).
export default function AppLayout({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guardia de sesión cliente: si la sesión no existe (ej. tras logout o presionar "Atrás"),
  // redirige inmediatamente a /login con replace para no ensuciar el historial.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login").catch((err: unknown) => {
        console.error("Error redirigiendo a login:", err);
      });
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar />
      <main className={`flex-1${flush ? "" : " p-6"}`}>{children}</main>
    </div>
  );
}