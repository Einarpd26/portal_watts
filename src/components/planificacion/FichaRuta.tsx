"use client";

import { BotonCerrarFicha } from '@/components/mapa/BotonCerrarFicha';
import { HojaInferior } from '@/components/mapa/HojaInferior';
import { PanelLateral } from '@/components/mapa/PanelLateral';
import AsignarEnFicha from './AsignarEnFicha';
import type { DiaKey } from '@/utils/diasSemana';
import { FRECUENCIAS, FRECUENCIA_LABELS } from '@/utils/frecuencias';
import { colorDeSlot, descripcionDeVisita, etiquetaDeSlot } from '@/utils/planificacionMapa';
import type { Frecuencia, RutaItem, SlotItem, VisitaPlanificada } from '@/types';

interface FichaRutaProps {
  ruta: RutaItem;
  slots: SlotItem[];
  /** Visitas de esta ruta en toda la semana */
  visitas: VisitaPlanificada[];
  duplicada: boolean;
  /** Acciones de edición; ausentes en la consulta de solo lectura */
  edicion: {
    deshabilitado: boolean;
    onCambiarFrecuencia: (idVisita: number, frecuencia: Frecuencia) => void;
    onQuitar: (visita: VisitaPlanificada) => void;
  } | null;
  /** Asignar la ruta a un slot desde la ficha; ausente en Cobertura y en la consulta de solo lectura */
  asignar: {
    dia: DiaKey;
    deshabilitado: boolean;
    existe: (idSlot: number, frecuencia: Frecuencia) => boolean;
    onAsignar: (idSlot: number, frecuencia: Frecuencia) => Promise<void>;
  } | null;
  onCerrar: () => void;
  /** panel: columna junto al mapa (escritorio) · hoja: hoja inferior que se estira (celular) */
  variante: 'panel' | 'hoja';
}

/**
 * Datos de la ruta elegida y todas sus visitas de la semana (CU-09 A2). En el escritorio es un panel junto al mapa;
 * en el celular, una hoja inferior con gestos. Quien la use debe darle `key` con el id de la ruta, para que cada
 * ruta empiece con la hoja encogida.
 */
export default function FichaRuta({ ruta, slots, visitas, duplicada, edicion, asignar, onCerrar, variante }: FichaRutaProps) {
  const posicionDe = (idSlot: number) => slots.findIndex((s) => s.id === idSlot);
  const nombreDe = (idSlot: number) => {
    const i = posicionDe(idSlot);
    return i === -1 ? 'Slot eliminado' : etiquetaDeSlot(slots[i], i);
  };

  const etiqueta = `Ficha de la ruta ${ruta.codigo_ruta}`;
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {ruta.codigo_ruta} — {ruta.ruta}
          </p>
          {ruta.descripcion_ruta && <p className="text-xs text-gray-500">{ruta.descripcion_ruta}</p>}
        </div>
        <BotonCerrarFicha onClick={onCerrar} />
      </div>

      {duplicada && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Duplicada: está planificada más de una vez en la semana.{edicion && ' Marca una de las visitas como eventual o quita la que sobra.'}
        </p>
      )}

      {visitas.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">Sin planificar.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visitas.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
              {/* El color del slot es un dato del mapa: se aplica como estilo */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: colorDeSlot(Math.max(posicionDe(v.id_slot), 0)) }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 text-xs text-gray-800">{descripcionDeVisita(v, nombreDe(v.id_slot))}</span>
              {edicion && (
                <>
                  <select
                    aria-label={`Frecuencia de la visita del ${descripcionDeVisita(v, nombreDe(v.id_slot))}`}
                    value={v.frecuencia}
                    disabled={edicion.deshabilitado || v.id < 0}
                    onChange={(e) => edicion.onCambiarFrecuencia(v.id, e.target.value as Frecuencia)}
                    className="rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-primary-600"
                  >
                    {FRECUENCIAS.map((f) => (
                      <option key={f} value={f}>
                        {FRECUENCIA_LABELS[f]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={edicion.deshabilitado || v.id < 0}
                    onClick={() => edicion.onQuitar(v)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    Quitar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {asignar && <AsignarEnFicha slots={slots} dia={asignar.dia} deshabilitado={asignar.deshabilitado} existe={asignar.existe} onAsignar={asignar.onAsignar} />}
    </>
  );

  return variante === 'panel' ? (
    <PanelLateral etiqueta={etiqueta}>{contenido}</PanelLateral>
  ) : (
    <HojaInferior etiqueta={etiqueta} onCerrar={onCerrar}>
      {contenido}
    </HojaInferior>
  );
}
