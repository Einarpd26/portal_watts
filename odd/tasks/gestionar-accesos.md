# ODD — Gestión de Accesos (CU-02)

**Objetivo:** Implementar el módulo de alta/revocación de accesos digitales para colaboradores (CU-02 del ADR-001).

**Problema:** No existe ninguna pantalla administrativa para que Gerencia Comercial o un Fiscalizador puedan otorgar credenciales de acceso a un colaborador registrado en `personas`.

**Por qué:** La Capa 1 (Identidad Organizacional y RBAC) no está completa sin el flujo de gestión de cuentas. Sin esto, los usuarios deben ser creados manualmente desde el panel de Supabase.

**Alcance autorizado:**
- Página `/admin/usuarios` con form "Dar Acceso" + tabla "Cuentas Activas"
- 4 API routes bajo `/api/admin/`
- Hook `useGestionUsuarios`
- Componentes de UI: Select, PersonaSearchSelect, NuevoAccesoForm, UsuariosTable, ConfirmAccesoModal, RevocarAccesoModal
- Utilidades: passwordPolicy, requireCallerAuth
- Actualizaciones: database.ts (isOneToOne), types/index.ts (UserSession), me.ts (multi-rol), proxy.ts (/admin guard)

**Constraints:**
- Prerequisito CU-02: persona debe tener `asignaciones_laborales` activa antes de recibir acceso
- Scope gate: FISCALIZADOR solo opera sobre personas de su sucursal
- Two-step con rollback: auth.users primero, luego personas + usuario_roles
- `email_confirm: true` — sin flujo de email, credenciales out-of-band
- Brand tokens: DM Sans, rojo Watts, bg-gray-50, cards blancas
- NO crear persona desde este formulario (eso es CU-03)

## Checklist

### Infraestructura
- [x] `supabase/migrations/20260930000000_usuario_roles_multiples_por_persona.sql` — nueva constraint UNIQUE(id_persona, id_rol, id_sucursal)
- [x] T01 — Actualizar `src/types/database.ts`: `isOneToOne: false` en `usuario_roles_id_persona_fkey`
- [x] T02 — Actualizar `src/types/index.ts`: UserSession con `roles[]`, tipos PersonaSinCuenta + ActiveUser
- [x] T03 — Actualizar `src/pages/api/auth/me.ts`: manejar `usuario_roles` como array
- [x] T04 — Actualizar `src/proxy.ts`: agregar `/admin` a rutas protegidas

### Utilidades
- [x] T05 — Crear `src/utils/passwordPolicy.ts`
- [x] T06 — Crear `src/utils/requireCallerAuth.ts`

### API Routes
- [x] T07 — Crear `src/pages/api/admin/personas-sin-cuenta.ts` (GET)
- [x] T08 — Crear `src/pages/api/admin/active-users.ts` (GET)
- [x] T09 — Crear `src/pages/api/admin/invite-user.ts` (POST)
- [x] T10 — Crear `src/pages/api/admin/revoke-user/[id].ts` (DELETE)

### Hook y componentes
- [x] T11 — Crear `src/hooks/useGestionUsuarios.ts`
- [x] T12 — Crear `src/components/ui/Select.tsx`
- [x] T13 — Crear `src/components/usuarios/NuevoAccesoForm.tsx`
- [x] T14 — Crear `src/components/usuarios/UsuariosTable.tsx`
- [x] T15 — Crear `src/components/usuarios/ConfirmAccesoModal.tsx`
- [x] T16 — Crear `src/components/usuarios/RevocarAccesoModal.tsx`
- [x] T17 — Crear `src/pages/admin/usuarios.tsx`

## Criterios de Aceptación
- GERENCIA_COMERCIAL puede dar acceso a cualquier persona activa
- FISCALIZADOR solo puede dar/revocar acceso dentro de su sucursal
- Crear cuenta sin asignación laboral activa devuelve error claro
- Email duplicado en auth.users devuelve error claro
- Rollback automático si falla la inserción en personas o usuario_roles
- La tabla "Cuentas Activas" muestra nombre, CI, rol y alcance
- Revocar elimina auth.users, pone auth_user_id = NULL y borra usuario_roles
