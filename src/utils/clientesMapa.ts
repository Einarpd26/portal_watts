// Lógica pura del mapa de clientes (CU-12, ADR-005): colores de cada clase del Pareto, filtros y conteos.
// Sin dependencias de Node ni del navegador.
import type { ClaseAbc, ClienteMapa } from '@/types';

/** Orden en que se muestran las clases en la leyenda y los filtros */
export const CLASES_ABC: readonly ClaseAbc[] = ['A', 'B', 'C', 'I'];

export const COLOR_CLASE: Record<ClaseAbc, string> = {
  A: '#16a34a', // green-600
  B: '#d97706', // amber-600
  C: '#dc2626', // red-600
  I: '#111827', // gray-900
};
export const COLOR_SIN_CLASE = '#9ca3af'; // gray-400: cliente no habilitado

export const DESCRIPCION_CLASE: Record<ClaseAbc, string> = {
  A: 'Hasta el 80 % de las ventas de su ruta',
  B: 'Hasta el 95 %',
  C: 'El resto',
  I: 'Sin compras en 6 meses',
};

export const colorDeCliente = (clase: ClaseAbc | null): string => (clase ? COLOR_CLASE[clase] : COLOR_SIN_CLASE);

export interface FiltrosClientes {
  /** Clases visibles; los clientes sin clase (no habilitados) se ocultan salvo que `sinClase` sea true */
  clases: ReadonlySet<ClaseAbc>;
  sinClase: boolean;
  /** Ruta elegida, o null para todas */
  idRuta: number | null;
  /** Texto libre sobre el código, el nombre, el nombre comercial y la dirección */
  texto: string;
}

export const FILTROS_INICIALES: FiltrosClientes = { clases: new Set(CLASES_ABC), sinClase: true, idRuta: null, texto: '' };

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filtrarClientes(clientes: readonly ClienteMapa[], filtros: FiltrosClientes): ClienteMapa[] {
  const texto = normalizar(filtros.texto);
  return clientes.filter((c) => {
    if (filtros.idRuta !== null && c.id_ruta !== filtros.idRuta) return false;
    if (c.clasificacion === null ? !filtros.sinClase : !filtros.clases.has(c.clasificacion)) return false;
    if (!texto) return true;
    return normalizar(`${c.codigo_cliente} ${c.nombre_completo} ${c.nombre_comercial ?? ''} ${c.direccion}`).includes(texto);
  });
}

export type ConteoPorClase = Record<ClaseAbc, number> & { sinClase: number };

/** Cantidad de clientes por clase, para la leyenda; no depende de los filtros de clase */
export function conteoPorClase(clientes: readonly ClienteMapa[]): ConteoPorClase {
  const conteo: ConteoPorClase = { A: 0, B: 0, C: 0, I: 0, sinClase: 0 };
  for (const c of clientes) {
    if (c.clasificacion === null) conteo.sinClase += 1;
    else conteo[c.clasificacion] += 1;
  }
  return conteo;
}

/** Los clientes sin ubicación no se pueden dibujar: se cuentan aparte para avisarlo */
export const tieneUbicacion = (c: Pick<ClienteMapa, 'latitud' | 'longitud'>): boolean => c.latitud !== null && c.longitud !== null;
