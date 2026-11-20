"use client";

import { useCallback, useMemo, useState } from 'react';
import { MapaPlanificacion } from './MapaPlanificacion';
import SelectorPincel from './SelectorPincel';
import ListaRutasPlanificacion from './ListaRutasPlanificacion';
import FichaRuta from './FichaRuta';
import AvisoPincel from './AvisoPincel';
import ConmutadorModoMapa from './ConmutadorModoMapa';
import LeyendaPlegable from './LeyendaPlegable';
import type { ConteoDeRutas } from './LeyendaMapa';
import { BotonAlternarVista, type VistaMovil } from '@/components/mapa/BotonAlternarVista';
import { BotonPantallaCompleta } from '@/components/mapa/BotonPantallaCompleta';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { usePantallaCompleta } from '@/hooks/usePantallaCompleta';
import { usePincelPlanificacion, type EdicionDelMapa } from '@/hooks/usePincelPlanificacion';
import { cn } from '@/utils/cn';
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { FRECUENCIAS, FRECUENCIA_LABELS } from '@/utils/frecuencias';
import {
  accionDelPincel,
  descripcionDeVisita,
  etiquetaDeSlot,
  propiedadesDeRutas,
  type ModoMapa,
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
  /** Clases de Tailwind con la altura de la tarjeta; sin ellas llena el alto que le deja la pantalla */
  claseAltura?: string;
}

/**
 * Planificación sobre el mapa (ADR-004): columna con modo, día, slots, frecuencia, leyenda y lista de rutas, y el
 * mapa. En modo Planificación se pinta con el pincel y el color dice el estado de cada ruta; en modo Cobertura el
 * color dice qué slot la cubre y no se edita (D3). Quien no puede editar solo ve Cobertura (D5). Comparte slots y
 * visitas con el calendario, así que lo que se pinta aquí aparece allí.
 */
