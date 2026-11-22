"use client";

import { MenuAcciones, type AccionDeFila } from '@/components/ui/MenuAcciones';
import type { CatalogoItem } from '@/types';

interface CatalogoTableProps {
  items: CatalogoItem[];
  isLoading: boolean;
  /** Nombres en singular y plural, p. ej. "sucursal" / "sucursales" */
  etiqueta: { singular: string; plural: string };
  onEdit: (item: CatalogoItem) => void;
  onDelete: (item: CatalogoItem) => void;
}

const ENCABEZADO = 'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';

/** Un elemento en uso no se elimina: el menú lo muestra deshabilitado y dice por qué */
const accionesDe = (item: CatalogoItem, etiqueta: string, onEdit: CatalogoTableProps['onEdit'], onDelete: CatalogoTableProps['onDelete']): AccionDeFila[] => {
  const enUso = item.referencias > 0;
  return [
    { etiqueta: 'Editar', onClick: () => onEdit(item) },
    {
      etiqueta: 'Eliminar',
      variante: 'peligro',
      deshabilitada: enUso,
      motivo: enUso ? 'No se puede eliminar: está en uso por otros registros' : `Eliminar ${etiqueta}`,
      onClick: () => onDelete(item),
    },
  ];
};

const textoEnUso = (n: number) => (n === 0 ? 'Sin uso' : n === 1 ? 'En uso: 1 registro' : `En uso: ${n} registros`);

function EsqueletoFila() {
  return (
    <tr aria-hidden="true">
      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="h-4 w-10 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="ml-auto h-8 w-8 animate-pulse rounded bg-gray-100" /></td>
    </tr>
  );
}

/**
 * Elementos de un catálogo. En escritorio, una tabla compacta con columnas alineadas; en el celular, una tarjeta por
 * elemento con el nombre, el detalle y el menú de acciones, sin desplazamiento horizontal.
 */
export default function CatalogoTable({ items, isLoading, etiqueta, onEdit, onDelete }: CatalogoTableProps) {
  const vacio = <p className="px-4 py-12 text-center text-sm text-gray-400">No hay {etiqueta.plural} registradas</p>;

  return (
    <section className="overflow-hidden rounded-card bg-white shadow-card">
      {/* Celular: una tarjeta por elemento */}
      <ul className="space-y-2 p-3 md:hidden" aria-label={etiqueta.plural}>
        {isLoading &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
          ))}
        {!isLoading && items.length === 0 && <li>{vacio}</li>}
        {!isLoading &&
          items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-gray-900">{item.nombre}</p>
                {item.descripcion && <p className="mt-0.5 break-words text-xs text-gray-500">{item.descripcion}</p>}
                <p className="mt-0.5 text-xs text-gray-400">{textoEnUso(item.referencias)}</p>
              </div>
              <MenuAcciones etiqueta={`Acciones para ${item.nombre}`} acciones={accionesDe(item, etiqueta.singular, onEdit, onDelete)} />
            </li>
          ))}
      </ul>

      {/* Escritorio: tabla compacta */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className={ENCABEZADO}>Nombre</th>
              <th className={ENCABEZADO}>Descripción</th>
              <th className={ENCABEZADO}>En uso</th>
              <th className="w-12 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <>
                <EsqueletoFila />
                <EsqueletoFila />
                <EsqueletoFila />
              </>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={4}>{vacio}</td>
              </tr>
            )}
            {!isLoading &&
              items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-semibold text-gray-900">{item.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.descripcion || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{item.referencias}</td>
                  <td className="px-4 py-2.5 text-right">
                    <MenuAcciones etiqueta={`Acciones para ${item.nombre}`} acciones={accionesDe(item, etiqueta.singular, onEdit, onDelete)} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
