// ==============================================================================
// Barrel export de Tipos del Proyecto Portal Watts
// ==============================================================================

import { Database } from './database';

// Re-exportar el tipo global de la base de datos
export type { Database, Json } from './database';

import type { ReactElement, ReactNode } from 'react';
import type { NextPage } from 'next';
import type { AppProps } from 'next/app';

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
 * Entrada de rol activo (soporte multi-rol)
 */
export interface RolActivo {
  id_rol: number;
  codigo: string;
  nombre: string;
  permisos: string[];
  alcance_tipo: AlcanceTipo;
  id_sucursal: number | null;
}

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
  roles: RolActivo[];
}

// ------------------------------------------------------------------------------
// Tipos de Vista — CU-02 Gestión de Accesos
// ------------------------------------------------------------------------------

/**
 * Persona con asignación laboral activa pero sin cuenta de acceso digital
 */
export interface PersonaSinCuenta {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  cargo_nombre: string;
  sucursal_nombre: string;
  id_sucursal: number;
}

/**
 * Usuario con cuenta activa e información de sus roles asignados
 */
export interface UsuarioActivo {
  id_persona: number;
  ci: string;
  nombres: string;
  apellidos: string;
  auth_user_id: string;
  email: string | null;
  roles: RolActivo[];
  bloqueado?: boolean;
  bloqueo_mensaje?: string;
  es_permanente?: boolean;
}

// ------------------------------------------------------------------------------
// Tipos de Vista — CU-03 Gestión de Personal Comercial
// ------------------------------------------------------------------------------

export interface PersonaConAsignacion {
  id: number;
  ci: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  auth_user_id: string | null;
  fecha_baja: string | null;
  asignacion: {
    id: number;
    estado: string;
    fecha_inicio: string;
    cargo_id: number;
    cargo_nombre: string;
    sucursal_id: number;
    sucursal_nombre: string;
  } | null;
}

// ------------------------------------------------------------------------------
// Tipos de Layout Compartido (Pages Router - patrón getLayout)
// ------------------------------------------------------------------------------

/**
 * Página que puede declarar su propio layout vía `getLayout`.
 * Las páginas internas (dashboard, etc.) lo usan para envolverse en <AppLayout>;
 * /login no lo declara y se renderiza sola.
 */
export type PageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

export type AppPropsWithLayout = AppProps & {
  Component: PageWithLayout;
};

// 9. Catálogos maestros editables (sucursales y cargos) normalizados para la UI
export interface CatalogoItem {
  id: number;
  nombre: string;
  descripcion: string | null;
  /** Cantidad de registros que lo referencian; mayor a 0 impide eliminarlo */
  referencias: number;
  created_at: string;
}
