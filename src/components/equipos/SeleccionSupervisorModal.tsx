"use client";

import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { EquipoSupervisor } from '@/types';

interface SeleccionSupervisorModalProps {
  open: boolean;
  titulo: string;
  descripcion: ReactNode;
  /** Supervisores activos entre los que se elige; el modal solo muestra los de la sucursal indicada */
  candidatos: EquipoSupervisor[];
  idSucursal: number;
  /** Supervisor que no se ofrece (el que se reemplaza o el que ya tiene al vendedor) */
  excluirId?: number | null;
  /** Etiqueta de la opción vacía; sin ella, hay que elegir un supervisor */
  etiquetaSinSupervisor?: string;
  seleccion: number | null;
  onSeleccion: (id: number | null) => void;
  /** Valor con el que la confirmación no cambia nada */
  seleccionInicial?: number | null;
  textoConfirmar: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SeleccionSupervisorModal({
  open,
  titulo,
  descripcion,
  candidatos,
  idSucursal,
  excluirId = null,
  etiquetaSinSupervisor,
  seleccion,
  onSeleccion,
  seleccionInicial,
  textoConfirmar,
  isSubmitting,
  onConfirm,
  onCancel,
}: SeleccionSupervisorModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, open && !isSubmitting);

  if (!open) return null;

  const disponibles = candidatos.filter((c) => c.id_sucursal === idSucursal && c.id_persona !== excluirId);
  const sinCambios = seleccionInicial !== undefined && seleccionInicial === seleccion;
  const faltaElegir = etiquetaSinSupervisor === undefined && seleccion === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seleccion-supervisor-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
      >
        <h3 id="seleccion-supervisor-title" className="mb-1 text-lg font-bold text-gray-900">
          {titulo}
        </h3>
        <div className="mb-5 text-sm text-gray-600">{descripcion}</div>

        <Select
          label="Supervisor"
          buscable
          valor={deNumeroONulo(seleccion)}
          onCambiar={(v) => onSeleccion(aNumeroONulo(v))}
          opciones={[
            ...(etiquetaSinSupervisor === undefined ? [] : [{ valor: '', texto: etiquetaSinSupervisor }]),
            ...disponibles.map((c) => ({ valor: String(c.id_persona), texto: c.nombre })),
          ]}
          disabled={isSubmitting}
          placeholder={etiquetaSinSupervisor === undefined ? 'Seleccionar...' : undefined}
        />
        {disponibles.length === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            No hay supervisores activos con acceso en esta sucursal. Otorga el rol Supervisor desde Accesos.
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} isLoading={isSubmitting} disabled={isSubmitting || sinCambios || faltaElegir}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
