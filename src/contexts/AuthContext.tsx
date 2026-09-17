import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserSession } from '@/types';
import { createClient } from '@/lib/supabase/client';

// 1. Definimos qué forma tiene nuestro contexto
type AuthContextType = {
  user: UserSession | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

// 2. Creamos el contexto en sí (la "nube" de datos, inicialmente vacía)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Creamos el Provider (el componente que envuelve la app y alimenta la nube)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresca el perfil del usuario consultando la API (lee la cookie HttpOnly).
  // Se expone en el contexto para que las páginas puedan sincronizar el estado
  // ANTES de navegar (ej. login -> dashboard), sin depender de un F5.
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setUser(data.user); // Guardamos el usuario en la nube
      } else {
        setUser(null); // No hay sesión válida (ej. devolvió 401/403)
      }
    } catch (error) {
      console.error('Error obteniendo la sesión:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Escuchamos los cambios de sesión de Supabase para mantener el contexto
    // al día en transiciones SPA (login, logout, refresh de token), sin recargar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }

      // INITIAL_SESSION ya lo cubre `loadInitialSession()` (abajo): lo saltamos
      // para no duplicar el fetch de la carga inicial.
      if (event !== 'SIGNED_IN' && event !== 'TOKEN_REFRESHED') {
        return;
      }

      // La cookie HttpOnly ya fue actualizada por el cliente; traemos el perfil
      // completo (personas + rol + permisos) para el flujo SPA.
      void refreshUser();
    });

    // Carga inicial al montar la aplicación (cubre INITIAL_SESSION).
    // El flag `ignore` evita setState si el provider se desmonta antes de terminar.
    let ignore = false;
    async function loadInitialSession() {
      await refreshUser();
      if (!ignore) {
        setIsLoading(false); // Ya terminamos de cargar, sea éxito o error
      }
    }
    loadInitialSession();

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Creamos el custom hook para que cualquier componente pueda consumir la nube fácilmente
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
