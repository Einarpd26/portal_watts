"use client";

import { useMemo, useState } from 'react';
import { MapaPlanificacion } from './MapaPlanificacion';
import ListaRutasPlanificacion from './ListaRutasPlanificacion';
import FichaRuta from './FichaRuta';
import SelectorDia from './SelectorDia';
import LeyendaPlegable from './LeyendaPlegable';
import { filasDe, type ConteoDeRutas } from './LeyendaMapa';
import { BotonAlternarVista, type VistaMovil } from '@/components/mapa/BotonAlternarVista';
import { BotonPantallaCompleta } from '@/components/mapa/BotonPantallaCompleta';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import BotonExportar from '@/components/ui/BotonExportar';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { usePantallaCompleta } from '@/hooks/usePantallaCompleta';
import { cn } from '@/utils/cn';
import { parametrosDePlanificacion, urlDeReporte } from '@/utils/reportes';
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { FILTROS_CONSULTA_INICIALES, filtrarConsulta, opcionesDeConsulta, type FiltrosConsulta } from '@/utils/consultaPlanificacion';
import { descripcionDeVisita, propiedadesDeRutas } from '@/utils/planificacionMapa';
import type { ConsultaPlanificacion } from '@/types';

interface VistaConsultaPlanificacionProps {
  consulta: ConsultaPlanificacion;
}

const nulo = (valor: string) => (valor === '' ? null : Number(valor));

const opcionesDe = (todos: string, pares: Array<[number, string]>) => [
  { valor: '', texto: todos },
  ...pares.map(([id, nombre]) => ({ valor: String(id), texto: nombre })),
];

/**
 * Consulta de la planificación de todo el alcance del usuario (CU-10), en solo lectura, con la misma estructura de
 * la planificación del supervisor: una tarjeta que llena la ventana con la columna de filtros (sucursal, zona,
 * supervisor, vendedor, ruta y día) y la lista de rutas, la ficha de la ruta elegida y el mapa con el estado de cada
 * ruta (las duplicadas con trazo naranja, RN-04). En el celular, una barra superior, la lista aparte y la ficha como
 * hoja inferior.
 */
