"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface ConfirmAccesoModalProps {
  open: boolean;
  preview: { nombre: string; email: string; rolNombre: string } | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmAccesoModal({
  open,
  preview,
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmAccesoModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, open && preview !== null && !isSubmitting);

  if (!open || !preview) return null;

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
        aria-labelledby="confirm-acceso-title"
        className="relative w-full max-w-md bg-white rounded-card shadow-[0_24px_64px_rgba(0,0,0,.25)] p-6"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3
          id="confirm-acceso-title"
          className="text-center text-lg font-bold text-gray-900 mb-2"
        >
          Confirmar acceso
        </h3>

        {/* Description */}
        <p className="text-center text-sm text-gray-600 mb-3">
          Se creará una cuenta para{' '}
          <strong className="text-gray-900">{preview.nombre}</strong> con el email{' '}
          <strong className="text-gray-900">{preview.email}</strong> y el rol{' '}
          <strong className="text-gray-900">{preview.rolNombre}</strong>.
        </p>

        {/* Warning note */}
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mb-5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-amber-500 mt-0.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-amber-700">
            Compartí las credenciales con el colaborador de forma directa — no se enviará ningún email.
          </p>
        </div>

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
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
            className="flex-1"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}
