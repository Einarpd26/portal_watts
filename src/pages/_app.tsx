import "@/styles/globals.css";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { AppPropsWithLayout } from "@/types";
import { logger } from "@/lib/logger";

// Tipografía corporativa Plus Jakarta Sans (tokens-de-marca.md §3).
// Se define en el Custom App para que toda la app consuma la variable
// a través del token --font-sans declarado en @theme.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // Layout por página (Pages Router). Las pantallas internas declaran
  // getLayout = (page) => <AppLayout>{page}</AppLayout>; /login no declara
  // ningún layout y se renderiza sola.
  const getLayout = Component.getLayout ?? ((page) => page);

  // Registro del service worker (PWA instalable). Guardado tras el mount
  // del cliente: navigator.serviceWorker no existe en SSR.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        logger.error("Error registrando el service worker:", err);
      });
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <div className={`${plusJakartaSans.variable} font-sans`}>
          {getLayout(<Component {...pageProps} />)}
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}