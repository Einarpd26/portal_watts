"use client";

import SelectorCompacto from '@/components/ui/SelectorCompacto';
import type { RutaItem } from '@/types';

interface SelectorRutaProps {
  rutas: RutaItem[];
  /** Ruta elegida, o null para todas */
  idRuta: number | null;
  onCambiar: (idRuta: number | null) => void;
}

/** Selector de ruta del mapa de clientes: la barra superior (celular) y la columna lateral (escritorio) lo comparten */
export function SelectorRuta({ rutas, idRuta, onCambiar }: SelectorRutaProps) {
  return (
    <SelectorCompacto
      buscable
      etiqueta="Ruta"
      valor={idRuta === null ? '' : String(idRuta)}
      onCambiar={(v) => onCambiar(v === '' ? null : Number(v))}
      opciones={[{ valor: '', texto: 'Todas las rutas' }, ...rutas.map((r) => ({ valor: String(r.id), texto: `${r.codigo_ruta} — ${r.ruta}` }))]}
    />
  );
}
