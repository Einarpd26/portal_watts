// Presentación de la importación por lote (CU-16): colores, etiquetas y filtros de la lista.
// Sin dependencias de runtime: se prueba con node:test.
import type { EstadoRuta, FilaInforme } from './rutaInforme.ts';

/** Orden en que se muestran los estados: lo que requiere atención va último en la barra pero se filtra primero */
export const ESTADOS_ORDEN: EstadoRuta[] = ['nueva', 'actualizada', 'sin_cambios', 'rechazada'];

export const ETIQUETA_ESTADO: Record<EstadoRuta, string> = {
  nueva: 'Nuevas',
  actualizada: 'Actualizadas',
  sin_cambios: 'Sin cambios',
  rechazada: 'Rechazadas',
};

export const ETIQUETA_ESTADO_SINGULAR: Record<EstadoRuta, string> = {
  nueva: 'Nueva',
  actualizada: 'Actualizada',
  sin_cambios: 'Sin cambios',
  rechazada: 'Rechazada',
};

/** Color de cada estado en el mapa y la lista (hexadecimales: las capas de MapLibre no leen clases de Tailwind) */
export const COLOR_ESTADO: Record<EstadoRuta, string> = {
  nueva: '#16a34a', // green-600
  actualizada: '#2563eb', // blue-600
  sin_cambios: '#94a3b8', // slate-400
  rechazada: '#dc2626', // red-600
};

/** Color de una ruta del archivo cuando todavía no se pidió la vista previa */
export const COLOR_SIN_EVALUAR = '#f59e0b'; // amber-500

export type FiltroEstado = EstadoRuta | 'todas';

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filas del informe que cumplen el filtro de estado y la búsqueda por código de ruta o de zona */
export function filtrarFilas(filas: FilaInforme[], estado: FiltroEstado, busqueda: string): FilaInforme[] {
  const q = sinAcentos(busqueda.trim());
  return filas.filter((f) => {
    if (estado !== 'todas' && f.estado !== estado) return false;
    if (!q) return true;
    return sinAcentos(`${f.codigo_ruta ?? ''} ${f.codigo_zona ?? ''}`).includes(q);
  });
}

/** Estado de cada ruta del archivo por su posición (desde 0), para pintar el mapa */
export function estadoPorIndice(filas: FilaInforme[]): Map<number, EstadoRuta> {
  return new Map(filas.map((f) => [f.posicion - 1, f.estado]));
}

/** Tamaño legible para el aviso de un archivo demasiado grande */
export function tamanoLegible(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.ceil(bytes / 1024)} KB`;
}
