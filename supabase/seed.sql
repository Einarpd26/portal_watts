-- ==============================================================================
-- Datos Semilla (Seeds) para Desarrollo Local
-- Proyecto: Portal Watts — Caramelos Watts S.R.L.
-- Capa 1: Identidad Organizacional, Cargos, Colaboradores y RBAC
-- Fuente: ADR-001 (Arquitectura de Identidad, Autenticación y RBAC)
-- ==============================================================================

-- 1. SUCURSALES
INSERT INTO public.sucursales (nombre_sucursal, descripcion)
VALUES 
    ('Santa Cruz', 'Sucursal principal y centro operativo Santa Cruz'),
    ('Interdepartamental', 'Operaciones y cobertura comercial nacional')
ON CONFLICT DO NOTHING;

-- 2. CARGOS (Catálogo Institucional Laboral)
INSERT INTO public.cargos (nombre_cargo, descripcion)
VALUES 
    ('Gerencia Comercial', 'Dirección estratégica y gobierno comercial corporativo'),
    ('Fiscalizador', 'Administración operativa, control territorial y gestión de sede'),
    ('Supervisor', 'Planificación y seguimiento de zonas, rutas y vendedores'),
    ('Vendedor', 'Preventista de campo responsable de visitas a puntos de venta'),
    ('Distribuidor', 'Distribución, logística y entrega de pedidos a clientes')
ON CONFLICT (nombre_cargo) DO NOTHING;

-- 3. ROLES (Catálogo de Seguridad Informática con Permisos Atómicos - ADR-001)
INSERT INTO public.roles (codigo, nombre, descripcion, permisos)
VALUES 
    (
        'GERENCIA_COMERCIAL',
        'Gerencia Comercial',
        'Gobierno corporativo nacional con acceso irrestricto a todas las sedes y módulos',
        ARRAY[
            'cuentas:gestionar',
            'personal:gestionar',
            'territorio:gestionar',
            'planificacion:asignar',
            'mapa:consultar'
        ]
    ),
    (
        'FISCALIZADOR',
        'Fiscalizador de Sucursal',
        'Administración operativa local: gestión de colaboradores, cuentas y territorio de sucursal',
        ARRAY[
            'cuentas:gestionar',
            'personal:gestionar',
            'territorio:gestionar',
            'mapa:consultar'
        ]
    ),
    (
        'SUPERVISOR',
        'Supervisor Comercial',
        'Planificación semanal de itinerarios de visita y supervisión de rutas',
        ARRAY[
            'planificacion:asignar',
            'mapa:consultar'
        ]
    ),
    (
        'VENDEDOR',
        'Vendedor de Campo (Preventista)',
        'Consulta de itinerario asignado y visualización de mapa de clientes en calle',
        ARRAY[
            'mapa:consultar'
        ]
    )
ON CONFLICT (codigo) DO NOTHING;

-- 4. PERSONAS (Colaboradores de Prueba)
INSERT INTO public.personas (ci, nombres, apellidos, email, telefono, direccion)
VALUES 
    ('4892101', 'Einar', 'Padilla Delgadillo', 'gerencia@carameloswatts.com', '70011223', 'Av. San Martín #450'),
    ('5781290', 'Marco Antonio', 'Machaca Guarachi', 'fiscalizador.scz@carameloswatts.com', '71122334', 'Barrio Equipetrol Calle 8'),
    ('6394812', 'Daniel', 'Acosta Roca', 'supervisor.scz@carameloswatts.com', '72233445', 'Av. Banzer Km 5'),
    ('7483921', 'Alan William', 'Mendoza Paucara', 'vendedor.scz@carameloswatts.com', '73344556', 'Plan 3000 Curva de la Villa'),
    ('8594012', 'Carlos Angel', 'Tiquisara Huanca', 'distribuidor.scz@carameloswatts.com', '74455667', 'Av. Santos Dumont 4to Anillo')
ON CONFLICT (ci) DO NOTHING;

-- 5. ASIGNACIONES LABORALES (Historial y Cargo Vigente)
INSERT INTO public.asignaciones_laborales (id_persona, id_cargo, id_sucursal, fecha_inicio, estado)
SELECT 
    p.id,
    c.id,
    s.id,
    '2026-01-01'::date,
    'activo'
FROM public.personas p
CROSS JOIN public.cargos c
CROSS JOIN public.sucursales s
WHERE 
    (p.ci = '4892101' AND c.nombre_cargo = 'Gerencia Comercial' AND s.nombre_sucursal = 'Santa Cruz')
    OR (p.ci = '5781290' AND c.nombre_cargo = 'Fiscalizador' AND s.nombre_sucursal = 'Santa Cruz')
    OR (p.ci = '6394812' AND c.nombre_cargo = 'Supervisor' AND s.nombre_sucursal = 'Santa Cruz')
    OR (p.ci = '7483921' AND c.nombre_cargo = 'Vendedor' AND s.nombre_sucursal = 'Santa Cruz')
    OR (p.ci = '8594012' AND c.nombre_cargo = 'Distribuidor' AND s.nombre_sucursal = 'Santa Cruz')
