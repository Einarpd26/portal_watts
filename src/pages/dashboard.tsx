import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/router';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    // Cerramos sesión en Supabase (elimina la cookie automáticamente)
    await supabase.auth.signOut();
    // Redirigimos al login
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-medium">Cargando sesión y permisos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Control (Dashboard)</h1>
          <button
            onClick={handleLogout}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>

        {user ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded">
              <p className="font-semibold text-lg">
                ¡Sesión iniciada con éxito mediante Cookies HttpOnly!
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border space-y-2 text-sm text-gray-700">
              <p><strong>ID Persona:</strong> {user.id_persona}</p>
              <p><strong>Colaborador:</strong> {user.nombres} {user.apellidos}</p>
              <p><strong>CI:</strong> {user.ci}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Rol Código:</strong> <span className="bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded">{user.rol_codigo}</span></p>
              <p><strong>Alcance:</strong> {user.alcance_tipo}</p>
              <p><strong>ID Sucursal:</strong> {user.id_sucursal ?? 'GLOBAL (Sin sucursal fija)'}</p>
              <div>
                <strong>Permisos Asignados:</strong>
                <ul className="list-disc list-inside mt-1 ml-2 text-xs font-mono text-gray-600">
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
    </div>
  );
}
