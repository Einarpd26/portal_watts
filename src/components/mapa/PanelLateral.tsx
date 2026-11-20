"use client";

import type { ReactNode } from 'react';

interface PanelLateralProps {
  /** Nombre accesible del panel (p. ej. «Ficha del cliente CS1-003») */
  etiqueta: string;
  children: ReactNode;
}

/** Panel de detalle del escritorio: una columna junto al mapa que se desplaza por dentro */
export function PanelLateral({ etiqueta, children }: PanelLateralProps) {
  return (
    <aside aria-label={etiqueta} className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </aside>
  );
}
