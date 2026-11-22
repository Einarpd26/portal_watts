"use client";

import SearchSelect, { type OpcionSelector } from "./SearchSelect";

export type { OpcionSelector };

interface SelectorCompactoProps {
  /** Nombre accesible: el selector no lleva rótulo visible, la opción vacía o el placeholder dicen qué es */
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionSelector[];
  /** Con muchas opciones (rutas, vendedores): se puede escribir para filtrar */
  buscable?: boolean;
  /** Texto del control mientras no hay nada elegido (p. ej. «Todos los vendedores») */
  placeholder?: string;
  /** Botón «×» dentro del control para quitar la elección; en lugar de una opción «Todos» en la lista */
  limpiable?: boolean;
}

/** Selector de una línea, sin rótulo, para las barras de filtros de las pantallas con mapa */
export default function SelectorCompacto(props: SelectorCompactoProps) {
  return <SearchSelect {...props} />;
}
