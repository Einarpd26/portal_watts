"use client";

import { cn } from '@/utils/cn';
import { DIAS_ORDEN, type DiaKey } from '@/utils/diasSemana';
import { FRECUENCIAS, FRECUENCIA_LABELS } from '@/utils/frecuencias';
import { abreviaturaDeDia, colorDeSlot, etiquetaDeSlot } from '@/utils/planificacionMapa';
import type { Frecuencia, SlotItem } from '@/types';

interface SelectorPincelProps {
  slots: SlotItem[];
  /** Rutas que cada slot cubre el día activo */
  rutasPorSlot: ReadonlyMap<number, number>;
  /** Slot elegido como pincel; null: sin pincel, los clics solo muestran la ficha de la ruta */
  idSlotActivo: number | null;
  onSlot: (idSlot: number | null) => void;
  dia: DiaKey;
  onDia: (dia: DiaKey) => void;
  frecuencia: Frecuencia;
  onFrecuencia: (frecuencia: Frecuencia) => void;
  /** Consulta: se puede cambiar de día, pero no hay pincel ni frecuencia */
  soloLectura: boolean;
}

const TITULO = 'mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400';

// El color del slot es un dato del mapa (no hay clase de Tailwind por slot): se aplica como estilo
function PuntoDeSlot({ posicion }: { posicion: number }) {
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: colorDeSlot(posicion) }}
      aria-hidden="true"
    />
  );
}

function DatosDeSlot({ slot, posicion, rutas }: { slot: SlotItem; posicion: number; rutas: number }) {
  return (
    <>
      <PuntoDeSlot posicion={posicion} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-gray-900">{etiquetaDeSlot(slot, posicion)}</span>
        <span className="block truncate text-[11px] text-gray-500">{slot.vendedor_nombre ?? 'Sin vendedor'}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-gray-500">
        {rutas} {rutas === 1 ? 'ruta' : 'rutas'}
      </span>
    </>
  );
}

/** Slot, día y frecuencia activos: lo que se «pinta» al hacer clic sobre una ruta (ADR-004 D2) */
export default function SelectorPincel({
  slots,
  rutasPorSlot,
  idSlotActivo,
  onSlot,
  dia,
  onDia,
  frecuencia,
  onFrecuencia,
  soloLectura,
}: SelectorPincelProps) {
  return (
    <div className="space-y-4">
      <section aria-labelledby="pincel-dia">
        <h3 id="pincel-dia" className={TITULO}>
          Día
        </h3>
        <div className="grid grid-cols-6 gap-1">
          {DIAS_ORDEN.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dia === d}
              onClick={() => onDia(d)}
              className={cn(
                'rounded-lg border py-1.5 text-xs font-semibold transition-colors',
                dia === d ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {abreviaturaDeDia(d)}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="pincel-slots">
        <h3 id="pincel-slots" className={TITULO}>
          Slots
        </h3>
        <ul className="space-y-1">
          {slots.map((slot, i) => (
            <li key={slot.id}>
              {soloLectura ? (
                <div className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5">
                  <DatosDeSlot slot={slot} posicion={i} rutas={rutasPorSlot.get(slot.id) ?? 0} />
                </div>
              ) : (
                <button
                  type="button"
                  aria-pressed={idSlotActivo === slot.id}
                  onClick={() => onSlot(idSlotActivo === slot.id ? null : slot.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
                    idSlotActivo === slot.id ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900' : 'border-gray-200 bg-white hover:bg-gray-50'
                  )}
                >
                  <DatosDeSlot slot={slot} posicion={i} rutas={rutasPorSlot.get(slot.id) ?? 0} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!soloLectura && (
          <p className="mt-1.5 text-[11px] text-gray-500">
            {idSlotActivo === null
              ? 'Elige un slot para pintar. Sin slot elegido, un clic en una ruta muestra su ficha.'
              : 'Un clic en una ruta la planifica en este slot y día, o la quita si ya estaba.'}
          </p>
        )}
      </section>

      {!soloLectura && (
        <section aria-labelledby="pincel-frecuencia">
          <h3 id="pincel-frecuencia" className={TITULO}>
            Frecuencia
          </h3>
          <div className="grid grid-cols-2 gap-1">
            {FRECUENCIAS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={frecuencia === f}
                onClick={() => onFrecuencia(f)}
                className={cn(
                  'rounded-lg border py-1.5 text-xs font-medium transition-colors',
                  frecuencia === f ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {FRECUENCIA_LABELS[f]}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
