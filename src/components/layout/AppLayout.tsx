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
// BOCETO: App Shell (top bar global + sidebar). Patrón enterprise estándar
// (Salesforce, SAP Fiori, AWS Console). Se filtra por permisos igual que el
// Navbar (RBAC, ADR-001). Si no convence, se revierte al Navbar agrupado.
// ==============================================================================

const SIDEBAR_ITEM = {
  base: "block rounded-lg px-3 py-2 text-sm transition",
  active: "bg-red-50 font-semibold text-red-700",
  inactive: "text-gray-700 hover:bg-gray-50",
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
    <p className="px-3 pb-1 pt-4 text-[10px] font-bold tracking-[0.08em] text-gray-400 uppercase">
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
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Top bar global: identidad + usuario */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md border border-gray-200 p-2 text-gray-600 md:hidden"
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
          <Link href="/dashboard" className="text-xl font-extrabold tracking-tight text-primary-700">
            Portal Watts
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-gray-600 sm:inline">
            {user?.nombres} {user?.apellidos}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="font-semibold text-red-600 transition hover:text-red-700"
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
                <span className="text-lg font-extrabold tracking-tight text-primary-700">
                  Portal Watts
                </span>
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