export default function VistaMapaPlanificacion({
  slots,
  visitas,
  mapa,
  cargando,
  error,
  edicion,
  claseAltura,
}: VistaMapaPlanificacionProps) {
  const [modoElegido, setModoElegido] = useState<ModoMapa>('planificacion');
  // Cada modo recuerda su día: Planificación necesita uno, Cobertura se abre con toda la semana
  const [diaPlanificacion, setDiaPlanificacion] = useState<DiaKey>(DIAS_ORDEN[0]);
  const [diaCobertura, setDiaCobertura] = useState<DiaKey | null>(null);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('semanal');
  const [slotElegido, setSlotElegido] = useState<number | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  // Pantalla completa: la columna del mapa (en el celular, toda la tarjeta, para conservar la hoja inferior)
  const { ref: columnaMapaRef, activa: pantallaCompleta, alternar: alternarPantallaCompleta } = usePantallaCompleta<HTMLDivElement>();

  const soloLectura = edicion === null;
  const modo: ModoMapa = soloLectura ? 'cobertura' : modoElegido;
  const dia = modo === 'cobertura' ? diaCobertura : diaPlanificacion;
  // El pincel solo existe en Planificación; si el slot elegido se eliminó en el calendario, se apaga solo
  const idSlotActivo = modo === 'planificacion' && slots.some((s) => s.id === slotElegido) ? slotElegido : null;
  // Con el pincel activo el día es siempre uno concreto: «Todos» solo existe en Cobertura
  const diaDelPincel = idSlotActivo !== null ? diaPlanificacion : null;

  const nombresDeSlot = useMemo(() => new globalThis.Map(slots.map((s, i) => [s.id, etiquetaDeSlot(s, i)])), [slots]);
  const nombreDeSlot = useCallback((idSlot: number) => nombresDeSlot.get(idSlot) ?? 'Slot eliminado', [nombresDeSlot]);
  const { aviso, pintar, deshacer } = usePincelPlanificacion(visitas, nombreDeSlot, edicion);

  const rutas = useMemo(() => mapa?.rutas ?? [], [mapa]);
  const propiedades = useMemo(
    () => propiedadesDeRutas(rutas, visitas, slots, { modo, dia, idSlotPincel: idSlotActivo }),
    [rutas, visitas, slots, modo, dia, idSlotActivo]
  );
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

  // Rutas distintas que cada slot cubre en la selección de día (una ruta puede repetirse en varios días)
  const rutasPorSlot = useMemo(() => {
    const porSlot = new globalThis.Map<number, Set<number>>();
    for (const v of visitas) {
      if (dia !== null && v.dia !== dia) continue;
      porSlot.set(v.id_slot, (porSlot.get(v.id_slot) ?? new Set<number>()).add(v.id_ruta));
    }
    return new globalThis.Map([...porSlot].map(([idSlot, ids]) => [idSlot, ids.size]));
  }, [visitas, dia]);

  const conteo = useMemo<ConteoDeRutas>(
    () => ({
      delDia: propiedades.filter((p) => p.estado === 'del_dia').length,
      otroDia: propiedades.filter((p) => p.estado === 'otro_dia').length,
      sinPlanificar: propiedades.filter((p) => p.estado === 'sin_planificar').length,
      duplicadas: propiedades.filter((p) => p.duplicada).length,
    }),
    [propiedades]
  );

  // Con el pincel activo, qué haría un clic en cada ruta (se muestra en la lista)
  const accionPorRuta = useMemo(() => {
    if (idSlotActivo === null || diaDelPincel === null) return null;
    return new globalThis.Map(
      rutas.map((r) => [r.id, accionDelPincel(visitas, { idSlot: idSlotActivo, dia: diaDelPincel, idRuta: r.id, frecuencia }).tipo])
    );
  }, [idSlotActivo, diaDelPincel, rutas, visitas, frecuencia]);

  const alElegirRuta = (idRuta: number | null) => {
    if (idRuta !== null && edicion && idSlotActivo !== null && diaDelPincel !== null) {
      setSeleccionId(null);
      void pintar(idRuta, { idSlot: idSlotActivo, dia: diaDelPincel, frecuencia });
      return;
    }
    setSeleccionId(idRuta);
  };

  if (slots.length === 0) {
    return <p className="text-sm text-gray-500">Todavía no hay slots para planificar.</p>;
  }

  const elegida = rutas.find((r) => r.id === seleccionId) ?? null;
  const alElegirDia = modo === 'cobertura' ? setDiaCobertura : (d: DiaKey | null) => d && setDiaPlanificacion(d);

  const conmutadorModo = soloLectura ? null : <ConmutadorModoMapa modo={modo} onCambiar={setModoElegido} />;
  const selectorPincel = (
    <SelectorPincel
      slots={slots}
      rutasPorSlot={rutasPorSlot}
      modo={modo}
      idSlotActivo={idSlotActivo}
      onSlot={setSlotElegido}
      dia={dia}
      onDia={alElegirDia}
      frecuencia={frecuencia}
      onFrecuencia={setFrecuencia}
    />
  );
  const lista = (claseAltura?: string) => (
    <ListaRutasPlanificacion
      rutas={rutas}
      propiedades={propiedadesPorId}
      descripciones={descripciones}
      accionPorRuta={accionPorRuta}
      seleccionId={seleccionId}
      onElegir={alElegirRuta}
      claseAltura={claseAltura}
    />
  );
  const ficha = (variante: 'panel' | 'hoja') =>
    elegida && (
      <FichaRuta
        key={elegida.id}
        variante={variante}
        ruta={elegida}
        slots={slots}
        visitas={visitas.filter((v) => v.id_ruta === elegida.id)}
        duplicada={propiedadesPorId.get(elegida.id)?.duplicada ?? false}
        edicion={
          edicion && modo === 'planificacion'
            ? {
                deshabilitado: edicion.deshabilitado,
                onCambiarFrecuencia: (id, f) => void edicion.cambiarFrecuencia(id, f),
                onQuitar: (v) => void edicion.quitar(v),
              }
            : null
        }
        onCerrar={() => setSeleccionId(null)}
      />
    );

  const mapaConControles = (
    <div className="relative min-h-0 min-w-0 flex-1 bg-gray-100">
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
      <LeyendaPlegable modo={modo} conteo={conteo} diaActivo={dia && `el ${DIA_LABELS[dia].toLowerCase()}`} />
      {aviso && <AvisoPincel aviso={aviso} onDeshacer={() => void deshacer()} />}
      {mapa && rutas.length === 0 && (
        <p className="absolute inset-x-2 top-14 z-10 rounded-lg bg-white/95 px-3 py-2 text-xs text-gray-600 shadow">Estas zonas todavía no tienen rutas con polígono.</p>
      )}
      <BotonPantallaCompleta activa={pantallaCompleta} onClick={alternarPantallaCompleta} />
    </div>
  );

  // El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7)
  const claseTarjeta = cn('relative isolate flex overflow-hidden rounded-xl border border-gray-200 bg-white', claseAltura ?? 'min-h-96 flex-1');

  if (escritorio) {
    return (
      <div className={claseTarjeta}>
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          {conmutadorModo && <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-3">{conmutadorModo}</div>}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
            {selectorPincel}
            {lista('max-h-none')}
          </div>
        </aside>
        {ficha('panel')}
        <div ref={columnaMapaRef} className="flex min-w-0 flex-1 flex-col bg-white">
          {mapaConControles}
        </div>
      </div>
    );
  }

  const opcionesDia = [
    ...(modo === 'cobertura' ? [{ valor: '', texto: 'Toda la semana' }] : []),
    ...DIAS_ORDEN.map((d) => ({ valor: d, texto: DIA_LABELS[d] })),
  ];
  const opcionesSlot = [{ valor: '', texto: 'Sin pincel' }, ...slots.map((sl, i) => ({ valor: String(sl.id), texto: etiquetaDeSlot(sl, i) }))];

  return (
    <div ref={columnaMapaRef} className={cn(claseTarjeta, 'flex-col')}>
      {!pantallaCompleta && (
        <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
          <div className="flex items-center gap-2">
            {conmutadorModo && <div className="min-w-0 flex-1">{conmutadorModo}</div>}
            <BotonAlternarVista vista={vistaMovil} onAlternar={() => setVistaMovil((v) => (v === 'mapa' ? 'lista' : 'mapa'))} etiquetaLista="Ver la lista de rutas" />
          </div>
          <div className="flex gap-2">
            <SelectorCompacto etiqueta="Día" valor={dia ?? ''} onCambiar={(v) => alElegirDia(v === '' ? null : (v as DiaKey))} opciones={opcionesDia} />
            {modo === 'planificacion' && (
              <>
                <SelectorCompacto etiqueta="Slot del pincel" valor={idSlotActivo === null ? '' : String(idSlotActivo)} onCambiar={(v) => setSlotElegido(v === '' ? null : Number(v))} opciones={opcionesSlot} />
                <SelectorCompacto
                  etiqueta="Frecuencia"
                  valor={frecuencia}
                  onCambiar={(v) => setFrecuencia(v as Frecuencia)}
                  opciones={FRECUENCIAS.map((f) => ({ valor: f, texto: FRECUENCIA_LABELS[f] }))}
                />
              </>
            )}
          </div>
        </div>
      )}

      {vistaMovil === 'lista' && !pantallaCompleta ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{lista('max-h-none')}</div>
      ) : (
        mapaConControles
      )}

      {ficha('hoja')}
    </div>
  );
}
