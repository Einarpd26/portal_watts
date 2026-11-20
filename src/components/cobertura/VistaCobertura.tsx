"use client";

import { useMemo, useState } from 'react';
import { MapaCobertura } from './MapaCobertura';
import ListaRutasCobertura from './ListaRutasCobertura';
import FichaRuta from './FichaRuta';
import { ResumenDeCobertura } from './ResumenDeCobertura';
import BotonExportar from '@/components/ui/BotonExportar';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import { BotonAlternarVista, type VistaMovil } from '@/components/mapa/BotonAlternarVista';
import { BotonPantallaCompleta } from '@/components/mapa/BotonPantallaCompleta';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { cn } from '@/utils/cn';
import { usePantallaCompleta } from '@/hooks/usePantallaCompleta';
import { parametrosDeCobertura, urlDeReporte } from '@/utils/reportes';
import {
  FILTROS_COBERTURA_INICIALES,
  filtrarCobertura,
  momentoDeCalculo,
  nombreDelMes,
  ordenarCobertura,
  resumirCobertura,
  tramoDe,
  type FiltrosCobertura,
  type OrdenCobertura,
  type TramoCobertura,
} from '@/utils/coberturaRutas';
import type { CoberturaListado } from '@/types';

interface VistaCoberturaProps {
  cobertura: CoberturaListado;
}

const ORDENES = [
  { valor: 'menor', texto: 'Menor cobertura primero' },
  { valor: 'mayor', texto: 'Mayor cobertura primero' },
  { valor: 'codigo', texto: 'Por código de ruta' },
] as const;

/**
 * Cobertura de rutas (CU-13, ADR-005 D3), con la misma estructura que el mapa de clientes. En el escritorio: una
 * columna con los filtros, la lista de rutas, el resumen y la descarga; la ficha de la ruta como panel; y el mapa
 * con las rutas pintadas por su porcentaje. En el celular: una barra superior con la zona y un botón que alterna
 * Lista y Mapa, y abajo una hoja que es el resumen y, al elegir una ruta, su ficha. Es de solo lectura.
 */
