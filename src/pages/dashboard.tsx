import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import type { PageWithLayout } from "@/types";

const DashboardPage: PageWithLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-medium text-gray-500">Cargando sesión y permisos...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Panel de Control (Dashboard)</h1>
      </div>

      {user ? (
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
            <p><strong>Rol Código:</strong> <span className="rounded bg-blue-100 px-2 py-0.5 font-mono text-blue-800">{user.rol_codigo}</span></p>
            <p><strong>Alcance:</strong> {user.alcance_tipo}</p>
            <p><strong>ID Sucursal:</strong> {user.id_sucursal ?? 'GLOBAL (Sin sucursal fija)'}</p>
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
      ) : (
        <p className="text-red-500">No hay información de sesión disponible.</p>
      )}
    </div>
  );
};

// Pantalla interna: se envuelve en el AppLayout (navbar persistente).
DashboardPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default DashboardPage;