"use client";

import { DIAS_ORDEN, DIA_LABELS } from '@/utils/diasSemana';
import FilaSlot from './FilaSlot';
import type { SlotItem, VendedorDisponible } from '@/types';

interface PlanificacionGridProps {
  slots: SlotItem[];
  disponibles: VendedorDisponible[];
  editMode: boolean;
  deshabilitado: boolean;
  onAsignar: (idSlot: number, idVendedor: number | null) => void;
  onRenombrar: (idSlot: number, nombre: string) => void;
  onEliminar: (idSlot: number) => void;
  onMover: (idSlot: number, direccion: 'arriba' | 'abajo') => void;
}

/** Grilla de planificación: una fila por slot y una columna por día de visita (lunes a sábado) */
export default function PlanificacionGrid({
  slots,
  disponibles,
  editMode,
  deshabilitado,
  onAsignar,
  onRenombrar,
  onEliminar,
  onMover,
}: PlanificacionGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="border-b border-gray-700 bg-gray-800 text-[10px] font-bold uppercase tracking-wider text-white">
          <tr>
            <th className="sticky left-0 z-10 w-[200px] min-w-[200px] border-r border-gray-700 bg-gray-800 px-3 py-2.5 text-left md:w-[22%] md:min-w-0">
              Vendedor
            </th>
            {DIAS_ORDEN.map((dia) => (
              <th key={dia} className="w-[120px] border-r border-gray-700 px-2 py-2.5 text-center last:border-r-0 md:w-auto">
                {DIA_LABELS[dia]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {slots.map((slot, i) => (
            <FilaSlot
              key={slot.id}
              slot={slot}
              posicion={i + 1}
              total={slots.length}
              disponibles={disponibles}
              editMode={editMode}
              deshabilitado={deshabilitado}
              onAsignar={onAsignar}
              onRenombrar={onRenombrar}
              onEliminar={onEliminar}
              onMover={onMover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
