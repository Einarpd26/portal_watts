"use client";

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { SupervisorCandidato, ZonaItem } from '@/types';

interface SupervisorZonaModalProps {
  zona: ZonaItem | null;
  candidatos: SupervisorCandidato[];
  seleccion: number | null;
  onSeleccion: (id: number | null) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SupervisorZonaModal({
  zona,
  candidatos,
  seleccion,
  onSeleccion,
  isSubmitting,
  onConfirm,
  onCancel,
}: SupervisorZonaModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, zona !== null && !isSubmitting);

  if (!zona) return null;

  // Solo supervisores con acceso en la sucursal de la zona
  const disponibles = candidatos.filter((c) => c.id_sucursal === zona.id_sucursal);
  const sinCambios = (zona.supervisor?.id_persona ?? null) === seleccion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="supervisor-zona-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <h3 id="supervisor-zona-title" className="mb-1 text-lg font-bold text-gray-900">
          Supervisor de la zona
        </h3>
        <p className="mb-5 text-sm text-gray-600">
          {zona.codigo_zona} — {zona.zona}
          {zona.supervisor ? ` · Actual: ${zona.supervisor.nombre}` : ' · Sin supervisor'}
        </p>

        <Select
          label="Supervisor"
          buscable
          valor={deNumeroONulo(seleccion)}
          onCambiar={(v) => onSeleccion(aNumeroONulo(v))}
          opciones={[{ valor: '', texto: 'Sin supervisor' }, ...disponibles.map((c) => ({ valor: String(c.id_persona), texto: c.nombre }))]}
          disabled={isSubmitting}
        />

        {disponibles.length === 0 && (
          <p className="mt-3 text-xs text-amber-700">
            No hay supervisores con acceso en esta sucursal. Otorga el rol Supervisor en Accesos para poder asignarlo.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} isLoading={isSubmitting} disabled={isSubmitting || sinCambios}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
