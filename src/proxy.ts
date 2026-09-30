import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
  const { data: { user } } = await supabase.auth.getUser();

  // 4. Reglas del "Guardia de Seguridad"
  const path = request.nextUrl.pathname;
  const isLoginPage = path === '/login';
  
  // Rutas protegidas: /admin, /dashboard, y cualquier otra que no sea /login ni /
  const isProtectedRoute =
    path.startsWith('/admin') ||
    path.startsWith('/dashboard') ||
    (path !== '/login' && path !== '/');

  // Regla A: No tiene cuenta e intenta entrar a zona privada -> Al Login
  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  // Regla B: Ya tiene cuenta e intenta entrar al Login -> Al Dashboard
  if (user && isLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard'; // Más adelante redirigirás según su rol
    return NextResponse.redirect(dashboardUrl);
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
