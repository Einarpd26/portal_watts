"use client";

import { useMemo, useState } from 'react';
import { MapaClientes } from './MapaClientes';
import BotonExportar from '@/components/ui/BotonExportar';
import { parametrosDeClientes, urlDeReporte } from '@/utils/reportes';
import FiltrosClientes from './FiltrosClientes';
import ListaClientes from './ListaClientes';
import FichaCliente from './FichaCliente';
import { FILTROS_INICIALES, conteoPorClase, filtrarClientes, tieneUbicacion, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { MapaClientes as DatosMapa } from '@/types';

interface VistaMapaClientesProps {
  mapa: DatosMapa;
  /** Ruta con la que se abre el mapa (p. ej. desde la cobertura); ignorada si no está en el alcance */
  idRutaInicial?: number | null;
}

/**
 * Mapa de clientes (CU-12, ADR-005): columna con filtros (que hacen de leyenda), ficha y lista, y el mapa con
 * un punto por cliente del color de su clase. Es de solo lectura.
 */
export default function VistaMapaClientes({ mapa, idRutaInicial = null }: VistaMapaClientesProps) {
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_INICIALES,
    idRuta: idRutaInicial !== null && mapa.rutas.some((r) => r.id === idRutaInicial) ? idRutaInicial : null,
  }));
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const rutas = useMemo(() => [...mapa.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [mapa.rutas]);

  // La leyenda cuenta los clientes de la ruta elegida, sin mirar los otros filtros: así se ve qué se está ocultando
  const delAmbito = useMemo(() => filtrarClientes(mapa.clientes, { ...FILTROS_INICIALES, idRuta: filtros.idRuta }), [mapa.clientes, filtros.idRuta]);
  const conteo = useMemo(() => conteoPorClase(delAmbito), [delAmbito]);
  const visibles = useMemo(() => filtrarClientes(mapa.clientes, filtros), [mapa.clientes, filtros]);

  const sinUbicacion = visibles.filter((c) => !tieneUbicacion(c)).length;
  const elegido = mapa.clientes.find((c) => c.id === seleccionId) ?? null;

  if (mapa.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No tienes rutas con clientes para consultar.</p>;
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="space-y-4 lg:w-80 lg:shrink-0">
        <FiltrosClientes
          filtros={filtros}
          onCambiar={(f) => {
            setFiltros(f);
            // Una selección que el filtro oculta deja de tener sentido
            if (elegido && filtrarClientes([elegido], f).length === 0) setSeleccionId(null);
          }}
          rutas={rutas}
          conteo={conteo}
        />
        {elegido && <FichaCliente cliente={elegido} ruta={mapa.rutas.find((r) => r.id === elegido.id_ruta)} onCerrar={() => setSeleccionId(null)} />}
        <ListaClientes clientes={visibles} seleccionId={seleccionId} onElegir={setSeleccionId} />
        <BotonExportar href={urlDeReporte('clientes', parametrosDeClientes(filtros))} etiqueta="Exportar clientes a Excel" />
      </div>

      {/* El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7) */}
      <div className="relative isolate h-112 min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:h-160">
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
          {sinUbicacion > 0 && ` · ${sinUbicacion} sin ubicación`}
        </p>
      </div>
    </div>
  );
}
