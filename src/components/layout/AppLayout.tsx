import type { ReactNode } from "react";
import Navbar from "./Navbar";

// Layout compartido de las pantallas internas (tokens-de-marca.md §5.3).
// Variante A: navbar de un solo nivel agrupado por dominio (Operación/Gestión).
// Se monta UNA vez por sesión de navegación SPA gracias al patrón getLayout de
// Pages Router: el navbar persiste entre páginas y solo cambia <main>.
//
// flush=true: sin padding en <main>. Usar en páginas admin que tienen su propio
// header de gradiente full-width (admin/usuarios, admin/personal).
export default function AppLayout({ children, flush = false }: { children: ReactNode; flush?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar />
      <main className={`flex-1${flush ? "" : " p-6"}`}>{children}</main>
    </div>
  );
}