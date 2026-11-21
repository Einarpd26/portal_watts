"use client";

import { cn } from "@/utils/cn";

interface OpcionSegmentada<T extends string> {
  valor: T;
  texto: string;
}

interface ControlSegmentadoProps<T extends string> {
  /** Nombre accesible del grupo */
  etiqueta: string;
  valor: T;
  opciones: readonly OpcionSegmentada<T>[];
  onCambiar: (valor: T) => void;
}

/** Botones pegados para elegir una opción entre pocas (Todos | Con cuenta | Sin cuenta) */
export default function ControlSegmentado<T extends string>({ etiqueta, valor, opciones, onCambiar }: ControlSegmentadoProps<T>) {
  return (
    <div role="group" aria-label={etiqueta} className="flex shrink-0 divide-x divide-gray-200 overflow-hidden rounded-lg border border-gray-200">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onCambiar(o.valor)}
          className={cn(
            "whitespace-nowrap px-3 py-2 text-xs font-semibold transition-colors",
            valor === o.valor ? "bg-primary-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
          )}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
