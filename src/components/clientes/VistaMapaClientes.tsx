"use client";

import { useMemo, useState } from 'react';
import { MapaClientes } from './MapaClientes';
import BotonExportar from '@/components/ui/BotonExportar';
import { cn } from '@/utils/cn';
import { parametrosDeClientes, urlDeReporte } from '@/utils/reportes';
import FiltrosClientes from './FiltrosClientes';
import ListaClientes from './ListaClientes';
import FichaCliente from './FichaCliente';
import { ResumenRuta } from './ResumenRuta';
import { FILTROS_INICIALES, conteoPorClase, filtrarClientes, tieneUbicacion, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { MapaClientes as DatosMapa } from '@/types';

type VistaMovil = 'mapa' | 'lista';

interface VistaMapaClientesProps {
  mapa: DatosMapa;
  /** Ruta con la que se abre el mapa (p. ej. desde la cobertura); ignorada si no está en el alcance */
  idRutaInicial?: number | null;
}

/**
 * Mapa de clientes (CU-12, ADR-005): una columna con filtros, lista y resumen; la ficha del cliente elegido; y el
 * mapa con un marcador por cliente del color de su clase. En el celular se alterna entre el mapa y la lista, y la
 * ficha sube como una hoja inferior. Es de solo lectura.
 */
export default function VistaMapaClientes({ mapa, idRutaInicial = null }: VistaMapaClientesProps) {
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_INICIALES,
    idRuta: idRutaInicial !== null && mapa.rutas.some((r) => r.id === idRutaInicial) ? idRutaInicial : null,
  }));
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('mapa');

  const rutas = useMemo(() => [...mapa.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [mapa.rutas]);

  // El resumen cuenta los clientes de la ruta elegida, sin mirar los otros filtros: así se ve qué se está ocultando
  const delAmbito = useMemo(() => filtrarClientes(mapa.clientes, { ...FILTROS_INICIALES, idRuta: filtros.idRuta }), [mapa.clientes, filtros.idRuta]);
  const conteo = useMemo(() => conteoPorClase(delAmbito), [delAmbito]);
  const visibles = useMemo(() => filtrarClientes(mapa.clientes, filtros), [mapa.clientes, filtros]);

  const sinUbicacion = delAmbito.filter((c) => !tieneUbicacion(c)).length;
  const elegido = mapa.clientes.find((c) => c.id === seleccionId) ?? null;

  if (mapa.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No tienes rutas con clientes para consultar.</p>;
  }

  const verEnMapa = (idCliente: number) => {
    setSeleccionId(idCliente);
    setVistaMovil('mapa');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div role="tablist" aria-label="Qué mostrar" className="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white text-sm font-medium lg:hidden">
        {(['mapa', 'lista'] as const).map((vista) => (
          <button
            key={vista}
            type="button"
            role="tab"
            aria-selected={vistaMovil === vista}
            onClick={() => setVistaMovil(vista)}
            className={cn('flex-1 py-2 transition-colors', vistaMovil === vista ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
          >
            {vista === 'mapa' ? 'Mapa' : `Lista (${visibles.length})`}
          </button>
        ))}
      </div>

      {/* El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7) */}
      <div className="relative isolate flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <aside className={cn('w-full flex-col border-gray-200 bg-white lg:flex lg:w-80 lg:shrink-0 lg:border-r', vistaMovil === 'lista' ? 'flex' : 'hidden')}>
          <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-3">
            <FiltrosClientes
              filtros={filtros}
              onCambiar={(f) => {
                setFiltros(f);
                // Una selección que el filtro oculta deja de tener sentido
                if (elegido && filtrarClientes([elegido], f).length === 0) setSeleccionId(null);
              }}
              rutas={rutas}
              haySinClase={conteo.sinClase > 0}
            />
          </div>
          <ListaClientes clientes={visibles} seleccionId={seleccionId} onElegir={setSeleccionId} onVerEnMapa={verEnMapa} />
          <ResumenRuta total={delAmbito.length} conteo={conteo} sinUbicacion={sinUbicacion} />
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-3 py-2">
            <BotonExportar href={urlDeReporte('clientes', parametrosDeClientes(filtros))} etiqueta="Exportar clientes a Excel" />
          </div>
        </aside>

        {elegido && <FichaCliente cliente={elegido} ruta={mapa.rutas.find((r) => r.id === elegido.id_ruta)} onCerrar={() => setSeleccionId(null)} />}

        <div className={cn('relative min-w-0 flex-1 lg:block', vistaMovil === 'mapa' ? 'block' : 'hidden')}>
          <MapaClientes
            rutas={mapa.rutas}
            contornos={mapa.contornos}
            clientes={visibles}
            idRutaEnfoque={filtros.idRuta}
            seleccionId={seleccionId}
            onElegir={setSeleccionId}
          />
          <p className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow">
            {visibles.length} {visibles.length === 1 ? 'cliente' : 'clientes'}
          </p>
        </div>
      </div>
    </div>
  );
}
