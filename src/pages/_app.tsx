import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AuthProvider } from "@/contexts/AuthContext";
import { DM_Sans } from "next/font/google";

// Tipografía corporativa DM Sans (tokens-de-marca.md §3).
// Se define en el Custom App para que toda la app consuma la variable
// a través del token --font-sans declarado en @theme.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <div className={`${dmSans.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}