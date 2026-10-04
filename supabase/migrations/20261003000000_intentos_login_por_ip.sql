-- ==============================================================================
-- Migración: Bloqueo de login por par (email, ip)
-- Motivo: con una fila por email, cualquiera podía bloquear la cuenta de otro
--         provocando fallos a propósito. Ahora el contador y el bloqueo aplican
--         al par (email, ip): el atacante se bloquea a sí mismo y el titular
--         puede seguir entrando desde otra red.
-- ==============================================================================

ALTER TABLE public.intentos_login
    ADD COLUMN IF NOT EXISTS ip text NOT NULL DEFAULT 'desconocida';

COMMENT ON COLUMN public.intentos_login.ip IS 'IP de origen de los intentos (confiable solo con TRUSTED_PROXY_HOPS correcto). ''desconocida'' = sin IP resoluble o filas previas a esta migración.';

ALTER TABLE public.intentos_login
    DROP CONSTRAINT IF EXISTS intentos_login_email_key;

ALTER TABLE public.intentos_login
    ADD CONSTRAINT intentos_login_email_ip_key UNIQUE (email, ip);

DROP INDEX IF EXISTS public.idx_intentos_login_email;
CREATE INDEX IF NOT EXISTS idx_intentos_login_email ON public.intentos_login (email);
