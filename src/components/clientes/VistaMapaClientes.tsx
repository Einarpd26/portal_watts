"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapaClientes } from './MapaClientes';
import BotonExportar from '@/components/ui/BotonExportar';
import FichaCliente from './FichaCliente';
import { InterruptoresClase } from './InterruptoresClase';
import ListaClientes from './ListaClientes';
import { ResumenRuta } from './ResumenRuta';
import { SelectorRuta } from './SelectorRuta';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { logger } from '@/lib/logger';
import { parametrosDeClientes, urlDeReporte } from '@/utils/reportes';
import { FILTROS_INICIALES, conteoPorClase, filtrarClientes, tieneUbicacion, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { MapaClientes as DatosMapa } from '@/types';

type VistaMovil = 'mapa' | 'lista';

interface VistaMapaClientesProps {
  mapa: DatosMapa;
  /** Ruta con la que se abre el mapa (p. ej. desde la cobertura); ignorada si no está en el alcance */
  idRutaInicial?: number | null;
}

/**
 * Mapa de clientes (CU-12, ADR-005), con la misma estructura que la consulta de rutas de la otra aplicación de la
 * empresa. En el escritorio: una columna con la ruta, la lista con su buscador, el resumen y la descarga; la ficha
 * como panel; y el mapa. En el celular: una barra superior con la ruta y un botón que alterna Lista y Mapa, y abajo
 * una hoja que es el resumen y, al elegir un cliente, su ficha. Es de solo lectura.
 */
export default function VistaMapaClientes({ mapa, idRutaInicial = null }: VistaMapaClientesProps) {
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_INICIALES,
    idRuta: idRutaInicial !== null && mapa.rutas.some((r) => r.id === idRutaInicial) ? idRutaInicial : null,
  }));
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');

  // Pantalla completa: la columna del mapa, con la hoja inferior dentro (en el celular la barra superior se oculta)
  const columnaMapaRef = useRef<HTMLDivElement>(null);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);
  const alternarPantallaCompleta = () => {
    const accion = document.fullscreenElement ? document.exitFullscreen() : columnaMapaRef.current?.requestFullscreen();
    accion?.catch((err: unknown) => logger.error('No se pudo cambiar la pantalla completa:', err));
  };

  const rutas = useMemo(() => [...mapa.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [mapa.rutas]);

  // El resumen cuenta los clientes de la ruta elegida, sin mirar los otros filtros: así se ve qué se está ocultando
  const delAmbito = useMemo(() => filtrarClientes(mapa.clientes, { ...FILTROS_INICIALES, idRuta: filtros.idRuta }), [mapa.clientes, filtros.idRuta]);
  const conteo = useMemo(() => conteoPorClase(delAmbito), [delAmbito]);
  const visibles = useMemo(() => filtrarClientes(mapa.clientes, filtros), [mapa.clientes, filtros]);

  const sinUbicacion = delAmbito.filter((c) => !tieneUbicacion(c)).length;
  const elegido = mapa.clientes.find((c) => c.id === seleccionId) ?? null;
  const rutaDelElegido = elegido ? mapa.rutas.find((r) => r.id === elegido.id_ruta) : undefined;

  if (mapa.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No tienes rutas con clientes para consultar.</p>;
  }

  const cambiarFiltros = (f: Filtros) => {
    setFiltros(f);
    // Una selección que el filtro oculta deja de tener sentido
    if (elegido && filtrarClientes([elegido], f).length === 0) setSeleccionId(null);
  };
  const verEnMapa = (idCliente: number) => {
    setSeleccionId(idCliente);
    setVistaMovil('mapa');
  };

  const lista = (
    <ListaClientes
      clientes={visibles}
      seleccionId={seleccionId}
      onElegir={setSeleccionId}
      onVerEnMapa={verEnMapa}
      texto={filtros.texto}
      onTexto={(texto) => cambiarFiltros({ ...filtros, texto })}
      filtros={<InterruptoresClase filtros={filtros} onCambiar={cambiarFiltros} haySinClase={conteo.sinClase > 0} />}
    />
  );
  const exportar = <BotonExportar href={urlDeReporte('clientes', parametrosDeClientes(filtros))} etiqueta="Exportar clientes a Excel" />;

  const mapaConControles = (
    <div className="relative min-h-0 min-w-0 flex-1">
      <MapaClientes
        rutas={mapa.rutas}
        contornos={mapa.contornos}
        clientes={visibles}
        idRutaEnfoque={filtros.idRuta}
        seleccionId={seleccionId}
        onElegir={setSeleccionId}
      />
      <button
        type="button"
        onClick={alternarPantallaCompleta}
        aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
        className="absolute bottom-8 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:text-gray-800"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {pantallaCompleta ? (
            <>
              <path d="M8 3v3a2 2 0 0 1-2 2H3" />
              <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
              <path d="M3 16h3a2 2 0 0 1 2 2v3" />
              <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </>
          ) : (
            <>
              <path d="M3 8V5a2 2 0 0 1 2-2h3" />
              <path d="M16 3h3a2 2 0 0 1 2 2v3" />
              <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
              <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );

  // El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7)
  if (escritorio) {
    return (
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="flex shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-3">
            <SelectorRuta rutas={rutas} idRuta={filtros.idRuta} onCambiar={(idRuta) => cambiarFiltros({ ...filtros, idRuta })} />
          </div>
          {lista}
          <ResumenRuta total={delAmbito.length} conteo={conteo} sinUbicacion={sinUbicacion} />
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2">{exportar}</div>
        </aside>
        {elegido && <FichaCliente key={elegido.id} variante="panel" cliente={elegido} ruta={rutaDelElegido} onCerrar={() => setSeleccionId(null)} />}
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
          <SelectorRuta rutas={rutas} idRuta={filtros.idRuta} onCambiar={(idRuta) => cambiarFiltros({ ...filtros, idRuta })} />
          <button
            type="button"
            onClick={() => setVistaMovil((v) => (v === 'mapa' ? 'lista' : 'mapa'))}
            aria-label={vistaMovil === 'mapa' ? 'Ver la lista de clientes' : 'Ver el mapa'}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              {vistaMovil === 'mapa' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-8.25L6 9m3-2.25 3 2.25M3 17.25V6.75L9 3l6 3.75L21 3v10.5l-6 3.75-6-3.75Z" />
              )}
            </svg>
            {vistaMovil === 'mapa' ? 'Lista' : 'Mapa'}
          </button>
        </div>
      )}

      {vistaMovil === 'lista' && !pantallaCompleta ? <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{lista}</div> : mapaConControles}

      {elegido ? (
        <FichaCliente key={elegido.id} variante="hoja" cliente={elegido} ruta={rutaDelElegido} onCerrar={() => setSeleccionId(null)} />
      ) : (
        <ResumenRuta total={delAmbito.length} conteo={conteo} sinUbicacion={sinUbicacion} accion={exportar} />
      )}
    </div>
  );
}
