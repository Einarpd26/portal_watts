"use client";

import { useState } from 'react';
import { BotonAlternarVista, type VistaMovil } from './BotonAlternarVista';
import { BotonPantallaCompleta } from './BotonPantallaCompleta';
import { ConmutadorVista, type ModoVista } from './ConmutadorVista';
import { COBERTURA_VACIA, useModoCobertura } from '@/components/cobertura/modoCobertura';
import { useModoClientes } from '@/components/clientes/modoClientes';
import { useCoincideMedia } from '@/hooks/useCoincideMedia';
import { usePantallaCompleta } from '@/hooks/usePantallaCompleta';
import type { CoberturaListado, MapaClientes } from '@/types';

interface VistaMapaProps {
  mapa: MapaClientes;
  /** null si el usuario no consulta la cobertura (el Vendedor): entonces no hay conmutador de modo */
  cobertura: CoberturaListado | null;
  /** Ruta con la que se abre el modo Clientes (p. ej. desde un enlace); ignorada si no está en el alcance */
  idRutaInicial?: number | null;
  modoInicial?: ModoVista;
  /** Se avisa al cambiar de modo (la página lo refleja en la dirección) */
  alCambiarModo?: (modo: ModoVista) => void;
}

/**
 * Mapa de clientes y cobertura de rutas en una sola pantalla (CU-12 y CU-13, ADR-005), con la estructura de la
 * consulta de rutas de la otra aplicación de la empresa. En el escritorio: una columna con el conmutador de modo,
 * los filtros, la lista, el resumen y la descarga; la ficha como panel; y el mapa. En el celular: una barra superior
 * con el conmutador, el filtro principal y un botón que alterna Lista y Mapa, y abajo una hoja que es el resumen y,
 * al elegir algo, su ficha. Cada modo recuerda sus filtros, y al cambiar de modo la ruta elegida se lleva al otro.
 */
export default function VistaMapa({ mapa, cobertura, idRutaInicial = null, modoInicial = 'clientes', alCambiarModo }: VistaMapaProps) {
  const escritorio = useCoincideMedia('(min-width: 1024px)');
  const [modo, setModo] = useState<ModoVista>(modoInicial === 'cobertura' && cobertura !== null ? 'cobertura' : 'clientes');
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');
  // Pantalla completa: la columna del mapa, con la hoja inferior dentro (en el celular la barra superior se oculta)
  const { ref: columnaMapaRef, activa: pantallaCompleta, alternar: alternarPantallaCompleta } = usePantallaCompleta<HTMLDivElement>();

  const irAlMapa = () => setVistaMovil('mapa');
  const clientes = useModoClientes({ mapa, idRutaInicial, alVerEnMapa: irAlMapa });
  const cambiarModo = (nuevo: ModoVista) => {
    setModo(nuevo);
    alCambiarModo?.(nuevo);
  };
  const coberturaModo = useModoCobertura({
    cobertura: cobertura ?? COBERTURA_VACIA,
    alVerEnMapa: irAlMapa,
    alVerClientes: (idRuta) => {
      clientes.fijarRuta(idRuta);
      irAlMapa();
      cambiarModo('clientes');
    },
  });

  if (mapa.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No tienes rutas con clientes para consultar.</p>;
  }

  // La ruta elegida acompaña al usuario al cambiar de modo: la que filtra los clientes es la que se ve en la cobertura
  const alCambiarDeModo = (nuevo: ModoVista) => {
    if (nuevo === modo) return;
    if (nuevo === 'cobertura' && clientes.idRuta !== null) coberturaModo.elegir(clientes.idRuta);
    if (nuevo === 'clientes' && coberturaModo.seleccionId !== null) clientes.fijarRuta(coberturaModo.seleccionId);
    cambiarModo(nuevo);
  };
  const conmutador = cobertura !== null ? <ConmutadorVista modo={modo} onCambiar={alCambiarDeModo} /> : null;

  if (modo === 'cobertura' && !coberturaModo.hayDatos) {
    return (
      <div className="space-y-3">
        {conmutador}
        <p className="text-sm text-gray-500">No hay rutas con cobertura calculada para tu alcance.</p>
      </div>
    );
  }

  const piezas = modo === 'cobertura' ? coberturaModo.piezas : clientes.piezas;
  const mapaConControles = (
    <div className="relative isolate min-h-0 min-w-0 flex-1 overflow-hidden">
      {piezas.mapa}
      <BotonPantallaCompleta activa={pantallaCompleta} onClick={alternarPantallaCompleta} />
    </div>
  );

  // El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7)
  if (escritorio) {
    return (
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <aside className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
          <div className="grid shrink-0 grid-cols-1 gap-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
            {conmutador}
            {piezas.filtrosEscritorio}
          </div>
          {piezas.lista}
          {piezas.resumen()}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2">{piezas.exportar}</div>
        </aside>
        {piezas.ficha('panel')}
        <div ref={columnaMapaRef} className="flex min-w-0 flex-1 flex-col bg-white">
          {mapaConControles}
        </div>
      </div>
    );
  }

  return (
    <div ref={columnaMapaRef} className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      {!pantallaCompleta && (
        <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
          {conmutador}
          <div className="flex items-center gap-2">
            {piezas.filtroBarraMovil}
            <BotonAlternarVista vista={vistaMovil} onAlternar={() => setVistaMovil((v) => (v === 'mapa' ? 'lista' : 'mapa'))} etiquetaLista={piezas.etiquetaLista} />
          </div>
        </div>
      )}

      {vistaMovil === 'lista' && !pantallaCompleta ? <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{piezas.listaMovil}</div> : mapaConControles}

      {piezas.hayElegido ? piezas.ficha('hoja') : piezas.resumen(piezas.exportar)}
    </div>
  );
}
