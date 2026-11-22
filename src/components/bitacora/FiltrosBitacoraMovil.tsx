"use client";

import { useState } from 'react';
import Button from '@/components/ui/Button';
import CampoBusqueda from '@/components/ui/CampoBusqueda';
import Select from '@/components/ui/Select';
import { HojaFormulario } from '@/components/ui/HojaFormulario';
import { ACCIONES_BITACORA } from '@/utils/bitacoraUtils';

interface FiltrosBitacoraMovilProps {
  modulos: readonly string[];
  busqueda: string;
  onBusqueda: (v: string) => void;
  modulo: string;
  onModulo: (v: string) => void;
  accion: string;
  onAccion: (v: string) => void;
  desde: string;
  onDesde: (v: string) => void;
  hasta: string;
  onHasta: (v: string) => void;
  /** Eventos que dejan los filtros, para el botón «Ver resultados» */
  total: number;
  onLimpiar: () => void;
}

const CLASE_FECHA =
  'mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600';

/**
 * Filtros de la bitácora para el celular: la búsqueda siempre a la vista y el resto (módulo, acción y fechas) en una
 * hoja inferior. Los filtros se aplican al cambiarlos; el botón solo cierra la hoja y dice cuántos eventos quedaron.
 */
export default function FiltrosBitacoraMovil({
  modulos,
  busqueda,
  onBusqueda,
  modulo,
  onModulo,
  accion,
  onAccion,
  desde,
  onDesde,
  hasta,
  onHasta,
  total,
  onLimpiar,
}: FiltrosBitacoraMovilProps) {
  const [abierta, setAbierta] = useState(false);
  const activos = [modulo, accion, desde, hasta].filter((v) => v !== '').length;

  return (
    <div className="flex items-center gap-2 md:hidden">
      <div className="min-w-0 flex-1">
        <CampoBusqueda valor={busqueda} onCambiar={onBusqueda} placeholder="Buscar por correo o detalle" etiqueta="Buscar por correo o detalle" />
      </div>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={activos > 0 ? `Filtros, ${activos} activos` : 'Filtros'}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 5h18M6 12h12M10 19h4" />
        </svg>
        Filtros
        {activos > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-bold text-white">{activos}</span>
        )}
      </button>

      <HojaFormulario
        abierta={abierta}
        titulo="Filtros"
        onEnviar={() => setAbierta(false)}
        onCerrar={() => setAbierta(false)}
        pie={
          <>
            <Button type="button" variant="secondary" onClick={onLimpiar} disabled={activos === 0 && busqueda === ''} className="flex-1">
              Limpiar
            </Button>
            <Button type="submit" className="flex-1">
              Ver resultados ({total})
            </Button>
          </>
        }
      >
        <Select
          label="Módulo"
          compact
          limpiable
          placeholder="Todos los módulos"
          valor={modulo}
          onCambiar={onModulo}
          opciones={modulos.map((m) => ({ valor: m, texto: m }))}
        />
        <Select
          label="Acción"
          compact
          buscable
          limpiable
          placeholder="Todas las acciones"
          valor={accion}
          onCambiar={onAccion}
          opciones={ACCIONES_BITACORA.map((a) => ({ valor: a, texto: a }))}
        />
        <div>
          <label htmlFor="movil-fecha-desde" className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Desde (fecha UTC)
          </label>
          <input id="movil-fecha-desde" type="date" value={desde} onChange={(e) => onDesde(e.target.value)} className={CLASE_FECHA} />
        </div>
        <div>
          <label htmlFor="movil-fecha-hasta" className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">
            Hasta (fecha UTC)
          </label>
          <input id="movil-fecha-hasta" type="date" value={hasta} onChange={(e) => onHasta(e.target.value)} className={CLASE_FECHA} />
        </div>
      </HojaFormulario>
    </div>
  );
}
