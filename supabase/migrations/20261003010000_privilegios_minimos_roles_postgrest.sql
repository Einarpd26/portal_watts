-- ==============================================================================
-- Migración: Privilegios mínimos para los roles de PostgREST (sin policies)
-- Contexto: ADR-001 §E descarta RLS por alcance académico. Para que esa decisión sea
--           segura, los roles `anon` y `authenticated` no deben poder escribir en las
--           tablas: toda escritura pasa por las API Routes con service role.
--           `authenticated` conserva SELECT (el cliente de sesión lee personas,
--           usuario_roles y roles; el navegador lee catálogos). Las policies por fila
--           se definirán al estabilizar las reglas de negocio.
-- ==============================================================================

-- 1. anon (sin sesión): ningún acceso a tablas. Ninguna ruta lo usa contra tablas.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. authenticated: solo lectura. Las escrituras usan service role (bypass de privilegios).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- 3. Tablas de seguridad: solo service role (bitácora e intentos de login)
REVOKE ALL ON public.bitacora FROM authenticated;
REVOKE ALL ON public.intentos_login FROM authenticated;

-- 4. Las policies de estas dos tablas dejan de tener efecto y contradicen el ADR
--    (en particular, la de INSERT permitía a `anon` falsificar la bitácora).
DROP POLICY IF EXISTS "Permitir insercion de eventos en bitacora" ON public.bitacora;
DROP POLICY IF EXISTS "Permitir consulta de bitacora a roles autorizados" ON public.bitacora;
DROP POLICY IF EXISTS "Permitir consulta de intentos a administradores" ON public.intentos_login;

-- 5. Tablas futuras: que no nazcan abiertas
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM authenticated;
