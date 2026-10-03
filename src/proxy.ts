import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getPasswordChangeState } from '@/utils/passwordChange';
import { logger } from '@/lib/logger';

export async function proxy(request: NextRequest) {
  // 1. Creamos una respuesta inicial que permite continuar la petición
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 2. Inicializamos el cliente de Supabase (Versión Middleware)
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Magia de Supabase: Si el token (JWT) expiró, Supabase pide uno nuevo (Refresh Token).
        // Aquí actualizamos ese nuevo token tanto en la Request como en la Response.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        
        response = NextResponse.next({
          request,
        });
        
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 3. Validar el usuario (comprueba la cookie contra los servidores de Supabase)
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err: unknown) {
    logger.error('Error obteniendo usuario en proxy middleware:', err);
    user = null;
  }

  // 4. Reglas del "Guardia de Seguridad"
  const path = request.nextUrl.pathname;
  const isLoginPage = path === '/login';
  const isForgotPasswordPage = path === '/auth/forgot-password';
  const isAuthPage = path.startsWith('/auth/');
  
  // Rutas públicas: /, /login, /auth/* (recuperación de contraseña, callbacks)
  const isPublicRoute = path === '/' || isLoginPage || isAuthPage;
  const isProtectedRoute = !isPublicRoute;

  // Cambio obligatorio de contraseña temporal (CU-01 A3). Se evalúa antes que las
  // reglas A/B para que ninguna ruta privada ni el login lo esquiven.
  const isChangePasswordPage = path === '/cambiar-password';
  const pwState = user ? getPasswordChangeState(user.app_metadata) : 'none';

  // Redirige conservando las cookies que el cliente de Supabase haya escrito en `response`
  const redirectTo = (pathname: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (user && pwState === 'expired') {
    // La temporal venció sin usarse: se cierra la sesión (signOut limpia las cookies en `response`)
    try {
      await supabase.auth.signOut();
    } catch (signOutErr: unknown) {
      logger.error('Error cerrando sesión de credencial expirada en proxy:', signOutErr);
    }
    if (isLoginPage || isForgotPasswordPage) return response;
    return redirectTo('/login', '?error=temp_password_expired');
  }

  if (user && pwState === 'required' && !isChangePasswordPage) {
    return redirectTo('/cambiar-password');
  }

  if (user && pwState === 'none' && isChangePasswordPage) {
    return redirectTo('/dashboard');
  }

  // Regla A: No tiene cuenta e intenta entrar a zona privada -> Al Login
  if (!user && isProtectedRoute) {
    return redirectTo('/login');
  }

  // Regla B: Ya tiene cuenta activa normal e intenta entrar al Login o a Recuperar -> Al Dashboard
  // Nota: No se redirige /auth/reset-password porque el usuario que llega desde el correo de recuperación
  // cuenta con una sesión temporal de recovery otorgada por Supabase para cambiar su clave.
  if (user && (isLoginPage || isForgotPasswordPage) && pwState === 'none') {
    return redirectTo('/dashboard');
  }

  // 5. Todo en orden, le abrimos la puerta
  return response;
}

// 6. Configuración de Filtro: Le decimos a Next.js en qué rutas DEBE ejecutar a este guardia.
export const config = {
  matcher: [
    /*
     * Ignora archivos estáticos e internos de Next.js para no gastar recursos
     * evaluando imágenes, CSS, o el endpoint /api (tu API ya se cuida sola)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
