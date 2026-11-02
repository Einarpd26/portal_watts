"use client";

import { useMemo } from 'react';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@/utils/cn';
import type { DiaKey } from '@/utils/diasSemana';
import {
  datosArrastreVisita,
  idCeldaPlanificacion,
  puedeSoltarVisita,
  type DatosArrastreVisita,
  type DatosCeldaDestino,
  type DestinoCelda,
} from '@/utils/planificacionMover';
import ChipVisita from './ChipVisita';
import type { VisitaPlanificada } from '@/types';

interface CeldaDiaProps {
  idSlot: number;
  dia: DiaKey;
  visitas: VisitaPlanificada[];
  /** Ids de las rutas planificadas más de una vez en la semana (RN-04) */
  duplicadas: ReadonlySet<number>;
  editMode: boolean;
  etiqueta: string;
  onAgregar: () => void;
  onSeleccionar: (visita: VisitaPlanificada) => void;
}

/** Chip de una visita en modo edición: un toque corto la abre y arrastrarla la mueve a otra celda */
function VisitaArrastrable({
  visita,
  idSlot,
  dia,
  duplicada,
  onSeleccionar,
}: {
  visita: VisitaPlanificada;
  idSlot: number;
  dia: DiaKey;
  duplicada: boolean;
  onSeleccionar: (visita: VisitaPlanificada) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `visita:${visita.id}`,
    data: {
      type: 'visita',
      origen: { idVisita: visita.id, idSlot, dia, idRuta: visita.id_ruta, frecuencia: visita.frecuencia },
    } satisfies DatosArrastreVisita,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onSeleccionar(visita)}
      aria-label={`Editar la ruta ${visita.codigo_ruta}`}
      className={cn('cursor-grab select-none text-left active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <ChipVisita visita={visita} duplicada={duplicada} className="transition hover:ring-1 hover:ring-primary-400" />
    </button>
  );
}

/** Celda de un slot y un día: las rutas planificadas como chips y, en modo edición, el botón para agregar */
export default function CeldaDia({ idSlot, dia, visitas, duplicadas, editMode, etiqueta, onAgregar, onSeleccionar }: CeldaDiaProps) {
  const destino: DestinoCelda = useMemo(() => ({ idSlot, dia, visitas }), [idSlot, dia, visitas]);

  // Mientras se arrastra una visita, la celda se resalta si puede recibirla
  const { active } = useDndContext();
  const arrastre = editMode ? datosArrastreVisita(active?.data.current) : null;
  const esDestinoValido = !!arrastre && puedeSoltarVisita(destino, arrastre.origen);
  const esOrigen = !!arrastre && arrastre.origen.idSlot === idSlot && arrastre.origen.dia === dia;

  const { setNodeRef, isOver } = useDroppable({
    id: idCeldaPlanificacion(idSlot, dia),
    disabled: !editMode || !esDestinoValido,
    data: { type: 'celda', destino } satisfies DatosCeldaDestino,
  });

  return (
    <td
      ref={editMode ? setNodeRef : undefined}
      className={cn(
        'min-w-0 overflow-hidden border-r border-gray-200 p-2 align-top last:border-r-0',
        visitas.length === 0 && !editMode ? 'bg-zinc-50' : 'bg-white',
        !!arrastre && esDestinoValido && (isOver ? 'bg-indigo-100 ring-2 ring-inset ring-indigo-500' : 'bg-indigo-50/60 ring-1 ring-inset ring-indigo-200'),
        !!arrastre && !esDestinoValido && !esOrigen && 'opacity-60'
      )}
    >
      <div className="flex min-h-[2rem] flex-col gap-1">
        {visitas.map((visita) =>
          editMode ? (
            <VisitaArrastrable
              key={visita.id}
              visita={visita}
              idSlot={idSlot}
              dia={dia}
              duplicada={duplicadas.has(visita.id_ruta)}
              onSeleccionar={onSeleccionar}
            />
          ) : (
            <ChipVisita key={visita.id} visita={visita} duplicada={duplicadas.has(visita.id_ruta)} />
          )
        )}

        {editMode && (
          <button
            type="button"
            onClick={onAgregar}
            aria-label={`Agregar ruta: ${etiqueta}`}
            className="self-start rounded-lg border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 transition hover:border-primary-400 hover:text-primary-600"
          >
            + Ruta
          </button>
        )}
      </div>
    </td>
  );
}
