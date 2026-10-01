import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import type { PageWithLayout } from "@/types";

const ADMIN_ROLES = ["GERENCIA_COMERCIAL", "FISCALIZADOR"];

const MODULE_BY_ROLE: Record<string, string> = {
  SUPERVISOR: "Planificación",
  VENDEDOR: "Mapa",
};

const DashboardPage: PageWithLayout = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && ADMIN_ROLES.includes(user.rol_codigo)) {
      void router.replace("/admin/usuarios");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="font-medium text-gray-500">Cargando sesión y permisos...</p>
      </div>
    );
  }

  // Redirect in flight for admin roles
  if (ADMIN_ROLES.includes(user.rol_codigo)) return null;

  // SUPERVISOR / VENDEDOR — módulo en construcción
  const modulo = MODULE_BY_ROLE[user.rol_codigo];
  if (modulo) {
    return (
      <div className="mx-auto max-w-sm mt-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg
            className="h-8 w-8 text-red-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 2 2 7l10 5 10-5-10-5Z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800">Módulo en construcción</h1>
        <p className="mt-2 text-sm text-gray-500">
          Hola, <strong>{user.nombres}</strong>. El módulo de{" "}
          <strong>{modulo}</strong> está en desarrollo.
        </p>
        <p className="mt-1 text-xs text-gray-400">Estará disponible próximamente.</p>
      </div>
    );
  }

  // SIN_ROL — debug screen
  return (
    <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control (Dashboard)</h1>
      </div>
      <div className="space-y-4">
        <div className="rounded-btn border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="text-lg font-semibold">
            ¡Sesión iniciada con éxito mediante Cookies HttpOnly!
          </p>
        </div>
        <div className="space-y-2 rounded-md border bg-gray-50 p-4 text-sm text-gray-700">
          <p><strong>ID Persona:</strong> {user.id_persona}</p>
          <p><strong>Colaborador:</strong> {user.nombres} {user.apellidos}</p>
          <p><strong>CI:</strong> {user.ci}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p>
            <strong>Rol Código:</strong>{" "}
            <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">
              {user.rol_codigo}
            </span>
          </p>
          <p><strong>Alcance:</strong> {user.alcance_tipo}</p>
          <p><strong>ID Sucursal:</strong> {user.id_sucursal ?? "GLOBAL (Sin sucursal fija)"}</p>
          <div>
            <strong>Permisos Asignados:</strong>
            <ul className="ml-2 mt-1 list-inside list-disc text-xs font-mono text-gray-600">
              {user.permisos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

DashboardPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;
export default DashboardPage;
