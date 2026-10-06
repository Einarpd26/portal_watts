import Button from '@/components/ui/Button';
import type { CatalogoItem } from '@/types';

interface EliminarCatalogoModalProps {
  item: CatalogoItem | null;
  etiqueta: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EliminarCatalogoModal({
  item,
  etiqueta,
  isSubmitting,
  onConfirm,
  onCancel,
}: EliminarCatalogoModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eliminar-catalogo-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <h3 id="eliminar-catalogo-title" className="mb-2 text-center text-lg font-bold text-gray-900">
          Eliminar {etiqueta}
        </h3>
        <p className="mb-6 text-center text-sm text-gray-600">
          Se eliminará <strong className="text-gray-900">{item.nombre}</strong>. Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isSubmitting} disabled={isSubmitting}>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
