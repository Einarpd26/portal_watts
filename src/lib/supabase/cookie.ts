/**
 * Nombre de la cookie de sesión de Supabase. Por defecto @supabase/ssr la llama `sb-<primera parte del host>-auth-token`,
 * y en desarrollo local eso es `sb-127-auth-token` en cualquier proyecto que use 127.0.0.1. Las cookies no distinguen
 * puertos, así que dos aplicaciones locales se pisaban la sesión entre sí. Con un nombre propio no se mezclan.
 * Sin dependencias del navegador ni de Node: lo usan el cliente, el servidor y el proxy.
 */
export const NOMBRE_COOKIE_SESION = 'sb-portal-watts-auth-token';
