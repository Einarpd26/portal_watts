import Button from '@/components/ui/Button';
import type { CatalogoItem } from '@/types';

interface CatalogoTableProps {
  items: CatalogoItem[];
  isLoading: boolean;
  /** Nombres en singular y plural, p. ej. "sucursal" / "sucursales" */
  etiqueta: { singular: string; plural: string };
  onEdit: (item: CatalogoItem) => void;
  onDelete: (item: CatalogoItem) => void;
}

function SkeletonRow() {
  return (
    <tr aria-hidden="true">
      <td className="px-4 py-3"><div className="h-4 w-40 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="h-4 w-64 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="h-4 w-10 animate-pulse rounded bg-gray-100" /></td>
      <td className="px-4 py-3"><div className="ml-auto h-8 w-32 animate-pulse rounded bg-gray-100" /></td>
    </tr>
  );
}

export default function CatalogoTable({ items, isLoading, etiqueta, onEdit, onDelete }: CatalogoTableProps) {
  return (
    <section className="overflow-hidden rounded-card bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-bold capitalize text-gray-900">{etiqueta.plural}</h2>
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">
          {items.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Descripción</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">En uso</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
                  No hay {etiqueta.plural} registradas
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const enUso = item.referencias > 0;
                return (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.nombre}</td>
                    <td className="px-4 py-3 text-gray-600">{item.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.referencias}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => onEdit(item)}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={enUso}
                          title={enUso ? 'No se puede eliminar: está en uso por otros registros' : `Eliminar ${etiqueta.singular}`}
                          onClick={() => onDelete(item)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
