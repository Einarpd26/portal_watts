"use client";

import PageLoader from "@/components/ui/PageLoader";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "./Navbar";
import { logger } from "@/lib/logger";
import { cn } from "@/utils/cn";

// Layout compartido de las pantallas internas (tokens-de-marca.md §5.3).
// Variante A: navbar de un solo nivel agrupado por dominio (Operación/Gestión).
// Se monta UNA vez por sesión de navegación SPA gracias al patrón getLayout de
// Pages Router: el navbar persiste entre páginas y solo cambia <main>.
//
// flush=true: sin padding en <main>. Usar en páginas admin que tienen su propio
// header de gradiente full-width (admin/usuarios, admin/personal).
// fullHeight=true: la pantalla no crece con el contenido; <main> ocupa el alto restante bajo el
// navbar y desplaza por dentro. Lo usan las páginas con mapa, que deben llenar la ventana.
export default function AppLayout({
  children,
  flush = false,
  fullHeight = false,
}: {
  children: ReactNode;
  flush?: boolean;
  fullHeight?: boolean;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Guardia de sesión cliente: si la sesión no existe (ej. tras logout o presionar "Atrás"),
  // redirige inmediatamente a /login con replace para no ensuciar el historial.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login").catch((err: unknown) => {
        logger.error("Error redirigiendo a login:", err);
      });
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <PageLoader etiqueta="Verificando sesión..." className="min-h-screen bg-gray-50" />
    );
  }

  return (
    <div className={cn("flex flex-col bg-gray-100", fullHeight ? "h-dvh" : "min-h-screen")}>
      <Navbar />
      <main className={cn("flex-1", !flush && "p-6", fullHeight && "flex min-h-0 flex-col overflow-y-auto")}>
        {children}
      </main>
    </div>
  );
}