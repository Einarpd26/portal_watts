import React from 'react';
import Button from '@/components/ui/Button';
import type { UsuarioActivo } from '@/types';

interface RevocarAccesoModalProps {
  open: boolean;
  user: UsuarioActivo | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RevocarAccesoModal({
  open,
  user,
  isSubmitting,
  onConfirm,
  onCancel,
}: RevocarAccesoModalProps) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revocar-acceso-title"
        className="relative w-full max-w-md bg-white rounded-card shadow-[0_24px_64px_rgba(0,0,0,.25)] p-6"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3
          id="revocar-acceso-title"
          className="text-center text-lg font-bold text-gray-900 mb-2"
        >
          Revocar acceso
        </h3>

        {/* Description */}
        <p className="text-center text-sm text-gray-600 mb-5">
          Se eliminarán las credenciales de{' '}
          <strong className="text-gray-900">
            {user.nombres} {user.apellidos}
          </strong>
          . Podrán volver a ser creadas en el futuro.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Revocar
          </Button>
        </div>
      </div>
    </div>
  );
}
