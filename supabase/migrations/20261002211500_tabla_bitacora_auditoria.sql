-- ==============================================================================
-- Migración: Tabla de Bitácora de Transacciones y Auditoría del Sistema
-- Proyecto: Portal Watts (Caramelos Watts S.R.L. - Canal Minorista)
-- Asignatura: INF-342 Sistemas de Información I — UAGRM
-- Requisito: RNF Trazabilidad y Auditoría de Seguridad (Horario estándar UTC 0)
-- ==============================================================================

-- 1. TABLA: bitacora
-- Registro histórico inmutable de transacciones y eventos relevantes del sistema.
-- Los registros de fecha y hora se almacenan estrictamente en UTC 0.
CREATE TABLE IF NOT EXISTS public.bitacora (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_persona bigint REFERENCES public.personas(id) ON DELETE SET NULL,
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_email text NOT NULL,
    usuario_rol text,
    modulo text NOT NULL,          -- 'AUTENTICACION', 'ACCESOS', 'PERSONAL', 'SISTEMA'
    accion text NOT NULL,          -- 'INICIO_SESION', 'CIERRE_SESION', 'LOGIN_FALLIDO', 'CREAR_PERSONAL', 'EDITAR_PERSONAL', 'BAJA_PERSONAL', 'INVITAR_USUARIO', 'REVOCAR_ACCESO', 'CAMBIO_PASSWORD'
    descripcion text NOT NULL,     -- Detalle en lenguaje natural de la operación
    direccion_ip text,             -- Dirección IP del cliente
    user_agent text,               -- Navegador / Dispositivo cliente
    detalles_json jsonb DEFAULT '{}'::jsonb, -- Metadatos del evento en JSONB
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()) -- Almacenado estrictamente en UTC 0
);

COMMENT ON TABLE public.bitacora IS 'Bitácora central de auditoría del sistema en tiempo universal UTC 0.';
COMMENT ON COLUMN public.bitacora.created_at IS 'Fecha y hora exacta de la transacción registrada en UTC 0.';
COMMENT ON COLUMN public.bitacora.detalles_json IS 'Metadatos complementarios en formato JSONB con el contexto de la transacción.';

-- 2. ÍNDICES DE AUDITORÍA
CREATE INDEX IF NOT EXISTS idx_bitacora_created_at ON public.bitacora (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_modulo ON public.bitacora (modulo);
CREATE INDEX IF NOT EXISTS idx_bitacora_accion ON public.bitacora (accion);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario_email ON public.bitacora (usuario_email);
CREATE INDEX IF NOT EXISTS idx_bitacora_id_persona ON public.bitacora (id_persona);

-- 3. PERMISO ATÓMICO RBAC: bitacora:consultar
-- Asignar el permiso a los roles con facultad de auditoría: GERENCIA_COMERCIAL y FISCALIZADOR
UPDATE public.roles
SET permisos = array_append(permisos, 'bitacora:consultar')
WHERE codigo IN ('GERENCIA_COMERCIAL', 'FISCALIZADOR')
  AND NOT ('bitacora:consultar' = ANY(permisos));

-- 4. SEGURIDAD A NIVEL DE FILAS (RLS)
ALTER TABLE public.bitacora ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Solo usuarios autorizados (GERENCIA_COMERCIAL o FISCALIZADOR)
CREATE POLICY "Permitir consulta de bitacora a roles autorizados"
    ON public.bitacora
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuario_roles ur
            JOIN public.roles r ON r.id = ur.id_rol
            JOIN public.personas p ON p.id = ur.id_persona
            WHERE p.auth_user_id = auth.uid()
            AND ('bitacora:consultar' = ANY(r.permisos) OR r.codigo IN ('GERENCIA_COMERCIAL', 'FISCALIZADOR'))
        )
    );

-- Política de inserción: El backend (API Routes o triggers) insertan eventos
CREATE POLICY "Permitir insercion de eventos en bitacora"
    ON public.bitacora
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
