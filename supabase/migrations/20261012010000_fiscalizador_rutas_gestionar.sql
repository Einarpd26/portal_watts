-- ==============================================================================
-- Migración: el Fiscalizador gestiona rutas de su sucursal (CU-05 y CU-06)
-- CU-06 define al Fiscalizador como actor del traslado de rutas, pero solo Gerencia y Supervisor
-- poseían rutas:gestionar (ADR-002 D3), por lo que recibía 403. El permiso se le agrega; su
-- alcance sigue acotado a su sucursal (alcanceDeRutas) y Gerencia conserva todos los permisos,
-- como exige la regla de otorgamiento (ADR-001 §C).
-- El seed solo inserta roles nuevos (ON CONFLICT DO NOTHING): esta migración actualiza los
-- existentes. Las sesiones abiertas toman el permiso al volver a iniciar sesión.
-- ==============================================================================

UPDATE public.roles
SET permisos = array_append(permisos, 'rutas:gestionar')
WHERE codigo = 'FISCALIZADOR'
  AND NOT ('rutas:gestionar' = ANY(permisos));
