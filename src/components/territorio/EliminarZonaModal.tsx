"use client";

import Button from '@/components/ui/Button';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { ZonaItem } from '@/types';

interface EliminarZonaModalProps {
  zona: ZonaItem | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EliminarZonaModal({ zona, isSubmitting, onConfirm, onCancel }: EliminarZonaModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, zona !== null && !isSubmitting);

  if (!zona) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eliminar-zona-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <h3 id="eliminar-zona-title" className="mb-2 text-center text-lg font-bold text-gray-900">
          Eliminar zona
        </h3>
        <p className="mb-6 text-center text-sm text-gray-600">
          Se eliminará <strong className="text-gray-900">{zona.codigo_zona} — {zona.zona}</strong>
          {zona.supervisor ? ' y se quitará su supervisor asignado' : ''}. Esta acción no se puede deshacer.
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
