import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

let supabaseBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Cliente de Supabase para el navegador (React / Client-Side)
 * Implementa el patrón Singleton para evitar múltiples conexiones en el cliente.
 */
export function createClient() {
  if (supabaseBrowserClient) return supabaseBrowserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
    );
  }

  supabaseBrowserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  );

  return supabaseBrowserClient;
}