export default function VistaConsultaPlanificacion({ consulta }: VistaConsultaPlanificacionProps) {
  const [filtros, setFiltros] = useState<FiltrosConsulta>(FILTROS_CONSULTA_INICIALES);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  // Pantalla completa: la columna del mapa (en el celular, toda la tarjeta, para conservar la hoja inferior)
  const { ref: columnaMapaRef, activa: pantallaCompleta, alternar: alternarPantallaCompleta } = usePantallaCompleta<HTMLDivElement>();

  const opciones = useMemo(() => opcionesDeConsulta(consulta.rutas, consulta.slots), [consulta.rutas, consulta.slots]);
  const { rutas, visitas } = useMemo(
    () => filtrarConsulta(consulta.rutas, consulta.slots, consulta.visitas, filtros),
    [consulta.rutas, consulta.slots, consulta.visitas, filtros]
  );

  // Los límites de zona que se dibujan son los de las zonas con rutas a la vista: al filtrar, el resto desaparece del mapa
  const contornos = useMemo(() => {
    const zonas = new Set(rutas.map((r) => r.id_zona));
    return consulta.contornos.filter((c) => zonas.has(c.id_zona));
  }, [rutas, consulta.contornos]);

  const propiedades = useMemo(
    () => propiedadesDeRutas(rutas, visitas, consulta.slots, { modo: 'planificacion', dia: filtros.dia }),
    [rutas, visitas, consulta.slots, filtros.dia]
  );
  const propiedadesPorId = useMemo(() => new globalThis.Map(propiedades.map((p) => [p.id, p])), [propiedades]);

  // Quién visita, no el número de slot: la ficha y la lista nombran al vendedor
  const slotsPorVendedor = useMemo(() => consulta.slots.map((s) => ({ ...s, nombre: s.vendedor_nombre ?? 'Slot sin vendedor' })), [consulta.slots]);

  // «Lun · Moreno, Ana · semanal» por ruta, en el orden de la semana
  const descripciones = useMemo(() => {
    const quien = new globalThis.Map(slotsPorVendedor.map((s) => [s.id, s.nombre]));
    const porRuta = new globalThis.Map<number, string[]>();
    const ordenadas = [...visitas].sort((a, b) => DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia));
    for (const v of ordenadas) {
      porRuta.set(v.id_ruta, [...(porRuta.get(v.id_ruta) ?? []), descripcionDeVisita(v, quien.get(v.id_slot) ?? 'Slot eliminado')]);
    }
    return porRuta;
  }, [visitas, slotsPorVendedor]);

  const conteo = useMemo<ConteoDeRutas>(
    () => ({
      delDia: propiedades.filter((p) => p.estado === 'del_dia').length,
      otroDia: propiedades.filter((p) => p.estado === 'otro_dia').length,
      sinPlanificar: propiedades.filter((p) => p.estado === 'sin_planificar').length,
      duplicadas: propiedades.filter((p) => p.duplicada).length,
    }),
    [propiedades]
  );

  const cambiar = (cambio: Partial<FiltrosConsulta>) => {
    const siguientes = { ...filtros, ...cambio };
    setFiltros(siguientes);
    // Una selección que el filtro oculta deja de tener sentido
    if (seleccionId !== null && !filtrarConsulta(consulta.rutas, consulta.slots, consulta.visitas, siguientes).rutas.some((r) => r.id === seleccionId)) {
      setSeleccionId(null);
    }
  };

  if (consulta.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No hay rutas a tu alcance para consultar.</p>;
  }

  const elegida = rutas.find((r) => r.id === seleccionId) ?? null;
  const rutasParaElegir = [...consulta.rutas].sort((a, b) => a.ruta.localeCompare(b.ruta)).map((r): [number, string] => [r.id, r.ruta]);

  const selectorSucursal =
    opciones.sucursales.length > 1 ? (
      <SelectorCompacto etiqueta="Sucursal" valor={filtros.idSucursal === null ? '' : String(filtros.idSucursal)} onCambiar={(v) => cambiar({ idSucursal: nulo(v) })} opciones={opcionesDe('Todas las sucursales', opciones.sucursales)} />
    ) : null;
  const selectorZona = <SelectorCompacto buscable etiqueta="Zona" valor={filtros.idZona === null ? '' : String(filtros.idZona)} onCambiar={(v) => cambiar({ idZona: nulo(v) })} opciones={opcionesDe('Todas las zonas', opciones.zonas)} />;
  // Con un solo supervisor a la vista (p. ej. un Fiscalizador cuya sucursal tiene uno solo) el filtro no aporta nada
  const selectorSupervisor =
    opciones.supervisores.length > 1 ? (
      <SelectorCompacto buscable etiqueta="Supervisor" valor={filtros.idSupervisor === null ? '' : String(filtros.idSupervisor)} onCambiar={(v) => cambiar({ idSupervisor: nulo(v) })} opciones={opcionesDe('Todos los supervisores', opciones.supervisores)} />
    ) : null;
  const selectorVendedor = (
    <SelectorCompacto buscable etiqueta="Vendedor" valor={filtros.idVendedor === null ? '' : String(filtros.idVendedor)} onCambiar={(v) => cambiar({ idVendedor: nulo(v) })} opciones={opcionesDe('Todos los vendedores', opciones.vendedores)} />
  );
  const selectorRuta = <SelectorCompacto buscable etiqueta="Ruta" valor={filtros.idRuta === null ? '' : String(filtros.idRuta)} onCambiar={(v) => cambiar({ idRuta: nulo(v) })} opciones={opcionesDe('Todas las rutas', rutasParaElegir)} />;
  const selectorDia = <SelectorDia modo="cobertura" dia={filtros.dia} onDia={(dia) => cambiar({ dia })} />;

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
  const cuenta = (
    <p className="text-xs text-gray-400">
      {rutas.length} de {consulta.rutas.length} {consulta.rutas.length === 1 ? 'ruta' : 'rutas'}
    </p>
  );
  const exportar = <BotonExportar href={urlDeReporte('planificacion', parametrosDePlanificacion(filtros))} />;
  const ficha = (variante: 'panel' | 'hoja') =>
    elegida && (
      <FichaRuta
        key={elegida.id}
        variante={variante}
        ruta={elegida}
        slots={slotsPorVendedor}
        visitas={visitas.filter((v) => v.id_ruta === elegida.id)}
        duplicada={propiedadesPorId.get(elegida.id)?.duplicada ?? false}
        edicion={null}
        asignar={null}
        onCerrar={() => setSeleccionId(null)}
      />
    );

  const mapaConControles = (
    <div className="relative isolate min-h-0 min-w-0 flex-1 overflow-hidden bg-gray-100">
      <MapaPlanificacion rutas={rutas} contornos={contornos} propiedades={propiedades} descripciones={descripciones} seleccionId={seleccionId} encuadrarSoloRutas onClickRuta={setSeleccionId} />
      <LeyendaPlegable titulo="Planificación" filas={filasDe('planificacion', conteo, filtros.dia && `el ${DIA_LABELS[filtros.dia].toLowerCase()}`)} />
      <BotonPantallaCompleta activa={pantallaCompleta} onClick={alternarPantallaCompleta} />
    </div>
  );

  // El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7)
  const claseTarjeta = 'relative isolate flex min-h-96 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white';

  if (escritorio) {
    return (
      <div className={claseTarjeta}>
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="shrink-0 space-y-3 border-b border-gray-200 bg-gray-50 px-3 py-3">
            <div className="flex flex-col gap-2">
              {selectorSucursal}
              {selectorZona}
              {selectorSupervisor}
              {selectorVendedor}
              {selectorRuta}
            </div>
            {selectorDia}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
            {cuenta}
            {lista(undefined, true)}
          </div>
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2">{exportar}</div>
        </aside>
        {ficha('panel')}
        <div ref={columnaMapaRef} className="flex min-w-0 flex-1 flex-col bg-white">
          {mapaConControles}
        </div>
      </div>
    );
  }

  const opcionesDia = [{ valor: '', texto: 'Toda la semana' }, ...DIAS_ORDEN.map((d) => ({ valor: d, texto: DIA_LABELS[d] }))];

  return (
    <div ref={columnaMapaRef} className={cn(claseTarjeta, 'flex-col')}>
      {!pantallaCompleta && (
        <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
          <div className="flex items-center gap-2">
            <SelectorCompacto etiqueta="Día" valor={filtros.dia ?? ''} onCambiar={(v) => cambiar({ dia: v === '' ? null : (v as DiaKey) })} opciones={opcionesDia} />
            <BotonAlternarVista vista={vistaMovil} onAlternar={() => setVistaMovil((v) => (v === 'mapa' ? 'lista' : 'mapa'))} etiquetaLista="Ver la lista de rutas" />
          </div>
          <div className="flex gap-2">{selectorVendedor}</div>
        </div>
      )}

      {vistaMovil === 'lista' && !pantallaCompleta ? (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          <div className="flex flex-col gap-2">
            {selectorSucursal}
            {selectorZona}
            {selectorSupervisor}
            {selectorRuta}
          </div>
          {cuenta}
          {lista('max-h-none')}
          {exportar}
        </div>
      ) : (
        mapaConControles
      )}

      {ficha('hoja')}
    </div>
  );
}
