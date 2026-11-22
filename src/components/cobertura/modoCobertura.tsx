"use client";

import { useMemo, useState, type ReactNode } from 'react';
import { MapaCobertura } from './MapaCobertura';
import ListaRutasCobertura from './ListaRutasCobertura';
import FichaRuta from './FichaRuta';
import { ResumenDeCobertura } from './ResumenDeCobertura';
import BotonExportar from '@/components/ui/BotonExportar';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import type { PiezasDelModo } from '@/components/mapa/piezasDelModo';
import { cn } from '@/utils/cn';
import { parametrosDeCobertura, urlDeReporte } from '@/utils/reportes';
import {
  FACETAS_COBERTURA,
  FILTROS_COBERTURA_INICIALES,
  depurarFiltrosCobertura,
  filtrarCobertura,
  momentoDeCalculo,
  nombreDelMes,
  opcionesCoberturaSegunFiltros,
  ordenarCobertura,
  resumirCobertura,
  tramoDe,
  type FiltrosCobertura,
  type OrdenCobertura,
  type TramoCobertura,
} from '@/utils/coberturaRutas';
import type { CoberturaListado } from '@/types';

/** Lo que recibe el modo cuando el usuario no consulta la cobertura (el Vendedor) o todavía no llegó */
export const COBERTURA_VACIA: CoberturaListado = { rutas: [], contornos: [], mes: null, calculado_en: null };

const ORDENES = [
  { valor: 'menor', texto: 'Menor cobertura primero' },
  { valor: 'mayor', texto: 'Mayor cobertura primero' },
  { valor: 'codigo', texto: 'Por código de ruta' },
] as const;

interface ParametrosModoCobertura {
  cobertura: CoberturaListado;
  /** Se llama al pedir una ruta «en el mapa» desde la lista: en el celular, pasa de la lista al mapa */
  alVerEnMapa: () => void;
  /** «Ver clientes de la ruta»: el contenedor cambia al modo Clientes con esa ruta elegida */
  alVerClientes: (idRuta: number) => void;
}

const numero = (v: string) => (v === '' ? null : Number(v));

/**
 * Modo Cobertura del mapa (CU-13, ADR-005 D3): sus filtros (zona, supervisor, ruta y orden), el resumen por tramo, la
 * ficha de la ruta elegida y el mapa con las rutas pintadas por su porcentaje. Guarda su propio estado, así que al
 * volver del modo Clientes los filtros siguen como se dejaron.
 */
