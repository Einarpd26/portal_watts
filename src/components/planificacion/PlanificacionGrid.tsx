"use client";

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { rutasDuplicadasEnSemana } from '@/utils/planificacionDuplicados';
import { datosArrastreVisita, datosCeldaDestino, puedeSoltarVisita } from '@/utils/planificacionMover';
import ChipVisita from './ChipVisita';
import FilaSlot from './FilaSlot';
import type { SlotItem, VendedorDisponible, VisitaPlanificada } from '@/types';

interface PlanificacionGridProps {
  slots: SlotItem[];
  disponibles: VendedorDisponible[];
  visitas: VisitaPlanificada[];
  editMode: boolean;
  deshabilitado: boolean;
  onAsignar: (idSlot: number, idVendedor: number | null) => void;
  onRenombrar: (idSlot: number, nombre: string) => void;
  onEliminar: (idSlot: number) => void;
  onMover: (idSlot: number, direccion: 'arriba' | 'abajo') => void;
  onAgregarVisita: (idSlot: number, dia: DiaKey) => void;
  onSeleccionarVisita: (visita: VisitaPlanificada) => void;
  /** Mueve una visita a otra celda (el padre llama a la API y muestra el resultado) */
  onMoverVisita: (idVisita: number, idSlot: number, dia: DiaKey) => void;
}

/** Grilla de planificación: una fila por slot y una columna por día de visita (lunes a sábado) */
export default function PlanificacionGrid({
  slots,
  disponibles,
  visitas,
  editMode,
  deshabilitado,
  onAsignar,
  onRenombrar,
  onEliminar,
  onMover,
  onAgregarVisita,
  onSeleccionarVisita,
  onMoverVisita,
}: PlanificacionGridProps) {
  // RN-04: una ruta planificada más de una vez en la semana (en cualquier slot y día) es duplicada
  const duplicadas = useMemo(() => rutasDuplicadasEnSemana(visitas), [visitas]);

  // Mouse con distancia y touch con retardo: un toque corto abre la visita y el scroll no se rompe
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );
  const [arrastrada, setArrastrada] = useState<VisitaPlanificada | null>(null);

  const alEmpezar = useCallback(
    (evento: DragStartEvent) => {
      const idVisita = datosArrastreVisita(evento.active.data.current)?.origen.idVisita;
      setArrastrada(visitas.find((v) => v.id === idVisita) ?? null);
    },
    [visitas]
  );

  const alSoltar = useCallback(
    ({ active, over }: DragEndEvent) => {
      setArrastrada(null);
      const arrastre = datosArrastreVisita(active.data.current);
      const celda = datosCeldaDestino(over?.data.current);
      if (!arrastre || !celda || !puedeSoltarVisita(celda.destino, arrastre.origen)) return;
      onMoverVisita(arrastre.origen.idVisita, celda.destino.idSlot, celda.destino.dia);
    },
    [onMoverVisita]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={alEmpezar}
      onDragCancel={() => setArrastrada(null)}
      onDragEnd={alSoltar}
    >
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
              visitas={visitas.filter((v) => v.id_slot === slot.id)}
              duplicadas={duplicadas}
              editMode={editMode}
              deshabilitado={deshabilitado}
              onAsignar={onAsignar}
              onRenombrar={onRenombrar}
              onEliminar={onEliminar}
              onMover={onMover}
              onAgregarVisita={onAgregarVisita}
              onSeleccionarVisita={onSeleccionarVisita}
            />
          ))}
        </tbody>
      </table>
    </div>
    <DragOverlay dropAnimation={null}>
      {arrastrada && <ChipVisita visita={arrastrada} duplicada={duplicadas.has(arrastrada.id_ruta)} className="shadow-lg" />}
    </DragOverlay>
    </DndContext>
  );
}
