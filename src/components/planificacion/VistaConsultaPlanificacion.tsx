"use client";

import { useMemo, useState } from 'react';
import { MapaPlanificacion } from './MapaPlanificacion';
import ListaRutasPlanificacion from './ListaRutasPlanificacion';
import LeyendaMapa, { type ConteoDeRutas } from './LeyendaMapa';
import Select from '@/components/ui/Select';
import BotonExportar from '@/components/ui/BotonExportar';
import { parametrosDePlanificacion, urlDeReporte } from '@/utils/reportes';
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { FILTROS_CONSULTA_INICIALES, filtrarConsulta, opcionesDeConsulta, type FiltrosConsulta } from '@/utils/consultaPlanificacion';
import { descripcionDeVisita, propiedadesDeRutas } from '@/utils/planificacionMapa';
import type { ConsultaPlanificacion } from '@/types';

interface VistaConsultaPlanificacionProps {
  consulta: ConsultaPlanificacion;
}

const nulo = (valor: string) => (valor === '' ? null : Number(valor));

/**
 * Consulta de la planificación de todo el alcance del usuario (CU-10), en solo lectura: filtros por sucursal, zona,
 * supervisor, vendedor, ruta y día, el mapa con el estado de cada ruta (las duplicadas con trazo naranja, RN-04)
 * y la lista con las visitas de cada una. Reutiliza el mapa y la leyenda de la planificación del supervisor.
 */
export default function VistaConsultaPlanificacion({ consulta }: VistaConsultaPlanificacionProps) {
  const [filtros, setFiltros] = useState<FiltrosConsulta>(FILTROS_CONSULTA_INICIALES);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const opciones = useMemo(() => opcionesDeConsulta(consulta.rutas, consulta.slots), [consulta.rutas, consulta.slots]);
  const { rutas, visitas } = useMemo(
    () => filtrarConsulta(consulta.rutas, consulta.slots, consulta.visitas, filtros),
    [consulta.rutas, consulta.slots, consulta.visitas, filtros]
  );

  const propiedades = useMemo(
    () => propiedadesDeRutas(rutas, visitas, consulta.slots, { modo: 'planificacion', dia: filtros.dia }),
    [rutas, visitas, consulta.slots, filtros.dia]
  );
  const propiedadesPorId = useMemo(() => new globalThis.Map(propiedades.map((p) => [p.id, p])), [propiedades]);

  // «Lun · Moreno, Ana · semanal» por ruta, en el orden de la semana: quién la visita, no el número de slot
  const descripciones = useMemo(() => {
    const quien = new globalThis.Map(consulta.slots.map((s) => [s.id, s.vendedor_nombre ?? 'Slot sin vendedor']));
    const porRuta = new globalThis.Map<number, string[]>();
    const ordenadas = [...visitas].sort((a, b) => DIAS_ORDEN.indexOf(a.dia) - DIAS_ORDEN.indexOf(b.dia));
    for (const v of ordenadas) {
      porRuta.set(v.id_ruta, [...(porRuta.get(v.id_ruta) ?? []), descripcionDeVisita(v, quien.get(v.id_slot) ?? 'Slot eliminado')]);
    }
    return porRuta;
  }, [visitas, consulta.slots]);

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

  const opcionesDe = (pares: Array<[number, string]>) =>
    pares.map(([id, nombre]) => (
      <option key={id} value={id}>
        {nombre}
      </option>
    ));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {opciones.sucursales.length > 1 && (
          <Select label="Sucursal" compact value={filtros.idSucursal ?? ''} onChange={(e) => cambiar({ idSucursal: nulo(e.target.value) })}>
            <option value="">Todas</option>
            {opcionesDe(opciones.sucursales)}
          </Select>
        )}
        <Select label="Zona" compact value={filtros.idZona ?? ''} onChange={(e) => cambiar({ idZona: nulo(e.target.value) })}>
          <option value="">Todas</option>
          {opcionesDe(opciones.zonas)}
        </Select>
        <Select label="Supervisor" compact value={filtros.idSupervisor ?? ''} onChange={(e) => cambiar({ idSupervisor: nulo(e.target.value) })}>
          <option value="">Todos</option>
          {opcionesDe(opciones.supervisores)}
        </Select>
        <Select label="Vendedor" compact value={filtros.idVendedor ?? ''} onChange={(e) => cambiar({ idVendedor: nulo(e.target.value) })}>
          <option value="">Todos</option>
          {opcionesDe(opciones.vendedores)}
        </Select>
        <Select label="Ruta" compact value={filtros.idRuta ?? ''} onChange={(e) => cambiar({ idRuta: nulo(e.target.value) })}>
          <option value="">Todas</option>
          {[...consulta.rutas]
            .sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta))
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.codigo_ruta}
              </option>
            ))}
        </Select>
        <Select label="Día" compact value={filtros.dia ?? ''} onChange={(e) => cambiar({ dia: e.target.value === '' ? null : (e.target.value as DiaKey) })}>
          <option value="">Toda la semana</option>
          {DIAS_ORDEN.map((d) => (
            <option key={d} value={d}>
              {DIA_LABELS[d]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex justify-end">
        <BotonExportar href={urlDeReporte('planificacion', parametrosDePlanificacion(filtros))} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="space-y-4 lg:w-80 lg:shrink-0">
          <LeyendaMapa modo="planificacion" conteo={conteo} diaActivo={filtros.dia && `el ${DIA_LABELS[filtros.dia].toLowerCase()}`} />
          <ListaRutasPlanificacion
            rutas={rutas}
            propiedades={propiedadesPorId}
            descripciones={descripciones}
            accionPorRuta={null}
            seleccionId={seleccionId}
            onElegir={setSeleccionId}
          />
        </div>

        {/* El mapa vive en su propio contexto de apilamiento: sus controles nunca tapan ventanas ni hojas (ADR-004 D7) */}
        <div className="relative isolate h-112 min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 lg:h-160">
          <MapaPlanificacion
            rutas={rutas}
            contornos={consulta.contornos}
            propiedades={propiedades}
            descripciones={descripciones}
            seleccionId={seleccionId}
            onClickRuta={setSeleccionId}
          />
          <p className="pointer-events-none absolute left-2 top-2 z-10 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow">
            {rutas.length} {rutas.length === 1 ? 'ruta' : 'rutas'}
          </p>
        </div>
      </div>
    </div>
  );
}
