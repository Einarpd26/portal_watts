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
// App Shell (top bar global + sidebar) con identidad de marca — Nivel 2.
// Marca aplicada (tokens-de-marca.md):
//   §5.1 gradiente 135deg en la franja superior del header
//   §5.3 título, separadores y patrón de navegación
//   §9   logo horizontal sobre fondo claro (h-8, width auto)
//   §4   shadow-brand en el item activo
// La textura diagonal y los orbs (§5.2) se reservan para pantallas de auth.
// ==============================================================================

const SIDEBAR_ITEM = {
  base: "block rounded-btn px-3 py-2 text-sm transition",
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

  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        title="Próximamente"
        className={`${SIDEBAR_ITEM.base} ${SIDEBAR_ITEM.disabled}`}
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
      className={`${SIDEBAR_ITEM.base} ${isActive ? SIDEBAR_ITEM.active : SIDEBAR_ITEM.inactive}`}
    >
      {item.label}
    </Link>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-[0.08em] text-primary-600 uppercase">
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
        <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white px-3 py-4 md:flex">
          {nav}
        </aside>

        {/* Sidebar (mobile: overlay) */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-white px-3 py-4 shadow-2xl md:hidden">
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
            </aside>
          </>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}