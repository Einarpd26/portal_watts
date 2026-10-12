-- Invariantes del catálogo de roles (ADR-001 §C). Ejecutar con: npx supabase test db
-- La regla de otorgamiento (puedeOtorgarAcceso) exige que quien otorga un rol posea todos sus
-- permisos. Si un permiso se agrega a un rol y no a Gerencia, Gerencia deja de poder otorgar ese rol.
BEGIN;
SELECT plan(4);

SELECT is(
  (SELECT count(*)::int
     FROM public.roles r
    WHERE r.codigo <> 'GERENCIA_COMERCIAL'
      AND NOT (r.permisos <@ (SELECT g.permisos FROM public.roles g WHERE g.codigo = 'GERENCIA_COMERCIAL'))),
  0,
  'GERENCIA_COMERCIAL posee todos los permisos de los demás roles (puede otorgar cualquier rol)'
);

SELECT ok(
  (SELECT permisos @> ARRAY['rutas:gestionar'] FROM public.roles WHERE codigo = 'SUPERVISOR'),
  'SUPERVISOR posee rutas:gestionar (ADR-002 D3)'
);

SELECT ok(
  (SELECT permisos @> ARRAY['rutas:gestionar'] FROM public.roles WHERE codigo = 'FISCALIZADOR'),
  'FISCALIZADOR posee rutas:gestionar (actor de CU-06; alcance por sucursal)'
);

SELECT ok(
  (SELECT NOT (permisos @> ARRAY['rutas:gestionar']) FROM public.roles WHERE codigo = 'VENDEDOR'),
  'VENDEDOR (solo lectura) no posee rutas:gestionar'
);

SELECT * FROM finish();
ROLLBACK;
