import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
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

// Íconos por href (rescatados de la exploración de sidebar en
// design/tokens-de-marca). Sin width/height fijo: el tamaño lo controla el
// <span> que envuelve al ícono en NavLink (18px en el drawer mobile, 14px en
// los tabs de escritorio, para no desbalancear el texto compacto del tab).
const NAV_ICONS: Record<string, ReactNode> = {
  "/dashboard": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  "/mapa": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
  "/planificacion": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3V1.5M15 3V1.5M9 12l2 2 4-4" />
    </svg>
  ),
  "/admin/personal": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 6M21 20c0-2.6-1.7-4.9-4-5.6" />
    </svg>
  ),
  "/admin/usuarios": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 6v6c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6L12 2Z" />
    </svg>
  ),
  "/cuentas": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2V3Z" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  ),
  "/territorio": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  ),
  "/ayuda": (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.5 2.5 0 1 1 4 2.2c-.8.7-1.5 1.1-1.5 2.4" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

// Estados de estilo por variante, según tokens-de-marca.md §5.3.
const DESKTOP_TAB = {
  base: "inline-flex items-center border-b-2 px-1 pb-1.5 text-xs font-semibold transition",
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
  showIcon = false,
  iconSize = "h-[18px] w-[18px]",
}: {
  item: NavItem;
  styles: ItemStyles;
  onNavigate?: () => void;
  showIcon?: boolean;
  /** Clases de tamaño del ícono (Tailwind). Ajustar según la escala del tab. */
  iconSize?: string;
}) {
  const router = useRouter();
  const isActive = router.pathname === item.href;
  const icon = showIcon ? NAV_ICONS[item.href] : null;

  // Sin color propio: el ícono hereda currentColor del texto (state activo/
  // inactivo/deshabilitado), así funciona igual sobre el gradiente rojo del
  // desktop y sobre el fondo blanco del drawer mobile.
  const iconWrapper = icon && <span className={`shrink-0 ${iconSize}`}>{icon}</span>;

  // Módulo sin página todavía: se muestra deshabilitado con tooltip.
  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        title="Próximamente"
        className={`${styles.base} ${styles.disabled} flex items-center gap-2.5`}
      >
        {iconWrapper}
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${styles.base} ${isActive ? styles.active : styles.inactive} flex items-center gap-2.5`}
    >
      {iconWrapper}
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

  // Iniciales para el avatar de marca (ej. "EP").
  const initials = `${user?.nombres?.[0] ?? ""}${user?.apellidos?.[0] ?? ""}`.toUpperCase();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // El listener SIGNED_OUT del AuthContext limpia user; el proxy nos reenvía al login.
    router.push("/login");
  };

  return (
    <header className="bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)]">
      {/* Fila superior: logo + identidad de usuario + cierre de sesión */}
      <div className="flex items-center justify-between px-6 py-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Logo corporativo en blanco: contrasta directo sobre el gradiente, sin chip. */}
          <Image
            src="/watts_logo_blanco.png"
            alt="Caramelos Watts"
            width={94}
            height={28}
            priority
            className="h-6 w-auto"
          />
          <span aria-hidden="true" className="hidden h-5 w-px bg-white/15 sm:block" />
          <span className="hidden text-sm font-extrabold tracking-tight text-white sm:block">
            Portal Web
          </span>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          {user && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/25 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <span className="text-sm text-white/80">
            {user?.nombres} {user?.apellidos}
          </span>
          <span aria-hidden="true" className="h-5 w-px bg-white/15" />
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
      <nav className="hidden items-center gap-4 border-t border-white/15 px-6 pt-1.5 lg:flex">
        <NavLink item={DASHBOARD_TAB} styles={DESKTOP_TAB} showIcon iconSize="h-3.5 w-3.5" />

        {operationItems.length > 0 && (
          <>
            <GroupDivider />
            {operationItems.map((item) => (
              <span key={item.href} className="inline-flex items-center gap-1">
                <NavLink item={item} styles={DESKTOP_TAB} showIcon iconSize="h-3.5 w-3.5" />
                {item.action && item.available && (
                  <Link
                    href={item.action.href}
                    title={item.action.label}
                    aria-label={item.action.label}
                    className="mb-2 flex h-4 w-4 items-center justify-center rounded border border-white/20 text-white/50 transition hover:border-white/40 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 4v16M4 12h16" />
                    </svg>
                  </Link>
                )}
              </span>
            ))}
          </>
        )}

        {managementItems.length > 0 && (
          <>
            <GroupDivider />
            {managementItems.map((item) => (
              <span key={item.href} className="inline-flex items-center gap-1">
                <NavLink item={item} styles={DESKTOP_TAB} showIcon iconSize="h-3.5 w-3.5" />
                {item.action && item.available && (
                  <Link
                    href={item.action.href}
                    title={item.action.label}
                    aria-label={item.action.label}
                    className="mb-2 flex h-4 w-4 items-center justify-center rounded border border-white/20 text-white/50 transition hover:border-white/40 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M12 4v16M4 12h16" />
                    </svg>
                  </Link>
                )}
              </span>
            ))}
          </>
        )}

        {/* Link de ayuda siempre visible al final del nav */}
        <div className="ml-auto">
          <NavLink item={HELP_LINK} styles={DESKTOP_TAB} showIcon iconSize="h-3.5 w-3.5" />
        </div>
      </nav>

      {/* Drawer lateral mobile (tokens-de-marca §5.3: w-72, header en gradiente,
          items activos bg-red-50 / inactivos hover:bg-gray-50) */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeDrawer} aria-hidden="true" />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)] px-4 py-4">
              <Image
                src="/watts_logo_blanco.png"
                alt="Caramelos Watts"
                width={94}
                height={28}
                className="h-7 w-auto"
              />
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
              <NavLink item={DASHBOARD_TAB} styles={MOBILE_ITEM} onNavigate={closeDrawer} showIcon />

              {operationItems.length > 0 && (
                <div className="pt-3">
                  <p className="px-3 pb-1 text-[10px] font-bold tracking-[0.08em] text-gray-400 uppercase">
                    {OPERATION_GROUP_LABEL}
                  </p>
                  {operationItems.map((item) => (
                    <div key={item.href} className="flex items-center gap-1">
                      <div className="flex-1">
                        <NavLink item={item} styles={MOBILE_ITEM} onNavigate={closeDrawer} showIcon />
                      </div>
                      {item.action && item.available && (
                        <Link
                          href={item.action.href}
                          title={item.action.label}
                          aria-label={item.action.label}
                          onClick={closeDrawer}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 4v16M4 12h16" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {managementItems.length > 0 && (
                <div className="pt-3">
                  <p className="px-3 pb-1 text-[10px] font-bold tracking-[0.08em] text-gray-400 uppercase">
                    {MANAGEMENT_GROUP_LABEL}
                  </p>
                  {managementItems.map((item) => (
                    <div key={item.href} className="flex items-center gap-1">
                      <div className="flex-1">
                        <NavLink item={item} styles={MOBILE_ITEM} onNavigate={closeDrawer} showIcon />
                      </div>
                      {item.action && item.available && (
                        <Link
                          href={item.action.href}
                          title={item.action.label}
                          aria-label={item.action.label}
                          onClick={closeDrawer}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 4v16M4 12h16" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3">
                <NavLink item={HELP_LINK} styles={MOBILE_ITEM} onNavigate={closeDrawer} showIcon />
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