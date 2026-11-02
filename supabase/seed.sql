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
            'mapa:consultar',
            'bitacora:consultar',
            'catalogos:gestionar',
            'rutas:gestionar'
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
            'mapa:consultar',
            'bitacora:consultar',
            'rutas:gestionar'
        ]
    ),
    (
        'SUPERVISOR',
        'Supervisor Comercial',
        'Planificación semanal de itinerarios de visita y supervisión de rutas',
        ARRAY[
            'planificacion:asignar',
            'mapa:consultar',
            'rutas:gestionar'
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

-- ------------------------------------------------------------------------------
-- 8. TERRITORIO (Módulo 2): personal de la sucursal 2, zonas, supervisores y rutas
-- ------------------------------------------------------------------------------
-- Personal de Interdepartamental: permite probar el alcance por sucursal (un fiscalizador
-- de Santa Cruz no debe administrar a estas personas, y viceversa). Misma contraseña estándar.
INSERT INTO public.personas (ci, nombres, apellidos, email, telefono, direccion)
VALUES
    ('5900101', 'Lucía', 'Rojas Vaca', 'fiscalizador.int@carameloswatts.com', '75566778', 'Av. Heroínas #300, Cochabamba'),
    ('5900102', 'Pedro', 'Salvatierra Mamani', 'supervisor.int@carameloswatts.com', '76677889', 'Av. Ayacucho #120, Cochabamba')
ON CONFLICT (ci) DO NOTHING;

INSERT INTO public.asignaciones_laborales (id_persona, id_cargo, id_sucursal, fecha_inicio, estado)
SELECT p.id, c.id, s.id, '2026-01-01'::date, 'activo'
FROM public.personas p
CROSS JOIN public.cargos c
CROSS JOIN public.sucursales s
WHERE s.nombre_sucursal = 'Interdepartamental'
  AND (   (p.ci = '5900101' AND c.nombre_cargo = 'Fiscalizador')
       OR (p.ci = '5900102' AND c.nombre_cargo = 'Supervisor'))
ON CONFLICT DO NOTHING;

INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT p.id, r.id, 'SUCURSAL', s.id
FROM public.personas p, public.roles r, public.sucursales s
WHERE s.nombre_sucursal = 'Interdepartamental'
  AND (   (p.ci = '5900101' AND r.codigo = 'FISCALIZADOR')
       OR (p.ci = '5900102' AND r.codigo = 'SUPERVISOR'))
ON CONFLICT DO NOTHING;

DO $$
DECLARE
    pwd_hash text := extensions.crypt('Password123!', extensions.gen_salt('bf'));
    u_fiscalizador_int uuid := '00000000-0000-0000-0000-000000000005';
    u_supervisor_int uuid := '00000000-0000-0000-0000-000000000006';
BEGIN
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change_token, phone_change, reauthentication_token
    )
    VALUES
        (u_fiscalizador_int, '00000000-0000-0000-0000-000000000000', 'fiscalizador.int@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', ''),
        (u_supervisor_int, '00000000-0000-0000-0000-000000000000', 'supervisor.int@carameloswatts.com', pwd_hash, now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', 'authenticated', 'authenticated', now(), now(), '', '', '', '', '', '', '', '')
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = EXCLUDED.email_confirmed_at;

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES
        (gen_random_uuid(), u_fiscalizador_int, jsonb_build_object('sub', u_fiscalizador_int::text, 'email', 'fiscalizador.int@carameloswatts.com'), 'email', u_fiscalizador_int::text, now(), now(), now()),
        (gen_random_uuid(), u_supervisor_int, jsonb_build_object('sub', u_supervisor_int::text, 'email', 'supervisor.int@carameloswatts.com'), 'email', u_supervisor_int::text, now(), now(), now())
    ON CONFLICT (provider_id, provider) DO NOTHING;

    UPDATE public.personas SET auth_user_id = u_fiscalizador_int WHERE ci = '5900101';
    UPDATE public.personas SET auth_user_id = u_supervisor_int WHERE ci = '5900102';
END $$;

-- Zonas. ZC (Santa Cruz) queda sin supervisor a propósito, para probar CU-07.
INSERT INTO public.zonas (codigo_zona, zona, descripcion_zona, canal_venta, id_sucursal)
SELECT z.codigo, z.nombre, z.descripcion, 'Minorista', s.id
FROM (VALUES
    ('ZN', 'Zona Norte',     'Norte de Santa Cruz de la Sierra',                    'Santa Cruz'),
    ('ZS', 'Zona Sur',       'Sur de Santa Cruz de la Sierra',                      'Santa Cruz'),
    ('ZC', 'Zona Centro',    'Centro de Santa Cruz (sin supervisor, prueba de CU-07)', 'Santa Cruz'),
    ('ZO', 'Zona Occidental', 'Cobertura de Cochabamba',                            'Interdepartamental')
) AS z(codigo, nombre, descripcion, sucursal)
JOIN public.sucursales s ON s.nombre_sucursal = z.sucursal
ON CONFLICT (codigo_zona, id_sucursal) DO NOTHING;

-- Supervisor de zona: Daniel Acosta (Santa Cruz) tiene ZN y ZS; Pedro Salvatierra tiene ZO.
INSERT INTO public.supervisor_zonas (id_supervisor, id_zona)
SELECT p.id, z.id
FROM public.personas p
JOIN public.zonas z ON (p.ci = '6394812' AND z.codigo_zona IN ('ZN', 'ZS'))
                    OR (p.ci = '5900102' AND z.codigo_zona = 'ZO')
ON CONFLICT (id_zona) DO NOTHING;

-- Rutas: cuadrícula contigua de ~1,1 km sobre Santa Cruz (fila norte -> ZN, fila sur -> ZS)
-- y dos rutas contiguas sobre Cochabamba (ZO). Comparten bordes: la regla de no
-- superposición (interiores) las acepta.
INSERT INTO public.rutas (codigo_ruta, ruta, descripcion_ruta, localizacion, id_zona)
SELECT r.codigo, r.nombre, r.descripcion,
       extensions.ST_MakeEnvelope(r.x0, r.y0, r.x0 + 0.01, r.y0 + 0.01, 4326),
       z.id
FROM (VALUES
    ('R-N1', 'Ruta Norte 1', 'Sector norte, primera cuadra', -63.20, -17.79, 'ZN', 'Santa Cruz'),
    ('R-N2', 'Ruta Norte 2', 'Sector norte, segunda cuadra', -63.19, -17.79, 'ZN', 'Santa Cruz'),
    ('R-N3', 'Ruta Norte 3', 'Sector norte, tercera cuadra', -63.18, -17.79, 'ZN', 'Santa Cruz'),
    ('R-N4', 'Ruta Norte 4', 'Sector norte, cuarta cuadra',  -63.17, -17.79, 'ZN', 'Santa Cruz'),
    ('R-S1', 'Ruta Sur 1',   'Sector sur, primera cuadra',    -63.20, -17.80, 'ZS', 'Santa Cruz'),
    ('R-S2', 'Ruta Sur 2',   'Sector sur, segunda cuadra',    -63.19, -17.80, 'ZS', 'Santa Cruz'),
    ('R-S3', 'Ruta Sur 3',   'Sector sur, tercera cuadra',    -63.18, -17.80, 'ZS', 'Santa Cruz'),
    ('R-S4', 'Ruta Sur 4',   'Sector sur, cuarta cuadra',     -63.17, -17.80, 'ZS', 'Santa Cruz'),
    ('R-O1', 'Ruta Occidental 1', 'Cochabamba, sector 1',     -66.17, -17.40, 'ZO', 'Interdepartamental'),
    ('R-O2', 'Ruta Occidental 2', 'Cochabamba, sector 2',     -66.16, -17.40, 'ZO', 'Interdepartamental')
) AS r(codigo, nombre, descripcion, x0, y0, zona, sucursal)
JOIN public.sucursales s ON s.nombre_sucursal = r.sucursal
JOIN public.zonas z ON z.codigo_zona = r.zona AND z.id_sucursal = s.id
ON CONFLICT (codigo_ruta) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. EQUIPOS DE SUPERVISOR Y SLOTS (Módulo 3, CU-08, ADR-003)
-- ------------------------------------------------------------------------------
-- Escenarios para probar /admin/equipos con el Fiscalizador de Santa Cruz y con Gerencia:
--   · Daniel Acosta (supervisor activo): 2 vendedores y 3 slots (uno vacío).
--   · Rosa Vargas (supervisora activa, sin equipo): destino típico de «Reemplazar supervisor».
--   · Jorge Salvatierra (supervisor retirado: sin rol y con baja): conserva 2 vendedores y 3 slots.
--   · Elena Gutiérrez y Ramiro Choque (Santa Cruz) y Sergio Egüez (Interdepartamental): sin supervisor.
-- El Fiscalizador de Santa Cruz no debe ver a Sergio (otra sucursal); Gerencia sí.
INSERT INTO public.personas (ci, nombres, apellidos, telefono, fecha_baja)
VALUES
    ('6394813', 'Rosa Elena', 'Vargas Soliz', '72233446', NULL),
    ('6394814', 'Jorge Luis', 'Salvatierra Peña', '72233447', '2026-10-15T00:00:00-04:00'),
    ('7483922', 'Pedro Pablo', 'Rojas Cuéllar', '73344557', NULL),
    ('7483923', 'Lucía Fernanda', 'Mamani Quispe', '73344558', NULL),
    ('7483924', 'Mario Iván', 'Cuéllar Soria', '73344559', NULL),
    ('7483925', 'Elena Beatriz', 'Gutiérrez Pinto', '73344560', NULL),
    ('7483926', 'Ramiro', 'Choque Vaca', '73344561', NULL),
    ('7483927', 'Sergio Andrés', 'Egüez Lijerón', '73344562', NULL)
ON CONFLICT (ci) DO NOTHING;

-- Asignaciones laborales: Jorge figura con su asignación cerrada (inactivo), como tras una baja
INSERT INTO public.asignaciones_laborales (id_persona, id_cargo, id_sucursal, fecha_inicio, fecha_fin, estado)
SELECT p.id, c.id, s.id, '2026-01-01'::date, a.fecha_fin, a.estado
FROM (VALUES
    ('6394813', 'Supervisor', 'Santa Cruz', NULL::date, 'activo'),
    ('6394814', 'Supervisor', 'Santa Cruz', '2026-10-15'::date, 'inactivo'),
    ('7483922', 'Vendedor', 'Santa Cruz', NULL::date, 'activo'),
    ('7483923', 'Vendedor', 'Santa Cruz', NULL::date, 'activo'),
    ('7483924', 'Vendedor', 'Santa Cruz', NULL::date, 'activo'),
    ('7483925', 'Vendedor', 'Santa Cruz', NULL::date, 'activo'),
    ('7483926', 'Vendedor', 'Santa Cruz', NULL::date, 'activo'),
    ('7483927', 'Vendedor', 'Interdepartamental', NULL::date, 'activo')
) AS a(ci, cargo, sucursal, fecha_fin, estado)
JOIN public.personas p ON p.ci = a.ci
JOIN public.cargos c ON c.nombre_cargo = a.cargo
JOIN public.sucursales s ON s.nombre_sucursal = a.sucursal
WHERE NOT EXISTS (
    SELECT 1 FROM public.asignaciones_laborales al
    WHERE al.id_persona = p.id AND al.id_cargo = c.id AND al.id_sucursal = s.id
);

-- Rol de acceso: solo la supervisora activa. Jorge ya no tiene acceso (fue revocado al retirarse).
INSERT INTO public.usuario_roles (id_persona, id_rol, alcance_tipo, id_sucursal)
SELECT p.id, r.id, 'SUCURSAL', s.id
FROM public.personas p, public.roles r, public.sucursales s
WHERE p.ci = '6394813' AND r.codigo = 'SUPERVISOR' AND s.nombre_sucursal = 'Santa Cruz'
ON CONFLICT DO NOTHING;

-- Equipos: los vendedores de Daniel Acosta (activo) y de Jorge Salvatierra (retirado)
INSERT INTO public.supervisor_vendedores (id_supervisor, id_vendedor)
SELECT s.id, v.id
FROM (VALUES
    ('6394812', '7483921'),
    ('6394812', '7483922'),
    ('6394814', '7483923'),
    ('6394814', '7483924')
) AS e(ci_supervisor, ci_vendedor)
JOIN public.personas s ON s.ci = e.ci_supervisor
JOIN public.personas v ON v.ci = e.ci_vendedor
ON CONFLICT (id_vendedor) DO NOTHING;

-- Slots: cada supervisor con sus vendedores y un slot vacío
INSERT INTO public.vendedor_slots (nombre, orden, id_supervisor, id_vendedor)
SELECT sl.nombre, sl.orden, s.id, v.id
FROM (VALUES
    ('Slot 1', 0, '6394812', '7483921'),
    ('Slot 2', 1, '6394812', '7483922'),
    ('Slot 3', 2, '6394812', NULL),
    ('Slot 1', 0, '6394814', '7483923'),
    ('Slot 2', 1, '6394814', '7483924'),
    ('Slot 3', 2, '6394814', NULL)
) AS sl(nombre, orden, ci_supervisor, ci_vendedor)
JOIN public.personas s ON s.ci = sl.ci_supervisor
LEFT JOIN public.personas v ON v.ci = sl.ci_vendedor
WHERE NOT EXISTS (
    SELECT 1 FROM public.vendedor_slots x WHERE x.id_supervisor = s.id AND x.nombre = sl.nombre
);

-- ------------------------------------------------------------------------------
-- 10. PLANIFICACIÓN DE RUTAS POR DÍA (Módulo 3, CU-09, RN-04 y RN-05)
-- ------------------------------------------------------------------------------
-- Escenarios para probar la grilla de /planificacion con Daniel Acosta (zonas ZN y ZS):
--   · R-N1: semanal el lunes (Slot 1) y el jueves (Slot 2)  -> marcada «Duplicada».
--   · R-N2: impar el martes (Slot 1) y par el martes (Slot 2) -> par quincenal, NO se marca.
--   · R-N3: semanal el miércoles (Slot 1) y eventual el viernes (Slot 2) -> la eventual no cuenta, NO se marca.
--   · R-S1 (lunes, Slot 2) y R-S2 (sábado, Slot 1): una sola visita, sin marca.
--   · R-N4, R-S3 y R-S4 quedan SIN planificar: aparecen arriba en el selector de rutas.
-- Jorge Salvatierra (supervisor retirado) conserva planificación sobre rutas de ZN y ZS, que hoy supervisa
-- Daniel: al reemplazarlo por Rosa Vargas esas visitas quedan ocultas para ella (ADR-003 D9), porque no son
-- de sus zonas. Se insertan directo porque la función de planificación no lo permitiría hoy (RN-05).
INSERT INTO public.planificacion_rutas (id_vendedor_slot, id_ruta, dia_semana, frecuencia)
SELECT sl.id, r.id, v.dia, v.frecuencia
FROM (VALUES
    ('6394812', 'Slot 1', 'R-N1', 'LU', 'semanal'),
    ('6394812', 'Slot 2', 'R-N1', 'JU', 'semanal'),
    ('6394812', 'Slot 1', 'R-N2', 'MA', 'impar'),
    ('6394812', 'Slot 2', 'R-N2', 'MA', 'par'),
    ('6394812', 'Slot 1', 'R-N3', 'MI', 'semanal'),
    ('6394812', 'Slot 2', 'R-N3', 'VI', 'eventual'),
    ('6394812', 'Slot 2', 'R-S1', 'LU', 'semanal'),
    ('6394812', 'Slot 1', 'R-S2', 'SA', 'semanal'),
    ('6394814', 'Slot 1', 'R-S3', 'LU', 'semanal'),
    ('6394814', 'Slot 1', 'R-S4', 'MA', 'impar'),
    ('6394814', 'Slot 2', 'R-N4', 'JU', 'semanal')
) AS v(ci_supervisor, slot, codigo_ruta, dia, frecuencia)
JOIN public.personas p ON p.ci = v.ci_supervisor
JOIN public.vendedor_slots sl ON sl.id_supervisor = p.id AND sl.nombre = v.slot
JOIN public.rutas r ON r.codigo_ruta = v.codigo_ruta
ON CONFLICT ON CONSTRAINT unique_planificacion_ruta DO NOTHING;
