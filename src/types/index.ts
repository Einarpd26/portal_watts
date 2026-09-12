// ==============================================================================
// Barrel export de Tipos del Proyecto Portal Watts
// ==============================================================================

import { Database } from './database';

// Re-exportar el tipo global de la base de datos
export type { Database, Json } from './database';

// ------------------------------------------------------------------------------
// Tipos de Dominio — Capa 1: Identidad Organizacional y RBAC
// ------------------------------------------------------------------------------

// 1. Sucursales
export type Sucursal = Database['public']['Tables']['sucursales']['Row'];
export type SucursalInsert = Database['public']['Tables']['sucursales']['Insert'];
export type SucursalUpdate = Database['public']['Tables']['sucursales']['Update'];

// 2. Cargos Laborales
export type Cargo = Database['public']['Tables']['cargos']['Row'];
export type CargoInsert = Database['public']['Tables']['cargos']['Insert'];
export type CargoUpdate = Database['public']['Tables']['cargos']['Update'];

// 3. Colaboradores (Personas)
export type Persona = Database['public']['Tables']['personas']['Row'];
export type PersonaInsert = Database['public']['Tables']['personas']['Insert'];
export type PersonaUpdate = Database['public']['Tables']['personas']['Update'];

// 4. Asignaciones Laborales (Historial de Contratos)
export type AsignacionLaboral = Database['public']['Tables']['asignaciones_laborales']['Row'];
export type AsignacionLaboralInsert = Database['public']['Tables']['asignaciones_laborales']['Insert'];
export type AsignacionLaboralUpdate = Database['public']['Tables']['asignaciones_laborales']['Update'];

// 5. Roles Informáticos (RBAC)
export type Rol = Database['public']['Tables']['roles']['Row'];
export type RolInsert = Database['public']['Tables']['roles']['Insert'];
export type RolUpdate = Database['public']['Tables']['roles']['Update'];

// 6. Asignación de Roles con Alcance Territorial
export type UsuarioRol = Database['public']['Tables']['usuario_roles']['Row'];
export type UsuarioRolInsert = Database['public']['Tables']['usuario_roles']['Insert'];
export type UsuarioRolUpdate = Database['public']['Tables']['usuario_roles']['Update'];

// ------------------------------------------------------------------------------
// Tipos Auxiliares y Contexto de Sesión (ADR-001)
// ------------------------------------------------------------------------------

export type AlcanceTipo = 'GLOBAL' | 'SUCURSAL';
export type EstadoLaboral = 'activo' | 'inactivo';

/**
 * Objeto de Sesión resuelto para el usuario autenticado
 */
export interface UserSession {
  id_persona: number;
  ci: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol_codigo: string;
  alcance_tipo: AlcanceTipo;
  id_sucursal: number | null;
  permisos: string[];
}