export function useModoCobertura({ cobertura, alVerEnMapa, alVerClientes }: ParametrosModoCobertura) {
  const [filtros, setFiltros] = useState<FiltrosCobertura>(FILTROS_COBERTURA_INICIALES);
  const [orden, setOrden] = useState<OrdenCobertura>('menor');
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const visibles = useMemo(() => ordenarCobertura(filtrarCobertura(cobertura.rutas, filtros), orden), [cobertura.rutas, filtros, orden]);
  const resumen = useMemo(() => resumirCobertura(visibles), [visibles]);
  const rutasPorTramo = useMemo(() => {
    const cuenta: Record<TramoCobertura, number> = { baja: 0, media: 0, alta: 0 };
    for (const r of visibles) cuenta[tramoDe(r.porcentaje)] += 1;
    return cuenta;
  }, [visibles]);

  // Lo que existe al alcance decide si se ofrece el filtro de supervisor (con uno solo no hay nada que elegir); lo que se puede
  // elegir en cada filtro depende de los demás (filtros encadenados)
  const disponibles = useMemo(() => opcionesCoberturaSegunFiltros(cobertura.rutas, filtros), [cobertura.rutas, filtros]);
  const supervisores = useMemo(
    () => [...new Map(cobertura.rutas.flatMap((r) => (r.id_supervisor === null ? [] : [[r.id_supervisor, r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`] as const]))).entries()],
    [cobertura.rutas]
  );

  const mes = nombreDelMes(cobertura.mes);
  const momento = momentoDeCalculo(cobertura.calculado_en);
  const elegida = cobertura.rutas.find((r) => r.id === seleccionId) ?? null;

  const cambiar = (cambio: Partial<FiltrosCobertura>) => {
    // Lo que el filtro recién elegido deja sin sentido en los otros se limpia; el que cambió manda
    const cambiado = FACETAS_COBERTURA.find((faceta) => faceta in cambio) ?? null;
    const siguientes = depurarFiltrosCobertura(cobertura.rutas, { ...filtros, ...cambio }, cambiado);
    setFiltros(siguientes);
    // Una selección que el filtro oculta deja de tener sentido
    if (seleccionId !== null && filtrarCobertura(cobertura.rutas.filter((r) => r.id === seleccionId), siguientes).length === 0) setSeleccionId(null);
  };
  const verEnMapa = (idRuta: number) => {
    setSeleccionId(idRuta);
    alVerEnMapa();
  };

  const selectorZona = (
    <SelectorCompacto
      etiqueta="Zona"
      valor={filtros.idZona === null ? '' : String(filtros.idZona)}
      onCambiar={(v) => cambiar({ idZona: numero(v) })}
      limpiable
      placeholder="Todas las zonas"
      opciones={disponibles.zonas.map(([id, codigo]) => ({ valor: String(id), texto: codigo }))}
    />
  );
  // Con un solo supervisor a la vista (p. ej. un supervisor que consulta sus propias zonas) el filtro no aporta nada
  const selectorSupervisor =
    supervisores.length <= 1 ? null : (
      <SelectorCompacto
        etiqueta="Supervisor"
        valor={filtros.idSupervisor === null ? '' : String(filtros.idSupervisor)}
        onCambiar={(v) => cambiar({ idSupervisor: numero(v) })}
        limpiable
        placeholder="Todos los supervisores"
        opciones={disponibles.supervisores.map(([id, nombre]) => ({ valor: String(id), texto: nombre }))}
      />
    );
  const selectorRuta = (
    <SelectorCompacto
      etiqueta="Ruta"
      valor={filtros.idRuta === null ? '' : String(filtros.idRuta)}
      onCambiar={(v) => cambiar({ idRuta: numero(v) })}
      limpiable
      placeholder="Todas las rutas"
      opciones={disponibles.rutas.map((r) => ({ valor: String(r.id), texto: r.codigo_ruta }))}
    />
  );
  const selectorOrden = <SelectorCompacto etiqueta="Orden" valor={orden} onCambiar={(v) => setOrden(v as OrdenCobertura)} opciones={ORDENES} />;

  const lista = (cabecera?: ReactNode) => (
    <ListaRutasCobertura rutas={visibles} seleccionId={seleccionId} onElegir={setSeleccionId} onVerEnMapa={verEnMapa} cabecera={cabecera} />
  );

  const piezas: PiezasDelModo = {
    filtrosEscritorio: (
      <>
        {selectorZona}
        {selectorSupervisor}
        {selectorRuta}
        {selectorOrden}
      </>
    ),
    filtroBarraMovil: selectorZona,
    etiquetaLista: 'Ver la lista de rutas',
    lista: lista(),
    listaMovil: lista(
      <div className={cn('grid gap-2', selectorSupervisor ? 'grid-cols-2' : 'grid-cols-1')}>
        {selectorSupervisor}
        {selectorRuta}
        <div className={cn('flex', selectorSupervisor && 'col-span-2')}>{selectorOrden}</div>
      </div>
    ),
    resumen: (accion) => <ResumenDeCobertura resumen={resumen} rutasPorTramo={rutasPorTramo} mes={mes} momento={momento} accion={accion} />,
    exportar: <BotonExportar href={urlDeReporte('cobertura', parametrosDeCobertura(filtros, orden))} />,
    ficha: (variante) =>
      elegida && (
        <FichaRuta key={elegida.id} variante={variante} ruta={elegida} mes={cobertura.mes} calculadoEn={cobertura.calculado_en} onVerClientes={alVerClientes} onCerrar={() => setSeleccionId(null)} />
      ),
    hayElegido: elegida !== null,
    mapa: <MapaCobertura rutas={visibles} contornos={cobertura.contornos} seleccionId={seleccionId} onElegir={setSeleccionId} />,
  };

  return {
    piezas,
    hayDatos: cobertura.rutas.length > 0,
    /** Ruta elegida, para llevarla al otro modo */
    seleccionId,
    elegir: setSeleccionId,
  };
}
