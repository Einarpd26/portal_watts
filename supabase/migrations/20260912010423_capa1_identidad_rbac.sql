-- ==============================================================================
-- Migración: Capa 1 — Identidad Organizacional y RBAC Pragmático
-- Proyecto: Portal Watts (Caramelos Watts S.R.L. - Canal Minorista)
-- Asignatura: INF-219 / INF-312 — UAGRM
-- Fuente: Diagrama de Clases watts.dbml y ADR-001
-- Tablas: sucursales, cargos, personas, asignaciones_laborales, roles, usuario_roles
-- ==============================================================================

-- 1. Función utilitaria para actualización automática de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABLA: sucursales
-- Sedes físicas operativas de la empresa (Santa Cruz, Interdepartamental)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sucursales (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_sucursal text NOT NULL,
    descripcion text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sucursales IS 'Sucursales operativas territoriales de Caramelos Watts.';

-- Nombre único sin distinguir mayúsculas: evita sucursales duplicadas ("Santa Cruz" / "santa cruz")
CREATE UNIQUE INDEX IF NOT EXISTS sucursales_nombre_sucursal_lower_key
    ON public.sucursales (lower(nombre_sucursal));

CREATE TRIGGER trg_sucursales_updated_at
    BEFORE UPDATE ON public.sucursales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- TABLA: cargos
-- Catálogo de posiciones laborales contractuales en la empresa
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cargos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_cargo text NOT NULL UNIQUE,
    descripcion text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cargos IS 'Catálogo de cargos laborales institucionales (Gerencia Comercial, Fiscalizador, Supervisor, Vendedor, Distribuidor).';

CREATE TRIGGER trg_cargos_updated_at
    BEFORE UPDATE ON public.cargos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- TABLA: personas
-- Entidad física única para todos los colaboradores (Party Pattern)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.personas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    ci text NOT NULL UNIQUE,
    nombres text NOT NULL,
    apellidos text NOT NULL,
    telefono text,
    email text,
    direccion text,
    fecha_baja timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.personas IS 'Colaboradores físicos. auth_user_id vincula a auth.users (JWT de Supabase). fecha_baja gestiona el borrado lógico institucional.';
COMMENT ON COLUMN public.personas.auth_user_id IS 'Identificador de cuenta digital en Supabase Auth. Nulo para colaboradores sin acceso web.';

CREATE TRIGGER trg_personas_updated_at
    BEFORE UPDATE ON public.personas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- TABLA: asignaciones_laborales
-- Historial contractual de la persona en un cargo y sucursal específica
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.asignaciones_laborales (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_persona bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    id_cargo bigint NOT NULL REFERENCES public.cargos(id) ON DELETE RESTRICT,
    id_sucursal bigint NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin date,
    estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_fechas_asignacion CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

COMMENT ON TABLE public.asignaciones_laborales IS 'Asignación contractual y vigencia laboral de una persona en un cargo y sucursal.';

-- Índice parcial de unicidad: Una persona solo puede tener un cargo activo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_activas_unicas_idx
    ON public.asignaciones_laborales (id_persona)
    WHERE (estado = 'activo');

CREATE INDEX IF NOT EXISTS asignaciones_laborales_id_sucursal_idx
    ON public.asignaciones_laborales (id_sucursal);

CREATE INDEX IF NOT EXISTS asignaciones_laborales_id_cargo_idx
    ON public.asignaciones_laborales (id_cargo);

CREATE TRIGGER trg_asignaciones_laborales_updated_at
    BEFORE UPDATE ON public.asignaciones_laborales
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- TABLA: roles
-- Catálogo de perfiles informáticos con permisos atómicos en formato recurso:accion
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo varchar(50) NOT NULL UNIQUE,
    nombre varchar(100) NOT NULL,
    descripcion text,
    permisos text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.roles IS 'Catálogo de roles RBAC con permisos atómicos tipados en formato recurso:accion (ADR-001).';

-- ==============================================================================
-- TABLA: usuario_roles
-- Asignación explícita de roles a personas con alcance territorial
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuario_roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_persona bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    id_rol bigint NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    alcance_tipo text NOT NULL DEFAULT 'SUCURSAL' CHECK (alcance_tipo IN ('GLOBAL', 'SUCURSAL')),
    id_sucursal bigint REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    -- Invariante de Dominio (ADR-001):
    -- Si es GLOBAL, no debe tener sucursal. Si es SUCURSAL, la sucursal es obligatoria.
    CONSTRAINT chk_usuario_roles_alcance_sucursal CHECK (
        (alcance_tipo = 'GLOBAL' AND id_sucursal IS NULL) OR
        (alcance_tipo = 'SUCURSAL' AND id_sucursal IS NOT NULL)
    )
);

COMMENT ON TABLE public.usuario_roles IS 'Asignación de roles de acceso a personas con delimitación de alcance territorial.';

-- Unicidad de rol por persona considerando sucursal o alcance global
CREATE UNIQUE INDEX IF NOT EXISTS unique_usuario_roles_global_idx
    ON public.usuario_roles (id_persona, id_rol)
    WHERE (id_sucursal IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS unique_usuario_roles_sucursal_idx
    ON public.usuario_roles (id_persona, id_rol, id_sucursal)
    WHERE (id_sucursal IS NOT NULL);

CREATE INDEX IF NOT EXISTS usuario_roles_id_persona_idx
    ON public.usuario_roles (id_persona);

CREATE INDEX IF NOT EXISTS usuario_roles_id_rol_idx
    ON public.usuario_roles (id_rol);

-- ==============================================================================
-- Privilegios mínimos para los roles de PostgREST (sin policies, ADR-001 §E)
-- Toda escritura pasa por las API Routes con service role; `authenticated` conserva
-- SELECT (perfil, roles y catálogos) y `anon` no accede a tablas. Las policies por
-- fila se definirán al estabilizar las reglas de negocio.
-- ==============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Las tablas creadas en migraciones posteriores nacen con los mismos privilegios
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM authenticated;

-- Funciones: por defecto cualquier rol puede ejecutarlas (incluida la clave pública, vía /rpc).
-- Aquí se revoca la ejecución de las funciones existentes y los permisos que Supabase concede por
-- esquema a anon y authenticated. El permiso global de PUBLIC sobre una función NUEVA no se quita con
-- ALTER DEFAULT PRIVILEGES: cada migración que cree una función debe hacer REVOKE EXECUTE ... FROM
-- PUBLIC, anon, authenticated, y la prueba supabase/tests/database/territorio.test.sql lo verifica
-- (ADR-002 §3). Solo el service role invoca funciones.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
