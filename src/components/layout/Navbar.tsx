import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DASHBOARD_TAB,
  HELP_LINK,
  MANAGEMENT_GROUP,
  MANAGEMENT_GROUP_LABEL,
  OPERATION_GROUP,
  OPERATION_GROUP_LABEL,
  type NavItem,
  hasPermission,
} from "./navItems";

// Estados de estilo por variante, según tokens-de-marca.md §5.3.
const DESKTOP_TAB = {
  base: "inline-flex items-center border-b-2 px-1 pb-2 text-xs font-semibold transition",
  active: "border-white text-white",
  inactive: "border-transparent text-white/60 hover:text-white/90",
  disabled: "cursor-not-allowed border-transparent text-white/40",
};

const MOBILE_ITEM = {
  base: "block rounded-xl px-3 py-2 text-sm transition",
  active: "bg-red-50 font-semibold text-red-700",
  inactive: "text-gray-700 hover:bg-gray-50",
  disabled: "cursor-not-allowed text-gray-400",
};

type ItemStyles = typeof DESKTOP_TAB;

function NavLink({
  item,
  styles,
  onNavigate,
}: {
  item: NavItem;
  styles: ItemStyles;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const isActive = router.pathname === item.href;

  // Módulo sin página todavía: se muestra deshabilitado con tooltip.
  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        title="Próximamente"
        className={`${styles.base} ${styles.disabled}`}
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${styles.base} ${isActive ? styles.active : styles.inactive}`}
    >
      {item.label}
    </Link>
  );
}

// Separador sutil entre grupos de dominio (Opción B). Comparte el `mb-2` de los
// tabs (DESKTOP_TAB.pb-2) para quedar alineado con el texto, no con la caja.
function GroupDivider() {
  return <span aria-hidden="true" className="mb-2 h-4 w-px bg-white/15" />;
}

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtramos por permisos atómicos del usuario (RBAC, ADR-001).
  // Cada rol ve su subconjunto: Gerencia → todos; Fiscalizador → Operación+Gestión
  // sin Planificación; Supervisor → Operación; Vendedor → Mapa; SIN_ROL → Dashboard.
  const permisos = user?.permisos ?? [];
  const operationItems = OPERATION_GROUP.filter((item) => hasPermission(permisos, item));
  const managementItems = MANAGEMENT_GROUP.filter((item) => hasPermission(permisos, item));

  const closeDrawer = () => setIsDrawerOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // El listener SIGNED_OUT del AuthContext limpia user; el proxy nos reenvía al login.
    router.push("/login");
  };

  return (
    <header className="bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)]">
      {/* Fila superior: título + cierre de sesión */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <Link href="/dashboard" className="text-xl font-extrabold tracking-tight text-white">
          Portal Watts
        </Link>

        <div className="hidden items-center lg:flex">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-white/70 transition hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Mobile: hamburguesa */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Abrir menú"
          className="rounded-md border border-white/40 p-2 text-white lg:hidden"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {/* Fila de tabs (desktop): un solo nivel agrupado por dominio,
          separador superior según tokens-de-marca §5.3 */}
      <nav className="hidden items-center gap-4 border-t border-white/15 px-6 pt-3 lg:flex">
        <NavLink item={DASHBOARD_TAB} styles={DESKTOP_TAB} />

        {operationItems.length > 0 && (
          <>
            <GroupDivider />
            {operationItems.map((item) => (
              <NavLink key={item.href} item={item} styles={DESKTOP_TAB} />
            ))}
          </>
        )}

        {managementItems.length > 0 && (
          <>
            <GroupDivider />
            {managementItems.map((item) => (
              <NavLink key={item.href} item={item} styles={DESKTOP_TAB} />
            ))}
          </>
        )}

        {/* Link de ayuda siempre visible al final del nav */}
        <div className="ml-auto">
          <NavLink item={HELP_LINK} styles={DESKTOP_TAB} />
        </div>
      </nav>

      {/* Drawer lateral mobile (tokens-de-marca §5.3: w-72, header en gradiente,
          items activos bg-red-50 / inactivos hover:bg-gray-50) */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeDrawer} aria-hidden="true" />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)] px-4 py-4">
              <span className="text-xl font-extrabold tracking-tight text-white">
                Portal Watts
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar menú"
                className="text-white/80 transition hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </header>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              <NavLink item={DASHBOARD_TAB} styles={MOBILE_ITEM} onNavigate={closeDrawer} />

              {operationItems.length > 0 && (
                <div className="pt-3">
                  <p className="px-3 pb-1 text-[10px] font-bold tracking-[0.08em] text-gray-400 uppercase">
                    {OPERATION_GROUP_LABEL}
                  </p>
                  {operationItems.map((item) => (
                    <NavLink key={item.href} item={item} styles={MOBILE_ITEM} onNavigate={closeDrawer} />
                  ))}
                </div>
              )}

              {managementItems.length > 0 && (
                <div className="pt-3">
                  <p className="px-3 pb-1 text-[10px] font-bold tracking-[0.08em] text-gray-400 uppercase">
                    {MANAGEMENT_GROUP_LABEL}
                  </p>
                  {managementItems.map((item) => (
                    <NavLink key={item.href} item={item} styles={MOBILE_ITEM} onNavigate={closeDrawer} />
                  ))}
                </div>
              )}

              <div className="pt-3">
                <NavLink item={HELP_LINK} styles={MOBILE_ITEM} onNavigate={closeDrawer} />
              </div>
            </nav>

            <footer className="border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  void handleLogout();
                }}
                className="w-full rounded-xl bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Cerrar sesión
              </button>
            </footer>
          </aside>
        </>
      )}
    </header>
  );
}