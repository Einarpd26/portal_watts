import type { ReactNode } from 'react';

/**
 * Lo que cada modo del mapa (Clientes, Cobertura) le entrega al contenedor común: los filtros, la lista, el resumen, la
 * ficha y el mapa ya armados, para que el contenedor solo los acomode en la estructura de escritorio o de celular.
 */
export interface PiezasDelModo {
  /** Selectores de la columna lateral (escritorio) */
  filtrosEscritorio: ReactNode;
  /** Selector principal de la barra superior (celular) */
  filtroBarraMovil: ReactNode;
  /** Nombre accesible del botón que pasa a la lista en el celular (p. ej. «Ver la lista de clientes») */
  etiquetaLista: string;
  lista: ReactNode;
  /** La lista del celular: lleva además los filtros que no caben en la barra superior */
  listaMovil: ReactNode;
  /** El resumen; en el celular recibe la descarga como acción, porque ahí no hay pie de columna */
  resumen: (accion?: ReactNode) => ReactNode;
  exportar: ReactNode;
  ficha: (variante: 'panel' | 'hoja') => ReactNode;
  hayElegido: boolean;
  mapa: ReactNode;
}
