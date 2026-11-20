"use client";

import type { ReactNode } from 'react';

interface DatoProps {
  etiqueta: string;
  children: ReactNode;
}

/** Una fila «etiqueta: valor» de las fichas del mapa (cliente y ruta); va dentro de un `<dl>` */
export function Dato({ etiqueta, children }: DatoProps) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-24 shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="min-w-0 text-gray-800">{children}</dd>
    </div>
  );
}
