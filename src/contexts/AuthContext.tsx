import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserSession } from '@/types';

// 1. Definimos qué forma tiene nuestro contexto
type AuthContextType = {
  user: UserSession | null;
  isLoading: boolean;
};

// 2. Creamos el contexto en sí (la "nube" de datos, inicialmente vacía)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Creamos el Provider (el componente que envuelve la app y alimenta la nube)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Al montar la aplicación, consultamos a nuestro "mesero" (la API)
    async function fetchSession() {
      try {
        const response = await fetch('/api/auth/me'); // Hacemos el GET
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user); // Guardamos el usuario en la nube
        } else {
          setUser(null); // No hay sesión válida (ej. devolvió 401)
        }
      } catch (error) {
        console.error('Error obteniendo la sesión:', error);
        setUser(null);
      } finally {
        setIsLoading(false); // Ya terminamos de cargar, sea éxito o error
      }
    }

    fetchSession();
  }, []); // El array vacío asegura que esto corra solo una vez cuando la app carga

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
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
