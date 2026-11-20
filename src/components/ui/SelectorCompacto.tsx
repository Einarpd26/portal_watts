"use client";

export interface OpcionSelector {
  valor: string;
  texto: string;
}

interface SelectorCompactoProps {
  /** Nombre accesible: el selector no lleva rótulo visible, la opción vacía dice qué es */
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionSelector[];
}

/** Selector nativo de una línea, sin rótulo, para las barras de filtros de las pantallas con mapa */
export default function SelectorCompacto({ etiqueta, valor, onCambiar, opciones }: SelectorCompactoProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <select
        aria-label={etiqueta}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-primary-600"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </span>
    </div>
  );
}
