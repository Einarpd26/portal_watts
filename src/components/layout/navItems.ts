// ==============================================================================
// Registro central de navegación del AppLayout (tokens-de-marca.md §5.3)
// ==============================================================================
//
// Decisión de diseño (Opción B): navegación de UN SOLO NIVEL agrupada por
// DOMINIO de negocio, no por rol. Los contenedores (Operación / Gestión) se
// llaman por módulo; los roles se reflejan filtrando los items por permisos
// atómicos (formato `recurso:accion`, ADR-001). Los permisos del seed viven en
// supabase/seed.sql (GERENCIA_COMERCIAL, FISCALIZADOR, SUPERVISOR, VENDEDOR).

export type NavItem = {
  label: string;
  href: string;
  /** Permisos atómicos requeridos (recurso:accion). Vacío = siempre visible. */
  requiredPermissions: string[];
  /** false = el módulo aún no tiene página: se muestra deshabilitado ("Próximamente"), nunca cae en 404. */
  available: boolean;
  /** Botón de acción pequeño que aparece junto al tab (ej. "Nuevo colaborador"). */
  action?: { label: string; href: string };
};

// Tab base: home de la zona privada. Visible para todo rol autenticado.
export const DASHBOARD_TAB: NavItem = {
  label: "Dashboard",
  href: "/dashboard",
  requiredPermissions: [],
  available: true,
};

// Grupo "Operación": trabajo diario en terreno.
export const OPERATION_GROUP_LABEL = "Operación";
export const OPERATION_GROUP: NavItem[] = [
  { label: "Mapa", href: "/mapa", requiredPermissions: ["mapa:consultar"], available: false },
  { label: "Planificación", href: "/planificacion", requiredPermissions: ["planificacion:asignar"], available: false },
];

// Grupo "Gestión": administración corporativa de la sucursal.
export const MANAGEMENT_GROUP_LABEL = "Gestión";
export const MANAGEMENT_GROUP: NavItem[] = [
  { label: "Personal", href: "/admin/personal", requiredPermissions: ["personal:gestionar"], available: true, action: { label: "Nuevo colaborador", href: "/admin/personal?new=1" } },
  { label: "Accesos", href: "/admin/usuarios", requiredPermissions: ["cuentas:gestionar"], available: true },
  { label: "Bitácora", href: "/admin/bitacora", requiredPermissions: ["bitacora:consultar"], available: true },
  { label: "Catálogos", href: "/admin/catalogos", requiredPermissions: ["catalogos:gestionar"], available: true },
  { label: "Territorio", href: "/territorio", requiredPermissions: ["territorio:gestionar"], available: false },
];

// Link de ayuda: siempre visible al final del nav (tokens-de-marca.md §5.3).
export const HELP_LINK: NavItem = {
  label: "Ayuda",
  href: "/ayuda",
  requiredPermissions: [],
  available: false,
};

/** ¿La lista de permisos del usuario habilita este item? */
export function hasPermission(permisos: string[], item: NavItem): boolean {
  return item.requiredPermissions.every((p) => permisos.includes(p));
}