export default function VistaCobertura({ cobertura }: VistaCoberturaProps) {
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  const [filtros, setFiltros] = useState<FiltrosCobertura>(FILTROS_COBERTURA_INICIALES);
  const [orden, setOrden] = useState<OrdenCobertura>('menor');
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');
  const { ref: columnaMapaRef, activa: pantallaCompleta, alternar: alternarPantallaCompleta } = usePantallaCompleta<HTMLDivElement>();

  const visibles = useMemo(() => ordenarCobertura(filtrarCobertura(cobertura.rutas, filtros), orden), [cobertura.rutas, filtros, orden]);
  const resumen = useMemo(() => resumirCobertura(visibles), [visibles]);
  const rutasPorTramo = useMemo(() => {
    const cuenta: Record<TramoCobertura, number> = { baja: 0, media: 0, alta: 0 };
    for (const r of visibles) cuenta[tramoDe(r.porcentaje)] += 1;
    return cuenta;
  }, [visibles]);

  // Las opciones de cada filtro salen de las rutas del alcance
  const zonas = useMemo(() => [...new Map(cobertura.rutas.map((r) => [r.id_zona, r.codigo_zona])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [cobertura.rutas]);
  const supervisores = useMemo(
    () => [...new Map(cobertura.rutas.flatMap((r) => (r.id_supervisor === null ? [] : [[r.id_supervisor, r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`] as const]))).entries()],
    [cobertura.rutas]
  );
  const rutasParaElegir = useMemo(() => [...cobertura.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [cobertura.rutas]);

  const mes = nombreDelMes(cobertura.mes);
  const momento = momentoDeCalculo(cobertura.calculado_en);
  const elegida = cobertura.rutas.find((r) => r.id === seleccionId) ?? null;

  if (cobertura.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No hay rutas con cobertura calculada para tu alcance.</p>;
  }

  const cambiar = (cambio: Partial<FiltrosCobertura>) => {
    const siguientes = { ...filtros, ...cambio };
    setFiltros(siguientes);
    // Una selección que el filtro oculta deja de tener sentido
    if (seleccionId !== null && filtrarCobertura(cobertura.rutas.filter((r) => r.id === seleccionId), siguientes).length === 0) setSeleccionId(null);
  };
  const verEnMapa = (idRuta: number) => {
    setSeleccionId(idRuta);
    setVistaMovil('mapa');
  };

  const numero = (v: string) => (v === '' ? null : Number(v));
  const selectorZona = (
    <SelectorCompacto
      etiqueta="Zona"
      valor={filtros.idZona === null ? '' : String(filtros.idZona)}
      onCambiar={(v) => cambiar({ idZona: numero(v) })}
      opciones={[{ valor: '', texto: 'Todas las zonas' }, ...zonas.map(([id, codigo]) => ({ valor: String(id), texto: codigo }))]}
    />
  );
  // Con un solo supervisor a la vista (p. ej. un supervisor que consulta sus propias zonas) el filtro no aporta nada
  const selectorSupervisor = supervisores.length <= 1 ? null : (
    <SelectorCompacto
      etiqueta="Supervisor"
      valor={filtros.idSupervisor === null ? '' : String(filtros.idSupervisor)}
      onCambiar={(v) => cambiar({ idSupervisor: numero(v) })}
      opciones={[{ valor: '', texto: 'Todos los supervisores' }, ...supervisores.map(([id, nombre]) => ({ valor: String(id), texto: nombre }))]}
    />
  );
  const selectorRuta = (
    <SelectorCompacto
      etiqueta="Ruta"
      valor={filtros.idRuta === null ? '' : String(filtros.idRuta)}
      onCambiar={(v) => cambiar({ idRuta: numero(v) })}
      opciones={[{ valor: '', texto: 'Todas las rutas' }, ...rutasParaElegir.map((r) => ({ valor: String(r.id), texto: r.codigo_ruta }))]}
    />
  );
  const selectorOrden = <SelectorCompacto etiqueta="Orden" valor={orden} onCambiar={(v) => setOrden(v as OrdenCobertura)} opciones={ORDENES} />;

  const lista = (cabecera?: React.ReactNode) => (
    <ListaRutasCobertura rutas={visibles} seleccionId={seleccionId} onElegir={setSeleccionId} onVerEnMapa={verEnMapa} cabecera={cabecera} />
  );
  const exportar = <BotonExportar href={urlDeReporte('cobertura', parametrosDeCobertura(filtros, orden))} />;
  const resumenDeCobertura = (accion?: React.ReactNode) => <ResumenDeCobertura resumen={resumen} rutasPorTramo={rutasPorTramo} mes={mes} momento={momento} accion={accion} />;
  const ficha = (variante: 'panel' | 'hoja') =>
    elegida && <FichaRuta key={elegida.id} variante={variante} ruta={elegida} mes={cobertura.mes} calculadoEn={cobertura.calculado_en} onCerrar={() => setSeleccionId(null)} />;

  const mapaConControles = (
    <div className="relative min-h-0 min-w-0 flex-1">
      <MapaCobertura rutas={visibles} contornos={cobertura.contornos} seleccionId={seleccionId} onElegir={setSeleccionId} />
      <BotonPantallaCompleta activa={pantallaCompleta} onClick={alternarPantallaCompleta} />
    </div>
  );

  // El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7)
  if (escritorio) {
    return (
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="grid shrink-0 grid-cols-1 gap-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
            {selectorZona}
            {selectorSupervisor}
            {selectorRuta}
            {selectorOrden}
          </div>
          {lista()}
          {resumenDeCobertura()}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2">{exportar}</div>
        </aside>
        {ficha('panel')}
        <div ref={columnaMapaRef} className="flex min-w-0 flex-1 flex-col bg-white">
          {mapaConControles}
        </div>
      </div>
    );
  }

  return (
    <div ref={columnaMapaRef} className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      {!pantallaCompleta && (
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
          {selectorZona}
          <BotonAlternarVista vista={vistaMovil} onAlternar={() => setVistaMovil((v) => (v === 'mapa' ? 'lista' : 'mapa'))} etiquetaLista="Ver la lista de rutas" />
        </div>
      )}

      {vistaMovil === 'lista' && !pantallaCompleta ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {lista(
            <div className={cn('grid gap-2', selectorSupervisor ? 'grid-cols-2' : 'grid-cols-1')}>
              {selectorSupervisor}
              {selectorRuta}
              <div className={cn('flex', selectorSupervisor && 'col-span-2')}>{selectorOrden}</div>
            </div>
          )}
        </div>
      ) : (
        mapaConControles
      )}

      {elegida ? ficha('hoja') : resumenDeCobertura(exportar)}
    </div>
  );
}
