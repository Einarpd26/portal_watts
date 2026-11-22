"use client";

import { useState } from 'react';
import SelectorFrecuencia from './SelectorFrecuencia';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import Button from '@/components/ui/Button';
import { DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { etiquetaDeSlot } from '@/utils/planificacionMapa';
import type { Frecuencia, SlotItem } from '@/types';

interface AsignarEnFichaProps {
  slots: SlotItem[];
  /** Día de la planificación: lo elige la columna lateral, no este bloque */
  dia: DiaKey;
  deshabilitado: boolean;
  /** ¿Ya existe esa visita (misma ruta, slot, día y frecuencia)? */
  existe: (idSlot: number, frecuencia: Frecuencia) => boolean;
  onAsignar: (idSlot: number, frecuencia: Frecuencia) => Promise<void>;
}

/**
 * Bloque «Asignar a un slot» de la ficha de la ruta (CU-09 A7): se elige el slot y la frecuencia y se confirma.
 * El día es el de la columna lateral. Quien lo use debe darle `key` con el id de la ruta, para que cada ruta
 * empiece sin nada elegido.
 */
export default function AsignarEnFicha({ slots, dia, deshabilitado, existe, onAsignar }: AsignarEnFichaProps) {
  const [idSlot, setIdSlot] = useState<number | null>(null);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [asignando, setAsignando] = useState(false);

  const repetida = idSlot !== null && existe(idSlot, frecuencia);

  const asignar = async () => {
    if (idSlot === null) return;
    setAsignando(true);
    try {
      await onAsignar(idSlot, frecuencia);
      setIdSlot(null);
      setFrecuencia('semanal');
    } finally {
      setAsignando(false);
    }
  };

  return (
    <section aria-label="Asignar a un slot" className="mt-4 space-y-3 border-t border-gray-100 pt-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Asignar a un slot · {DIA_LABELS[dia]}</h4>
      <SelectorCompacto
        etiqueta="Slot al que se asigna la ruta"
        valor={idSlot === null ? '' : String(idSlot)}
        onCambiar={(v) => setIdSlot(v === '' ? null : Number(v))}
        placeholder="Elige un slot…"
        opciones={slots.map((s, i) => ({ valor: String(s.id), texto: `${etiquetaDeSlot(s, i)} · ${s.vendedor_nombre ?? 'Sin vendedor'}` }))}
      />
      <SelectorFrecuencia frecuencia={frecuencia} onFrecuencia={setFrecuencia} />
      {repetida && <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Ya está planificada en ese slot, ese día y con esa frecuencia.</p>}
      <Button onClick={() => void asignar()} disabled={idSlot === null || repetida || deshabilitado || asignando} className="w-full">
        Asignar
      </Button>
    </section>
  );
}
