import { createClient as createGenericClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetServerSidePropsContext } from 'next';
import type { Database } from '@/types/database';

/**
 * 1. Cliente Administrador (Service Role)
 *
 * Utiliza SUPABASE_SERVICE_ROLE_KEY (llave maestra secreta).
 * SOLO DEBE USARSE EN EL SERVIDOR (API Routes / getServerSideProps).
 * NUNCA debe exponerse al navegador.
 *
 * Se utiliza para:
 * - Invitar o crear cuentas de usuario en auth.users (CU-02).
 * - Modificar roles y asignaciones con privilegios de sistema.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Faltan variables de entorno para admin: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createGenericClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * 2. Cliente de Servidor con Contexto de Sesión (Cookies)
 *
 * Lee y escribe cookies en peticiones HTTP (API Routes o getServerSideProps).
 * Permite saber quién es el usuario autenticado desde el servidor.
 */
export function createServerClientForReqRes(
  req: NextApiRequest | GetServerSidePropsContext['req'],
  res: NextApiResponse | GetServerSidePropsContext['res']
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno públicas de Supabase');
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies).map(([name, value]) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieStr = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=${options?.sameSite || 'Lax'}`;
          if (options?.maxAge) cookieStr += `; Max-Age=${options.maxAge}`;
          if (options?.domain) cookieStr += `; Domain=${options.domain}`;
          if (options?.secure) cookieStr += '; Secure';
          if (options?.httpOnly) cookieStr += '; HttpOnly';

          const currentCookies = res.getHeader('Set-Cookie');
          if (!currentCookies) {
            res.setHeader('Set-Cookie', cookieStr);
          } else if (Array.isArray(currentCookies)) {
            res.setHeader('Set-Cookie', [...currentCookies, cookieStr]);
          } else {
            res.setHeader('Set-Cookie', [String(currentCookies), cookieStr]);
          }
        });
      },
    },
  });
}
