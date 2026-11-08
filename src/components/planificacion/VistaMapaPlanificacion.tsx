"use client";

import { useCallback, useMemo, useState } from 'react';
import { MapaPlanificacion } from './MapaPlanificacion';
import SelectorPincel from './SelectorPincel';
import ListaRutasPlanificacion from './ListaRutasPlanificacion';
import FichaRuta from './FichaRuta';
import AvisoPincel from './AvisoPincel';
import { usePincelPlanificacion, type EdicionDelMapa } from '@/hooks/usePincelPlanificacion';
import { cn } from '@/utils/cn';
import { DIAS_ORDEN, type DiaKey } from '@/utils/diasSemana';
import {
  accionDelPincel,
  descripcionDeVisita,
  etiquetaDeSlot,
  propiedadesDeRutas,
} from '@/utils/planificacionMapa';
import type { Frecuencia, MapaPlanificacion as DatosMapa, SlotItem, VisitaPlanificada } from '@/types';

export interface EdicionVistaMapa extends EdicionDelMapa {
  deshabilitado: boolean;
  cambiarFrecuencia: (idVisita: number, frecuencia: Frecuencia) => Promise<void>;
}

interface VistaMapaPlanificacionProps {
  slots: SlotItem[];
  visitas: VisitaPlanificada[];
  /** Polígonos y contornos; null mientras se cargan o si falló */
  mapa: DatosMapa | null;
  cargando: boolean;
  error: string | null;
  /** Presente para quien planifica; ausente: consulta de solo lectura (ADR-004 D5) */
  edicion: EdicionVistaMapa | null;
  /** Clases de Tailwind con la altura del mapa */
  claseAltura?: string;
}

/**
 * Planificación sobre el mapa (ADR-004): columna con día, slots, frecuencia y lista de rutas, y el mapa con las
 * rutas pintadas por slot. Comparte slots y visitas con el calendario, así que lo que se pinta aquí aparece allí.
 */
export default function VistaMapaPlanificacion({
  slots,
  visitas,
  mapa,
  cargando,
  error,
  edicion,
  claseAltura = 'h-112 lg:h-160',
}: VistaMapaPlanificacionProps) {
  const [dia, setDia] = useState<DiaKey>(DIAS_ORDEN[0]);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [slotElegido, setSlotElegido] = useState<number | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const soloLectura = edicion === null;
  // Si el slot elegido se eliminó en el calendario, el pincel se apaga solo
  const idSlotActivo = !soloLectura && slots.some((s) => s.id === slotElegido) ? slotElegido : null;

  const nombresDeSlot = useMemo(() => new globalThis.Map(slots.map((s, i) => [s.id, etiquetaDeSlot(s, i)])), [slots]);
  const nombreDeSlot = useCallback((idSlot: number) => nombresDeSlot.get(idSlot) ?? 'Slot eliminado', [nombresDeSlot]);
  const { aviso, pintar, deshacer } = usePincelPlanificacion(visitas, nombreDeSlot, edicion);

  const rutas = useMemo(() => mapa?.rutas ?? [], [mapa]);
  const propiedades = useMemo(() => propiedadesDeRutas(rutas, visitas, slots, dia), [rutas, visitas, slots, dia]);
  const propiedadesPorId = useMemo(() => new globalThis.Map(propiedades.map((p) => [p.id, p])), [propiedades]);

  // «Lun · Slot 1 · semanal» por ruta, en el orden de la semana, para el tooltip y la lista
  const descripciones = useMemo(() => {
    const porRuta = new globalThis.Map<number, string[]>();
    const ordenadas = [...visitas].sort((a, b) => DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia));
    for (const v of ordenadas) {
      porRuta.set(v.id_ruta, [...(porRuta.get(v.id_ruta) ?? []), descripcionDeVisita(v, nombreDeSlot(v.id_slot))]);
    }
    return porRuta;
  }, [visitas, nombreDeSlot]);

  const rutasPorSlot = useMemo(() => {
    const conteo = new globalThis.Map<number, number>();
    for (const v of visitas) if (v.dia === dia) conteo.set(v.id_slot, (conteo.get(v.id_slot) ?? 0) + 1);
    return conteo;
  }, [visitas, dia]);

  // Con el pincel activo, qué haría un clic en cada ruta (se muestra en la lista)
  const accionPorRuta = useMemo(() => {
    if (idSlotActivo === null) return null;
    return new globalThis.Map(
      rutas.map((r) => [r.id, accionDelPincel(visitas, { idSlot: idSlotActivo, dia, idRuta: r.id, frecuencia }).tipo])
    );
  }, [idSlotActivo, rutas, visitas, dia, frecuencia]);

  const alElegirRuta = (idRuta: number | null) => {
    if (idRuta !== null && edicion && idSlotActivo !== null) {
      setSeleccionId(null);
      void pintar(idRuta, { idSlot: idSlotActivo, dia, frecuencia });
      return;
    }
    setSeleccionId(idRuta);
  };

  if (slots.length === 0) {
    return <p className="text-sm text-gray-500">Todavía no hay slots para planificar.</p>;
  }

  const elegida = rutas.find((r) => r.id === seleccionId) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="space-y-4 lg:w-80 lg:shrink-0">
        <SelectorPincel
          slots={slots}
          rutasPorSlot={rutasPorSlot}
          idSlotActivo={idSlotActivo}
          onSlot={setSlotElegido}
          dia={dia}
          onDia={setDia}
          frecuencia={frecuencia}
          onFrecuencia={setFrecuencia}
          soloLectura={soloLectura}
        />
        {elegida && (
          <FichaRuta
            ruta={elegida}
            slots={slots}
            visitas={visitas.filter((v) => v.id_ruta === elegida.id)}
            duplicada={propiedadesPorId.get(elegida.id)?.duplicada ?? false}
            edicion={
              edicion && {
                deshabilitado: edicion.deshabilitado,
                onCambiarFrecuencia: (id, f) => void edicion.cambiarFrecuencia(id, f),
                onQuitar: (v) => void edicion.quitar(v),
              }
            }
            onCerrar={() => setSeleccionId(null)}
          />
        )}
        <ListaRutasPlanificacion
          rutas={rutas}
          propiedades={propiedadesPorId}
          descripciones={descripciones}
          accionPorRuta={accionPorRuta}
          seleccionId={seleccionId}
          onElegir={alElegirRuta}
        />
      </div>

      {/* El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7) */}
      <div className={cn('relative isolate min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100', claseAltura)}>
        {mapa ? (
          <MapaPlanificacion
            rutas={rutas}
            contornos={mapa.contornos}
            propiedades={propiedades}
            descripciones={descripciones}
            seleccionId={seleccionId}
            onClickRuta={alElegirRuta}
          />
        ) : (
          <p className="p-4 text-sm text-gray-500">{error ?? (cargando ? 'Cargando el mapa...' : 'Sin datos del mapa.')}</p>
        )}
        {aviso && <AvisoPincel aviso={aviso} onDeshacer={() => void deshacer()} />}
        {mapa && rutas.length === 0 && (
          <p className="absolute inset-x-2 top-2 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs text-gray-600 shadow">
            Estas zonas todavía no tienen rutas con polígono.
          </p>
        )}
      </div>
    </div>
  );
}
