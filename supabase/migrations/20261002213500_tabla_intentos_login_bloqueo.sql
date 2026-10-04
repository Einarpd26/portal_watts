-- ==============================================================================
-- Migración: Control de Intentos Fallidos y Bloqueo Escalonado de Cuentas
-- Proyecto: Portal Watts (Caramelos Watts S.R.L.)
-- Asignatura: INF-342 Sistemas de Información I — UAGRM
-- Requisito: Política de Seguridad OWASP — Bloqueo de 3 intentos:
--            1er ciclo (3 fallos): Bloqueo temporal por 15 minutos (enfriamiento).
--            2do ciclo (3 fallos): Bloqueo temporal por 1 hora (enfriamiento).
--            3er ciclo (3 fallos): Bloqueo permanente (requiere intervención de administrador).
--            Marcas de tiempo estrictamente en UTC 0.
-- ==============================================================================

-- 1. TABLA: intentos_login
CREATE TABLE IF NOT EXISTS public.intentos_login (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL UNIQUE,
    intentos_fallidos integer NOT NULL DEFAULT 0,
    bloqueos_acumulados integer NOT NULL DEFAULT 0, -- 0: ninguno, 1: 15 min, 2: 1 hora, 3+: permanente
    bloqueado_hasta timestamptz NULL,              -- Almacenado en UTC 0
    es_permanente boolean NOT NULL DEFAULT false,   -- Bloqueo definitivo tras 3 ciclos
    ultimo_intento timestamptz NOT NULL DEFAULT timezone('utc', now()),
    ultimo_desbloqueo timestamptz NULL,
    desbloqueado_por text NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

COMMENT ON TABLE public.intentos_login IS 'Rastreo de intentos fallidos y política de bloqueo temporal escalonado y permanente en UTC 0.';
COMMENT ON COLUMN public.intentos_login.bloqueado_hasta IS 'Fin del período de enfriamiento temporal en estándar universal UTC 0.';
COMMENT ON COLUMN public.intentos_login.es_permanente IS 'Indica si la cuenta quedó bloqueada indefinidamente tras acumular 3 bloqueos temporales previos.';

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_intentos_login_email ON public.intentos_login (email);
CREATE INDEX IF NOT EXISTS idx_intentos_login_bloqueado_hasta ON public.intentos_login (bloqueado_hasta);

-- 3. ACCESO
-- Solo service role (API Routes). Sin policies (ADR-001 §E): sin
-- privilegios para anon ni authenticated (ver migración capa1).
ALTER TABLE public.intentos_login ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intentos_login FROM authenticated;