ON CONFLICT DO NOTHING;

-- 6. USUARIO_ROLES (Privilegios Informáticos y Alcance Territorial - ADR-001)
-- A. Gerencia Comercial: Alcance GLOBAL (id_sucursal debe ser NULL por restricción de dominio)
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT 
    p.id,
    r.id,
    'GLOBAL',
    NULL
FROM public.personas p, public.roles r
WHERE p.ci = '4892101' AND r.codigo = 'GERENCIA_COMERCIAL'
ON CONFLICT DO NOTHING;

-- B. Fiscalizador: Alcance SUCURSAL (id_sucursal obligatoria)
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT 
    p.id,
    r.id,
    'SUCURSAL',
    s.id
FROM public.personas p, public.roles r, public.sucursales s
WHERE p.ci = '5781290' AND r.codigo = 'FISCALIZADOR' AND s.nombre_sucursal = 'Santa Cruz'
ON CONFLICT DO NOTHING;

-- C. Supervisor: Alcance SUCURSAL
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT 
    p.id,
    r.id,
    'SUCURSAL',
    s.id
FROM public.personas p, public.roles r, public.sucursales s
WHERE p.ci = '6394812' AND r.codigo = 'SUPERVISOR' AND s.nombre_sucursal = 'Santa Cruz'
ON CONFLICT DO NOTHING;

-- D. Vendedor: Alcance SUCURSAL
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT 
    p.id,
    r.id,
    'SUCURSAL',
    s.id
FROM public.personas p, public.roles r, public.sucursales s
WHERE p.ci = '7483921' AND r.codigo = 'VENDEDOR' AND s.nombre_sucursal = 'Santa Cruz'
ON CONFLICT DO NOTHING;

-- Nota: El Distribuidor (CI: 8594012) intencionalmente NO tiene registro en usuario_roles,
-- validando la regla de negocio de que tiene empleo activo pero no cuenta ni rol de acceso digital.

-- ------------------------------------------------------------------------------
-- 7. USUARIOS DE AUTENTICACIÓN (Supabase Auth - Credenciales para Desarrollo Local)
-- ------------------------------------------------------------------------------
-- Inserta credenciales en auth.users y auth.identities para los 4 roles activos.
-- Contraseña estándar para todos: Password123!

DO $$
DECLARE
    pwd_hash text := extensions.crypt('Password123!', extensions.gen_salt('bf'));
    
    u_gerencia uuid := '00000000-0000-0000-0000-000000000001';
    u_fiscalizador uuid := '00000000-0000-0000-0000-000000000002';
    u_supervisor uuid := '00000000-0000-0000-0000-000000000003';
    u_vendedor uuid := '00000000-0000-0000-0000-000000000004';
BEGIN
    -- A. Insertar usuarios en auth.users
    -- OJO: las columnas de tokens/cambios (confirmation_token, recovery_token,
    -- email_change, *_token_*) deben ir con '' y NUNCA NULL: GoTrue las escanea
    -- como string no-nulo y un NULL provoca HTTP 500
    -- ("converting NULL to string is unsupported") al intentar iniciar sesión.
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change_token,
        phone_change,
        reauthentication_token
    )
    VALUES
        (u_gerencia, '00000000-0000-0000-0000-000000000000', 'gerencia@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', ''),
        (u_fiscalizador, '00000000-0000-0000-0000-000000000000', 'fiscalizador.scz@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', ''),
        (u_supervisor, '00000000-0000-0000-0000-000000000000', 'supervisor.scz@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', ''),
        (u_vendedor, '00000000-0000-0000-0000-000000000000', 'vendedor.scz@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', '')
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at;

    -- B. Insertar identidades en auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES
        (gen_random_uuid(), u_gerencia, jsonb_build_object('sub', u_gerencia::text, 'email', 'gerencia@carameloswatts.com'), 'email', u_gerencia::text, now(), now(), now()),
        (gen_random_uuid(), u_fiscalizador, jsonb_build_object('sub', u_fiscalizador::text, 'email', 'fiscalizador.scz@carameloswatts.com'), 'email', u_fiscalizador::text, now(), now(), now()),
        (gen_random_uuid(), u_supervisor, jsonb_build_object('sub', u_supervisor::text, 'email', 'supervisor.scz@carameloswatts.com'), 'email', u_supervisor::text, now(), now(), now()),
        (gen_random_uuid(), u_vendedor, jsonb_build_object('sub', u_vendedor::text, 'email', 'vendedor.scz@carameloswatts.com'), 'email', u_vendedor::text, now(), now(), now())
    ON CONFLICT (provider_id, provider) DO NOTHING;

    -- C. Vincular auth_user_id en la tabla public.personas
    UPDATE public.personas SET auth_user_id = u_gerencia WHERE ci = '4892101';
    UPDATE public.personas SET auth_user_id = u_fiscalizador WHERE ci = '5781290';
    UPDATE public.personas SET auth_user_id = u_supervisor WHERE ci = '6394812';
    UPDATE public.personas SET auth_user_id = u_vendedor WHERE ci = '7483921';
END $$;

