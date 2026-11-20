"use client";

import { useMemo, useState } from 'react';
import { MapaCobertura } from './MapaCobertura';
import TablaCobertura from './TablaCobertura';
import Select from '@/components/ui/Select';
import BotonExportar from '@/components/ui/BotonExportar';
import { parametrosDeCobertura, urlDeReporte } from '@/utils/reportes';
import {
  COLOR_TRAMO,
  ETIQUETA_TRAMO,
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

const TRAMOS: readonly TramoCobertura[] = ['baja', 'media', 'alta'];

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{titulo}</p>
      <p className="text-xl font-extrabold text-gray-900">{valor}</p>
      {detalle && <p className="text-[11px] text-gray-500">{detalle}</p>}
    </div>
  );
}

/**
 * Cobertura de rutas (CU-13, ADR-005 D3): el dato calculado de noche, un resumen, filtros por zona, supervisor y
 * ruta, la tabla ordenada por lo más urgente y el mapa con las rutas pintadas por su porcentaje.
 */
export default function VistaCobertura({ cobertura }: VistaCoberturaProps) {
  const [filtros, setFiltros] = useState<FiltrosCobertura>(FILTROS_COBERTURA_INICIALES);
  const [orden, setOrden] = useState<OrdenCobertura>('menor');
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const visibles = useMemo(() => ordenarCobertura(filtrarCobertura(cobertura.rutas, filtros), orden), [cobertura.rutas, filtros, orden]);
  const resumen = useMemo(() => resumirCobertura(visibles), [visibles]);

  // Las opciones de cada filtro salen de las rutas del alcance
  const zonas = useMemo(() => [...new Map(cobertura.rutas.map((r) => [r.id_zona, r.codigo_zona])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [cobertura.rutas]);
  const supervisores = useMemo(
    () => [...new Map(cobertura.rutas.flatMap((r) => (r.id_supervisor === null ? [] : [[r.id_supervisor, r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`] as const]))).entries()],
    [cobertura.rutas]
  );
  const rutasParaElegir = useMemo(() => [...cobertura.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [cobertura.rutas]);

  const mes = nombreDelMes(cobertura.mes);
  const momento = momentoDeCalculo(cobertura.calculado_en);
  const conteoTramos = (t: TramoCobertura) => visibles.filter((r) => tramoDe(r.porcentaje) === t).length;
  const cambiar = (cambio: Partial<FiltrosCobertura>) => {
    const siguientes = { ...filtros, ...cambio };
    setFiltros(siguientes);
    // Una selección que el filtro oculta deja de tener sentido
    if (seleccionId !== null && filtrarCobertura(cobertura.rutas.filter((r) => r.id === seleccionId), siguientes).length === 0) setSeleccionId(null);
  };

  if (cobertura.rutas.length === 0) {
    return <p className="text-sm text-gray-500">No hay rutas con cobertura calculada para tu alcance.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white px-4 py-3 text-xs text-gray-600 ring-1 ring-gray-200">
        <p>
          <span className="font-semibold text-gray-900">{mes ?? 'Mes en curso'}</span>
          {momento ? ` · Último recálculo: ${momento}` : ''}
        </p>
        <p className="mt-0.5 text-gray-500">Las ventas de hoy se incorporan en el próximo recálculo nocturno.</p>
      </div>
      <div className="flex justify-end">
        <BotonExportar href={urlDeReporte('cobertura', parametrosDeCobertura(filtros, orden))} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra titulo="Cobertura" valor={`${resumen.porcentaje} %`} detalle={`${resumen.clientesAtendidos} de ${resumen.clientesHabilitados} clientes`} />
        <Cifra titulo="Rutas" valor={String(resumen.rutas)} />
        <Cifra titulo={`Bajo el ${ETIQUETA_TRAMO.baja.replace('Menos del ', '')}`} valor={String(resumen.rutasBajas)} detalle={resumen.rutasBajas === 1 ? 'ruta' : 'rutas'} />
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rutas por tramo</p>
          <ul className="space-y-0.5">
            {TRAMOS.map((t) => (
              <li key={t} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                {/* El color del tramo es un dato del mapa: se aplica como estilo */}
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TRAMO[t] }} aria-hidden="true" />
                <span className="flex-1">{ETIQUETA_TRAMO[t]}</span>
                <span className="font-semibold">{conteoTramos(t)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Zona" compact value={filtros.idZona ?? ''} onChange={(e) => cambiar({ idZona: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Todas</option>
          {zonas.map(([id, codigo]) => (
            <option key={id} value={id}>
              {codigo}
            </option>
          ))}
        </Select>
        <Select label="Supervisor" compact value={filtros.idSupervisor ?? ''} onChange={(e) => cambiar({ idSupervisor: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Todos</option>
          {supervisores.map(([id, nombre]) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </Select>
        <Select label="Ruta" compact value={filtros.idRuta ?? ''} onChange={(e) => cambiar({ idRuta: e.target.value === '' ? null : Number(e.target.value) })}>
          <option value="">Todas</option>
          {rutasParaElegir.map((r) => (
            <option key={r.id} value={r.id}>
              {r.codigo_ruta}
            </option>
          ))}
        </Select>
        <Select label="Orden" compact value={orden} onChange={(e) => setOrden(e.target.value as OrdenCobertura)}>
          <option value="menor">Menor cobertura primero</option>
          <option value="mayor">Mayor cobertura primero</option>
          <option value="codigo">Por código de ruta</option>
        </Select>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 lg:w-120 lg:shrink-0">
          <TablaCobertura rutas={visibles} seleccionId={seleccionId} onElegir={setSeleccionId} />
        </div>
        {/* El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7) */}
        <div className="relative isolate h-112 min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:h-160">
          <MapaCobertura rutas={visibles} contornos={cobertura.contornos} seleccionId={seleccionId} onElegir={setSeleccionId} />
        </div>
      </div>
    </div>
  );
}
