"use client";

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
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
  /** Reordena los slots arrastrando una fila: recibe los ids en el orden nuevo */
  onReordenar: (idsEnOrden: number[]) => void;
}

// Un solo DndContext con dos tipos de arrastre, distinguidos por `data.type`:
//  - filas de slot (useSortable, sin type): solo en vertical y dentro de la tabla.
//  - 'visita' (chip entre celdas): movimiento libre, solo sobre celdas.
const esArrastreVisita = (active: { data: { current?: Record<string, unknown> } } | null) =>
  active?.data.current?.type === 'visita';

const soloParaFilas =
  (modifier: Modifier): Modifier =>
  (args) =>
    esArrastreVisita(args.active) ? args.transform : modifier(args);

const MODIFICADORES: Modifier[] = [soloParaFilas(restrictToVerticalAxis), soloParaFilas(restrictToParentElement)];

const colision: CollisionDetection = (args) => {
  const esVisita = esArrastreVisita(args.active);
  const contenedores = args.droppableContainers.filter((c) => (c.data.current?.type === 'celda') === esVisita);
  return esVisita
    ? pointerWithin({ ...args, droppableContainers: contenedores })
    : closestCenter({ ...args, droppableContainers: contenedores });
};

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
  onReordenar,
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
      if (arrastre) {
        const celda = datosCeldaDestino(over?.data.current);
        if (celda && puedeSoltarVisita(celda.destino, arrastre.origen)) {
          onMoverVisita(arrastre.origen.idVisita, celda.destino.idSlot, celda.destino.dia);
        }
        return;
      }

      // Fila de slot
      if (!over || active.id === over.id) return;
      const antes = slots.findIndex((sl) => sl.id === active.id);
      const despues = slots.findIndex((sl) => sl.id === over.id);
      if (antes === -1 || despues === -1) return;
      onReordenar(arrayMove(slots, antes, despues).map((sl) => sl.id));
    },
    [slots, onMoverVisita, onReordenar]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={colision}
      modifiers={MODIFICADORES}
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
          <SortableContext items={slots.map((sl) => sl.id)} strategy={verticalListSortingStrategy}>
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
          </SortableContext>
        </tbody>
      </table>
    </div>
    <DragOverlay dropAnimation={null}>
      {arrastrada && <ChipVisita visita={arrastrada} duplicada={duplicadas.has(arrastrada.id_ruta)} className="shadow-lg" />}
    </DragOverlay>
    </DndContext>
  );
}
