import type { ReactNode } from "react";
import Navbar from "./Navbar";

// Layout compartido de las pantallas internas (tokens-de-marca.md §5.3).
// Variante A: navbar de un solo nivel agrupado por dominio (Operación/Gestión).
// Se monta UNA vez por sesión de navegación SPA gracias al patrón getLayout de
// Pages Router: el navbar persiste entre páginas y solo cambia <main>.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <Navbar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}