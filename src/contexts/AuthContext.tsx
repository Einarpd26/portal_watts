"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import type { UserSession } from '@/types';
import { createClient } from '@/lib/supabase/client';

export type RefreshUserResult = {
  success: boolean;
  user?: UserSession;
  error?: string;
  code?: string;
  status?: number;
};

// 1. Definimos qué forma tiene nuestro contexto
type AuthContextType = {
  user: UserSession | null;
  isLoading: boolean;
  refreshUser: () => Promise<RefreshUserResult>;
  logout: () => Promise<void>;
};

// 2. Creamos el contexto en sí
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Creamos el Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Refresca el perfil del usuario consultando la API (lee la cookie HttpOnly).
  // Devuelve el resultado para que el login pueda reaccionar ante errores de perfil
  // (ej. usuario dado de baja o inactivo, CU-01 A2).
  const refreshUser = useCallback(async (): Promise<RefreshUserResult> => {
    try {
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true, user: data.user };
      } else {
        let errorData: { error?: string; code?: string } = {};
        try {
          errorData = await response.json();
        } catch (jsonErr) {
          console.error('Error parseando respuesta JSON de /api/auth/me:', jsonErr);
        }

        setUser(null);
        return {
          success: false,
          error: errorData.error || 'Sesión no válida',
          code: errorData.code,
          status: response.status,
        };
      }
    } catch (error) {
      console.error('Error obteniendo la sesión:', error);
      setUser(null);
      return { success: false, error: 'Error de conexión con el servidor de autenticación' };
    }
  }, []);

  // Cierre de sesión centralizado: destruye cookies de Supabase Auth,
  // limpia el estado en memoria y redirige con replace para no dejar historial
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Registrar cierre de sesión en bitácora antes de invalidar la sesión
      await fetch('/api/auth/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'CIERRE_SESION',
          email: user?.email,
        }),
      }).catch((logErr: unknown) => {
        console.error('Error registrando cierre de sesión en bitácora:', logErr);
      });

      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    } finally {
      setUser(null);
      setIsLoading(false);
      await router.replace('/login');
    }
  }, [router, user?.email]);

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
    let ignore = false;
    async function loadInitialSession() {
      await refreshUser();
      if (!ignore) {
        setIsLoading(false);
      }
    }
    void loadInitialSession();

    // Protección anti-bfcache: si el usuario pulsa "Atrás" tras cerrar sesión,
    // el evento pageshow se dispara con persisted=true y fuerza la re-verificación
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void refreshUser();
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      ignore = true;
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 4. Custom hook para consumir el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
