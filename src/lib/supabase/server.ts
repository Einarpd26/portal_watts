import { createClient as createGenericClient } from '@supabase/supabase-js';
import { createServerClient, serializeCookieHeader } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetServerSidePropsContext } from 'next';
import { NOMBRE_COOKIE_SESION } from './cookie';
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
    cookieOptions: { name: NOMBRE_COOKIE_SESION },
    cookies: {
      getAll() {
        return Object.entries(req.cookies).map(([name, value]) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet) {
        const newHeaders = cookiesToSet.map(({ name, value, options }) =>
          serializeCookieHeader(name, value, {
            ...options,
            secure: options?.secure ?? process.env.NODE_ENV === 'production',
          })
        );

        const existing = res.getHeader('Set-Cookie');
        const existingHeaders = Array.isArray(existing)
          ? existing.map(String)
          : existing != null
            ? [String(existing)]
            : [];

        res.setHeader('Set-Cookie', [...existingHeaders, ...newHeaders]);
      },
    },
  });
}
