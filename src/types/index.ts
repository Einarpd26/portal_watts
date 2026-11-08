// ==============================================================================
// Barrel export de Tipos del Proyecto Portal Watts
// ==============================================================================

import type { DiaKey } from '@/utils/diasSemana';
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

// 10. Territorio: zonas comerciales y su supervisor (CU-04, CU-07)
export interface SupervisorDeZona {
  id_persona: number;
  nombre: string;
}

export interface ZonaItem {
  id: number;
  codigo_zona: string;
  zona: string;
  descripcion_zona: string | null;
  canal_venta: string | null;
  id_sucursal: number;
  sucursal_nombre: string;
  supervisor: SupervisorDeZona | null;
  /** Cantidad de rutas de la zona; mayor a 0 impide eliminarla */
  total_rutas: number;
}

/** Colaborador con rol de acceso Supervisor en una sucursal: candidato a supervisar zonas */
export interface SupervisorCandidato {
  id_persona: number;
  nombre: string;
  id_sucursal: number;
}

// 10b. Equipos de supervisor (CU-08, ADR-003)
export interface VendedorDeEquipo {
  id_persona: number;
  nombre: string;
  id_sucursal: number;
  /** Si ocupa un slot de planificación del equipo */
  tiene_slot: boolean;
}

export interface EquipoSupervisor {
  id_persona: number;
  nombre: string;
  id_sucursal: number;
  sucursal_nombre: string;
  /** false: se le revocó el acceso o tiene baja; su equipo espera un reemplazo (ADR-003 D6) */
  activo: boolean;
  vendedores: VendedorDeEquipo[];
  /** Cantidad de slots (con o sin vendedor) que conserva a su nombre */
  total_slots: number;
}

export interface VendedorSinEquipo {
  id_persona: number;
  nombre: string;
  id_sucursal: number;
  sucursal_nombre: string;
}

/** Zona sin supervisor responsable: se asigna desde la pantalla de equipos (CU-07) */
export interface ZonaSinSupervisor {
  id: number;
  codigo_zona: string;
  zona: string;
  id_sucursal: number;
  sucursal_nombre: string;
  total_rutas: number;
}

export interface EquiposListado {
  equipos: EquipoSupervisor[];
  sin_supervisor: VendedorSinEquipo[];
  zonas_sin_supervisor: ZonaSinSupervisor[];
  /** Opera con alcance global: ve todas las sucursales */
  alcance_global: boolean;
}

// 10c. Slots de planificación del supervisor (CU-08)
export interface SlotItem {
  id: number;
  nombre: string | null;
  orden: number;
  id_vendedor: number | null;
  vendedor_nombre: string | null;
}

export interface VendedorDisponible {
  id_persona: number;
  nombre: string;
}

export type Frecuencia = 'semanal' | 'impar' | 'par' | 'eventual';

/** Ruta planificada en un slot, un día de la semana y con una frecuencia (CU-09) */
export interface VisitaPlanificada {
  id: number;
  id_slot: number;
  id_ruta: number;
  codigo_ruta: string;
  ruta: string;
  dia: DiaKey;
  frecuencia: Frecuencia;
}

/** Ruta de una zona que el supervisor supervisa: se puede planificar en sus slots */
export interface RutaPlanificable {
  id: number;
  codigo_ruta: string;
  ruta: string;
  codigo_zona: string;
}

export interface SlotsListado {
  slots: SlotItem[];
  /** Visitas de sus slots, solo de rutas de las zonas que hoy supervisa (las demás se ocultan) */
  visitas: VisitaPlanificada[];
  /** Rutas de sus zonas, para elegir al planificar */
  rutas: RutaPlanificable[];
  /** Vendedores del equipo que todavía no ocupan ningún slot */
  disponibles: VendedorDisponible[];
  /** false: quien consulta no es un supervisor (p. ej. Gerencia), así que no tiene equipo propio */
  es_supervisor: boolean;
}

/**
 * Planificación de un supervisor para consultarla en solo lectura (Fiscalizador y Gerencia, ADR-003 D10).
 * Incluye toda la planificación guardada, también la de rutas que ya no son de sus zonas.
 */
export interface PlanificacionDeSupervisor {
  supervisor: { id_persona: number; nombre: string; sucursal_nombre: string; activo: boolean };
  slots: SlotItem[];
  visitas: VisitaPlanificada[];
}

// 11. Rutas comerciales (CU-05)
export interface PoligonoRuta {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface RutaItem {
  id: number;
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string | null;
  id_zona: number;
  /** Polígono simplificado para el mapa (~1 m) */
  geojson: PoligonoRuta;
}

/** Zona en la que el solicitante puede operar rutas */
export interface ZonaDeRuta {
  id: number;
  codigo_zona: string;
  zona: string;
  id_sucursal: number;
  sucursal_nombre: string;
}

export interface MultiPoligonoGeoJson {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

/** Contorno de una zona: unión de los polígonos de sus rutas (ADR-002 D6). No se guarda ni se edita. */
export interface ContornoZona {
  id_zona: number;
  geojson: PoligonoRuta | MultiPoligonoGeoJson;
}

/** Ruta con su polígono completo, tal como se exporta para el respaldo */
export interface RutaExportable {
  id: number;
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string | null;
  id_zona: number;
  codigo_zona: string;
  zona: string;
  geojson: PoligonoRuta;
}

/** Ruta existente con la que se superpone la propuesta (A1). Fuera de alcance no se detalla. */
export interface ConflictoRuta {
  /**
   * `superposicion`: el polígono pisa la ruta (RN-01). `invasion`: la envolvente de la zona la cubriría
   * (ADR-002 D7). `cobertura`: el polígono caería dentro de la envolvente de otra zona; `codigo_zona` es
   * esa zona, `geojson` su envolvente y no hay ruta
   */
  tipo: 'superposicion' | 'invasion' | 'cobertura';
  id: number | null;
  codigo_ruta: string | null;
  /** Zona de la ruta en conflicto */
  codigo_zona: string | null;
  area_m2: number;
  geojson: PoligonoRuta | null;
  fuera_de_alcance: boolean;
  /** Una invasión se resuelve trasladando la ruta a la zona que crece (misma sucursal y en el alcance); una cobertura no */
  trasladable: boolean;
}

export type ErrorGeometriaRuta = 'geojson_invalido' | 'no_poligono' | 'geometria_invalida' | 'superposicion';

export type RutaEvaluacion =
  | { ok: true; geojson: PoligonoRuta; vertices: number; area_m2: number; conflictos: ConflictoRuta[] }
  | { ok: false; error: ErrorGeometriaRuta; detalle?: string; conflictos?: ConflictoRuta[] };
