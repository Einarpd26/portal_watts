"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useCallback, useMemo, useState } from 'react';
import { MapaPlanificacion } from './MapaPlanificacion';
import SelectorDia from './SelectorDia';
import ListaRutasPlanificacion from './ListaRutasPlanificacion';
import FichaRuta from './FichaRuta';
import AvisoAsignacion from './AvisoAsignacion';
import ConmutadorModoMapa from './ConmutadorModoMapa';
import LeyendaPlegable from './LeyendaPlegable';
import { filasDe, type ConteoDeRutas, type Fila } from './LeyendaMapa';
import { BotonAlternarVista, type VistaMovil } from '@/components/mapa/BotonAlternarVista';
import { BotonPantallaCompleta } from '@/components/mapa/BotonPantallaCompleta';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { usePantallaCompleta } from '@/hooks/usePantallaCompleta';
import { useAsignacionEnMapa, type EdicionDelMapa } from '@/hooks/useAsignacionEnMapa';
import { cn } from '@/utils/cn';
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { colorDeSlot, descripcionDeVisita, etiquetaDeSlot, existeVisita, propiedadesDeRutas, type ModoMapa } from '@/utils/planificacionMapa';
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
 * Planificación sobre el mapa (ADR-004), con la estructura de la planificación de rutas de la otra aplicación de la
 * empresa. Columna lateral con el modo, el día y la lista de rutas; al elegir una ruta se abre su ficha, y desde ella
 * se la asigna a un slot con una frecuencia. En modo Planificación el color dice el estado de cada ruta; en modo
 * Cobertura dice qué slot la cubre y no se edita (D3). Quien no puede editar solo ve Cobertura (D5). Comparte slots
 * y visitas con el calendario, así que lo que se asigna aquí aparece allí.
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
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  // Pantalla completa: la columna del mapa (en el celular, toda la tarjeta, para conservar la hoja inferior)
  const { ref: columnaMapaRef, activa: pantallaCompleta, alternar: alternarPantallaCompleta } = usePantallaCompleta<HTMLDivElement>();

  const soloLectura = edicion === null;
  const modo: ModoMapa = soloLectura ? 'cobertura' : modoElegido;
  const dia = modo === 'cobertura' ? diaCobertura : diaPlanificacion;

  const nombresDeSlot = useMemo(() => new globalThis.Map(slots.map((s, i) => [s.id, etiquetaDeSlot(s, i)])), [slots]);
  const nombreDeSlot = useCallback((idSlot: number) => nombresDeSlot.get(idSlot) ?? 'Slot eliminado', [nombresDeSlot]);
  const { aviso, asignar, deshacer } = useAsignacionEnMapa(visitas, nombreDeSlot, edicion);

  const rutas = useMemo(() => mapa?.rutas ?? [], [mapa]);
  const propiedades = useMemo(() => propiedadesDeRutas(rutas, visitas, slots, { modo, dia }), [rutas, visitas, slots, modo, dia]);
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

  if (slots.length === 0) {
    return <p className="text-sm text-gray-500">Todavía no hay slots para planificar.</p>;
  }

  const elegida = rutas.find((r) => r.id === seleccionId) ?? null;
  const alElegirDia = modo === 'cobertura' ? setDiaCobertura : (d: DiaKey | null) => d && setDiaPlanificacion(d);

  // Leyenda plegable sobre el mapa: en Cobertura, además de lo sin cubrir y lo duplicado, lleva a cada slot con su color
  const filasDeLeyenda: Fila[] = [
    ...(modo === 'cobertura'
      ? slots.map((s, i) => ({ etiqueta: `${etiquetaDeSlot(s, i)} · ${s.vendedor_nombre ?? 'Sin vendedor'}`, color: colorDeSlot(i), cantidad: rutasPorSlot.get(s.id) ?? 0 }))
      : []),
    ...filasDe(modo, conteo, dia && `el ${DIA_LABELS[dia].toLowerCase()}`),
  ];

  const conmutadorModo = soloLectura ? null : <ConmutadorModoMapa modo={modo} onCambiar={setModoElegido} />;
  const selectorDia = <SelectorDia modo={modo} dia={dia} onDia={alElegirDia} />;
  const lista = (claseAltura?: string, llenaLaColumna = false) => (
    <ListaRutasPlanificacion
      rutas={rutas}
      propiedades={propiedadesPorId}
      descripciones={descripciones}
      seleccionId={seleccionId}
      onElegir={setSeleccionId}
      claseAltura={claseAltura}
      llenaLaColumna={llenaLaColumna}
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
        asignar={
          edicion && modo === 'planificacion'
            ? {
                dia: diaPlanificacion,
                deshabilitado: edicion.deshabilitado,
                existe: (idSlot, frecuencia) => existeVisita(visitas, { idSlot, dia: diaPlanificacion, idRuta: elegida.id, frecuencia }),
                onAsignar: (idSlot, frecuencia) => asignar(elegida.id, { idSlot, dia: diaPlanificacion, frecuencia }),
              }
            : null
        }
        onCerrar={() => setSeleccionId(null)}
      />
    );

  const mapaConControles = (
    <div className="relative isolate min-h-0 min-w-0 flex-1 overflow-hidden bg-gray-100">
      {mapa ? (
        <MapaPlanificacion
          rutas={rutas}
          contornos={mapa.contornos}
          propiedades={propiedades}
          descripciones={descripciones}
          seleccionId={seleccionId}
          onClickRuta={setSeleccionId}
        />
      ) : (
        cargando && !error ? (
        <PageLoader className="min-h-0 flex-1" />
      ) : (
        <p className="p-4 text-sm text-gray-500">{error ?? 'Sin datos del mapa.'}</p>
      )
      )}
      <LeyendaPlegable titulo={modo === 'planificacion' ? 'Planificación' : 'Cobertura'} filas={filasDeLeyenda} />
      {aviso && <AvisoAsignacion aviso={aviso} onDeshacer={() => void deshacer()} />}
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
          <div className="shrink-0 space-y-3 border-b border-gray-200 bg-gray-50 px-3 py-3">
            {conmutadorModo}
            {selectorDia}
          </div>
          <div className="flex min-h-0 flex-1 flex-col px-3 py-3">{lista(undefined, true)}</div>
        </aside>
        {/* La ficha de la ruta elegida se abre junto a la lista: ahí se la asigna a un slot */}
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
