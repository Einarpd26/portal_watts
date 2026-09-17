import "@/styles/globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { DM_Sans } from "next/font/google";
import type { AppPropsWithLayout } from "@/types";

// Tipografía corporativa DM Sans (tokens-de-marca.md §3).
// Se define en el Custom App para que toda la app consuma la variable
// a través del token --font-sans declarado en @theme.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  // Layout por página (Pages Router). Las pantallas internas declaran
  // getLayout = (page) => <AppLayout>{page}</AppLayout>; /login no declara
  // ningún layout y se renderiza sola.
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <AuthProvider>
      <div className={`${dmSans.variable} font-sans`}>
        {getLayout(<Component {...pageProps} />)}
      </div>
    </AuthProvider>
  );
}