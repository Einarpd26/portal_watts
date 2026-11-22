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
  /** Si se define, basta con tener uno de estos permisos (además de los requeridos). */
  anyPermissions?: string[];
  /** Si se define, además hace falta tener alguno de estos roles (la pantalla trabaja sobre el equipo propio del rol) */
  soloRoles?: string[];
  /** false = el módulo aún no tiene página: se muestra deshabilitado ("Próximamente"), nunca cae en 404. */
  available: boolean;
};

import { ROLES_DE_SUPERVISION } from "../../utils/clientesScope.ts";

// Grupo "Operación": trabajo diario en terreno.
export const OPERATION_GROUP_LABEL = "Operación";
export const OPERATION_GROUP: NavItem[] = [
  { label: "Mapa", href: "/mapa", requiredPermissions: ["mapa:consultar"], available: true },
  { label: "Planificación", href: "/planificacion", requiredPermissions: ["planificacion:asignar"], soloRoles: ["SUPERVISOR"], available: true },
  // Consulta de toda la planificación del alcance: es de supervisión (Gerencia y Fiscalizador); el Supervisor tiene la suya en Planificación
  { label: "Consulta", href: "/consulta-planificacion", requiredPermissions: ["mapa:consultar"], soloRoles: [...ROLES_DE_SUPERVISION], available: true },
];

// Grupo "Gestión": administración corporativa de la sucursal.
export const MANAGEMENT_GROUP_LABEL = "Gestión";
export const MANAGEMENT_GROUP: NavItem[] = [
  { label: "Personal", href: "/admin/personal", requiredPermissions: ["personal:gestionar"], available: true },
  { label: "Equipos", href: "/admin/equipos", requiredPermissions: ["personal:gestionar"], available: true },
  { label: "Accesos", href: "/admin/usuarios", requiredPermissions: ["cuentas:gestionar"], available: true },
  { label: "Bitácora", href: "/admin/bitacora", requiredPermissions: ["bitacora:consultar"], available: true },
  { label: "Catálogos", href: "/admin/catalogos", requiredPermissions: ["catalogos:gestionar"], available: true },
  {
    label: "Territorio",
    href: "/territorio",
    requiredPermissions: [],
    // Zonas (territorio:gestionar) o rutas (rutas:gestionar, el Supervisor): la página muestra solo lo que le corresponde
    anyPermissions: ["territorio:gestionar", "rutas:gestionar"],
    available: true,
  },
];

/** ¿La lista de permisos del usuario habilita este item? */
export function hasPermission(permisos: string[], item: NavItem, roles: string[] = []): boolean {
  const cumpleRequeridos = item.requiredPermissions.every((p) => permisos.includes(p));
  const cumpleAlguno = !item.anyPermissions || item.anyPermissions.some((p) => permisos.includes(p));
  const cumpleRol = !item.soloRoles || item.soloRoles.some((r) => roles.includes(r));
  return cumpleRequeridos && cumpleAlguno && cumpleRol;
}