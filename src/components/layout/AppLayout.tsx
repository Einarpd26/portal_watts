import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { ReactNode } from "react";
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

// ==============================================================================
// App Shell (top bar global + sidebar) con identidad de marca — Combo
// "Marca Equilibrada" + sidebar con íconos.
// Marca aplicada (tokens-de-marca.md):
//   §5.1 gradiente 135deg en el header y en la franja lateral del sidebar
//   §5.3 título, separadores y patrón de navegación
//   §9   logo horizontal sobre chip blanco (mantiene contraste sobre gradiente)
//   §4   shadow-brand en el item activo
// La textura diagonal y los orbs (§5.2) se reservan para pantallas de auth.
// ==============================================================================

// Íconos inline por href (locales al shell: la infra navItems.ts queda común
// a ambas ramas de diseño y no se toca).
const NAV_ICONS: Record<string, ReactNode> = {
  "/dashboard": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  "/mapa": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
  "/planificacion": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3V1.5M15 3V1.5M9 12l2 2 4-4" />
    </svg>
  ),
  "/personal": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 5.5a3 3 0 0 1 0 6M21 20c0-2.6-1.7-4.9-4-5.6" />
    </svg>
  ),
  "/cuentas": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3h16v18l-3-2-3 2-3-2-3 2-3-2V3Z" />
      <path d="M9 9h6M9 13h6" />
    </svg>
  ),
  "/territorio": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  ),
  "/ayuda": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.5 2.5 0 1 1 4 2.2c-.8.7-1.5 1.1-1.5 2.4" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

const SIDEBAR_ITEM = {
  base: "group block rounded-btn px-3 py-2 text-sm transition",
  active: "bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)] font-semibold text-white shadow-brand",
  inactive: "text-gray-700 hover:bg-primary-50 hover:text-primary-700",
  disabled: "cursor-not-allowed text-gray-400",
};

function SidebarLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const isActive = router.pathname === item.href;
  const icon = NAV_ICONS[item.href];

  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        title="Próximamente"
        className={`${SIDEBAR_ITEM.base} ${SIDEBAR_ITEM.disabled} flex items-center gap-2.5`}
      >
        {icon && <span className="shrink-0 text-gray-300">{icon}</span>}
        <span className="truncate">{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`${SIDEBAR_ITEM.base} ${isActive ? SIDEBAR_ITEM.active : SIDEBAR_ITEM.inactive}`}
    >
      <span className="flex items-center gap-2.5">
        {icon && (
          <span className="shrink-0 text-primary-600 transition group-hover:text-primary-700">
            {icon}
          </span>
        )}
        <span className="truncate">{item.label}</span>
      </span>
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-[0.08em] text-primary-700 uppercase">
      {children}
    </p>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const permisos = user?.permisos ?? [];
  const operationItems = OPERATION_GROUP.filter((item) => hasPermission(permisos, item));
  const managementItems = MANAGEMENT_GROUP.filter((item) => hasPermission(permisos, item));

  // Iniciales para el avatar de marca (ej. "EP")
  const initials = `${user?.nombres?.[0] ?? ""}${user?.apellidos?.[0] ?? ""}`.toUpperCase();

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const nav = (
    <>
      <SidebarLink item={DASHBOARD_TAB} onNavigate={closeSidebar} />

      {operationItems.length > 0 && (
        <div className="mt-1">
          <SectionLabel>{OPERATION_GROUP_LABEL}</SectionLabel>
          {operationItems.map((item) => (
            <SidebarLink key={item.href} item={item} onNavigate={closeSidebar} />
          ))}
        </div>
      )}

      {managementItems.length > 0 && (
        <div className="mt-1">
          <SectionLabel>{MANAGEMENT_GROUP_LABEL}</SectionLabel>
          {managementItems.map((item) => (
            <SidebarLink key={item.href} item={item} onNavigate={closeSidebar} />
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3">
        <SidebarLink item={HELP_LINK} onNavigate={closeSidebar} />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top bar global: gradiente de marca (§5.1) + identidad */}
      <header className="flex h-14 shrink-0 items-center justify-between bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)] px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md border border-white/30 p-2 text-white md:hidden"
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
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          {/* Logo corporativo sobre chip blanco (mantiene contraste sobre el gradiente) */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="rounded-md bg-white p-1.5">
              <Image
                src="/watts_logo_rojo.png"
                alt="Caramelos Watts"
                width={94}
                height={28}
                priority
                className="h-7 w-auto"
              />
            </span>
            <span aria-hidden="true" className="hidden h-5 w-px bg-white/15 sm:block" />
            <span className="hidden text-sm font-bold tracking-tight text-white sm:block">
              Portal Watts
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/25 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <span className="hidden text-sm text-white/80 md:inline">
            {user?.nombres} {user?.apellidos}
          </span>
          <span aria-hidden="true" className="hidden h-5 w-px bg-white/15 sm:block" />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-btn border border-white/25 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="relative hidden w-60 shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:flex">
          {/* Franja lateral de marca (tokens-de-marca.md §5.1) */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)]"
          />
          <div className="flex w-full flex-col px-3 py-4">{nav}</div>
        </aside>

        {/* Sidebar (mobile: overlay) */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white shadow-2xl md:hidden">
              {/* Franja lateral de marca (tokens-de-marca.md §5.1) */}
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(135deg,#7f1d1d_0%,#dc2626_100%)]"
              />
              <div className="flex w-full flex-col px-3 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <Image
                    src="/watts_logo_rojo.png"
                    alt="Caramelos Watts"
                    width={94}
                    height={28}
                    className="h-7 w-auto"
                  />
                  <button
                    type="button"
                    onClick={closeSidebar}
                    aria-label="Cerrar menú"
                    className="text-gray-400 transition hover:text-gray-600"
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
                </div>
                {nav}
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}