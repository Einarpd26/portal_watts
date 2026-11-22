// Reportes personalizados en Excel (ADR-005 D6): qué reportes hay y cómo viajan los filtros de la pantalla en la
// dirección de descarga. El servidor vuelve a aplicar esos filtros sobre lo que el usuario tiene a su alcance.
// Sin dependencias de Node ni del navegador.
import { esDia, type DiaKey } from './diasSemana.ts';
import type { ClaseAbc } from '@/types';
import type { FiltrosClientes } from './clientesMapa.ts';
import type { FiltrosCobertura, OrdenCobertura } from './coberturaRutas.ts';
import type { FiltrosConsulta } from './consultaPlanificacion.ts';

export const TIPOS_REPORTE = ['cobertura', 'planificacion', 'clientes', 'grilla'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const esTipoReporte = (valor: unknown): valor is TipoReporte => TIPOS_REPORTE.includes(valor as TipoReporte);

const CLASES: readonly ClaseAbc[] = ['A', 'B', 'C', 'I'];
const ORDENES: readonly OrdenCobertura[] = ['menor', 'mayor', 'codigo'];

type Query = Record<string, string | string[] | undefined>;

const unico = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const entero = (v: string | string[] | undefined): number | null => {
  const t = unico(v);
  return t !== undefined && /^\d+$/.test(t) ? Number(t) : null;
};

/** Parámetros de dirección a partir de los filtros; los que no están activos no se envían */
function aParametros(valores: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(valores)) if (valor !== null && valor !== undefined && valor !== '') p.set(clave, String(valor));
  return p.toString();
}

export const urlDeReporte = (tipo: TipoReporte, parametros: string) => `/api/reportes/${tipo}${parametros ? `?${parametros}` : ''}`;

// --- Cobertura -----------------------------------------------------------------------------------------------

export const parametrosDeCobertura = (f: FiltrosCobertura, orden: OrdenCobertura) =>
  aParametros({ sucursal: f.idSucursal, zona: f.idZona, supervisor: f.idSupervisor, ruta: f.idRuta, orden });

export function coberturaDesdeQuery(q: Query): { filtros: FiltrosCobertura; orden: OrdenCobertura } {
  const orden = unico(q.orden);
  return {
    filtros: { idSucursal: entero(q.sucursal), idZona: entero(q.zona), idSupervisor: entero(q.supervisor), idRuta: entero(q.ruta) },
    orden: ORDENES.find((o) => o === orden) ?? 'menor',
  };
}

// --- Planificación -------------------------------------------------------------------------------------------

export const parametrosDePlanificacion = (f: FiltrosConsulta) =>
  aParametros({ sucursal: f.idSucursal, zona: f.idZona, supervisor: f.idSupervisor, vendedor: f.idVendedor, ruta: f.idRuta, dia: f.dia });

export function planificacionDesdeQuery(q: Query): FiltrosConsulta {
  const dia = unico(q.dia);
  return {
    idSucursal: entero(q.sucursal),
    idZona: entero(q.zona),
    idSupervisor: entero(q.supervisor),
    idVendedor: entero(q.vendedor),
    idRuta: entero(q.ruta),
    dia: esDia(dia) ? (dia as DiaKey) : null,
  };
}

// --- Clientes ------------------------------------------------------------------------------------------------

export const parametrosDeClientes = (f: FiltrosClientes) =>
  aParametros({ sucursal: f.idSucursal, zona: f.idZona, ruta: f.idRuta, clases: CLASES.filter((c) => f.clases.has(c)).join(','), sinclase: f.sinClase ? 1 : 0, q: f.texto.trim() });

export function clientesDesdeQuery(q: Query): FiltrosClientes {
  const texto = unico(q.q) ?? '';
  const pedidas = (unico(q.clases) ?? CLASES.join(',')).split(',');
  return {
    idSucursal: entero(q.sucursal),
    idZona: entero(q.zona),
    idRuta: entero(q.ruta),
    clases: new Set(CLASES.filter((c) => pedidas.includes(c))),
    sinClase: unico(q.sinclase) !== '0',
    texto: texto.slice(0, 100),
  };
}

// --- Archivo -------------------------------------------------------------------------------------------------

const PREFIJO: Record<TipoReporte, string> = { cobertura: 'cobertura-rutas', planificacion: 'planificacion', clientes: 'clientes-abc', grilla: 'grilla-planificacion' };

/** «cobertura-rutas_2026-11-20.xlsx» */
export const nombreArchivoReporte = (tipo: TipoReporte, fecha: string) => `${PREFIJO[tipo]}_${fecha}.xlsx`;

export const TITULO_REPORTE: Record<TipoReporte, string> = {
  cobertura: 'Cobertura de rutas',
  planificacion: 'Planificación de rutas',
  clientes: 'Clientes clasificados (ABC por ruta)',
  grilla: 'Grilla de planificación del supervisor',
};
