"use client";

import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { todayBolivia } from '@/utils/boliviaTime';
import type { PersonaConAsignacion } from '@/types';
import type { BajaForm } from '@/hooks/useGestionPersonal';

interface DarDeBajaModalProps {
  persona: PersonaConAsignacion | null;
  form: BajaForm;
  setForm: (form: BajaForm) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DarDeBajaModal({
  persona,
  form,
  setForm,
  isSubmitting,
  onConfirm,
  onCancel,
}: DarDeBajaModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, persona !== null && !isSubmitting);

  if (!persona) return null;

  const hasAccount = persona.auth_user_id !== null;
  const isFuture = form.fecha_baja > todayBolivia();
  const minDate = persona.asignacion?.fecha_inicio;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dar-de-baja-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </div>
        </div>

        <h3 id="dar-de-baja-title" className="mb-2 text-center text-lg font-bold text-gray-900">
          Dar de baja colaborador
        </h3>
        <p className="mb-5 text-center text-sm text-gray-600">
          Se finalizará la asignación laboral de{' '}
          <strong className="text-gray-900">
            {persona.nombres} {persona.apellidos}
          </strong>
          . Su historial comercial se conserva.
        </p>

        <div className="space-y-4">
          <Input
            label="Fecha de baja (último día de vínculo)"
            type="date"
            value={form.fecha_baja}
            min={minDate}
            onChange={(e) =>
              setForm({ ...form, fecha_baja: e.target.value, revocar_acceso: form.revocar_acceso && e.target.value <= todayBolivia() })
            }
            disabled={isSubmitting}
          />

          {hasAccount && (
            <label
              className={`flex items-start gap-3 rounded-input border border-gray-200 p-3 text-sm ${
                isFuture ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary-600"
                checked={form.revocar_acceso}
                disabled={isSubmitting || isFuture}
                onChange={(e) => setForm({ ...form, revocar_acceso: e.target.checked })}
              />
              <span className="text-gray-700">
                <span className="font-semibold text-gray-900">Revocar también su acceso digital</span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {isFuture
                    ? 'No disponible con fecha futura: conserva el acceso hasta el final de ese día.'
                    : 'Elimina sus credenciales y roles. No se puede deshacer.'}
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="md" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
            disabled={!form.fecha_baja}
            className="flex-1"
          >
            Dar de baja
          </Button>
        </div>
      </div>
    </div>
  );
}
