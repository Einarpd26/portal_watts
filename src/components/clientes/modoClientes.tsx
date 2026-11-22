"use client";

import { useMemo, useState, type ReactNode } from 'react';
import { MapaClientes } from './MapaClientes';
import BotonExportar from '@/components/ui/BotonExportar';
import FichaCliente from './FichaCliente';
import { InterruptoresClase } from './InterruptoresClase';
import ListaClientes from './ListaClientes';
import { ResumenRuta } from './ResumenRuta';
import { SelectorRuta } from './SelectorRuta';
import SelectorCompacto from '@/components/ui/SelectorCompacto';
import type { PiezasDelModo } from '@/components/mapa/piezasDelModo';
import { cn } from '@/utils/cn';
import { pasaTerritorio } from '@/utils/territorio';
import { parametrosDeClientes, urlDeReporte } from '@/utils/reportes';
import {
  FACETAS_CLIENTES,
  FILTROS_INICIALES,
  conteoPorClase,
  depurarFiltrosClientes,
  filtrarClientes,
  opcionesClientesSegunFiltros,
  tieneUbicacion,
  type FacetaClientes,
  type FiltrosClientes as Filtros,
} from '@/utils/clientesMapa';
import type { MapaClientes as DatosMapa } from '@/types';

interface ParametrosModoClientes {
  mapa: DatosMapa;
  /** Ruta con la que se abre el mapa (p. ej. desde un enlace); ignorada si no está en el alcance */
  idRutaInicial: number | null;
  /** Se llama al pedir un cliente «en el mapa» desde la lista: en el celular, pasa de la lista al mapa */
  alVerEnMapa: () => void;
}

/**
 * Modo Clientes del mapa (CU-12, ADR-005): sus filtros (ruta, búsqueda y clase), el resumen por clase, la ficha del
 * cliente elegido y el mapa con un marcador por cliente. Guarda su propio estado, así que al volver del modo
 * Cobertura los filtros siguen como se dejaron.
 */
export function useModoClientes({ mapa, idRutaInicial, alVerEnMapa }: ParametrosModoClientes) {
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_INICIALES,
    idRuta: idRutaInicial !== null && mapa.rutas.some((r) => r.id === idRutaInicial) ? idRutaInicial : null,
  }));
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  // Lo que existe al alcance decide si se ofrecen los filtros de sucursal y de zona (con una sola no hay nada que elegir);
  // lo que se puede elegir en cada filtro depende de los demás (filtros encadenados)
  const disponibles = useMemo(() => opcionesClientesSegunFiltros(mapa.rutas, filtros), [mapa.rutas, filtros]);
  const hayVariasSucursales = useMemo(() => new Set(mapa.rutas.map((r) => r.id_sucursal)).size > 1, [mapa.rutas]);
  const hayVariasZonas = useMemo(() => new Set(mapa.rutas.map((r) => r.id_zona)).size > 1, [mapa.rutas]);

  // El resumen cuenta los clientes del territorio elegido, sin mirar los otros filtros: así se ve qué se está ocultando
  const delAmbito = useMemo(
    () => filtrarClientes(mapa.clientes, { ...FILTROS_INICIALES, idSucursal: filtros.idSucursal, idZona: filtros.idZona, idRuta: filtros.idRuta }, mapa.rutas),
    [mapa.clientes, mapa.rutas, filtros.idSucursal, filtros.idZona, filtros.idRuta]
  );
  const conteo = useMemo(() => conteoPorClase(delAmbito), [delAmbito]);
  const visibles = useMemo(() => filtrarClientes(mapa.clientes, filtros, mapa.rutas), [mapa.clientes, mapa.rutas, filtros]);
  // Con algún filtro territorial el mapa se encuadra sobre las rutas que dejan los filtros; sin ninguno, sobre todo el territorio
  const rutasEnfocadas = useMemo(
    () =>
      filtros.idSucursal === null && filtros.idZona === null && filtros.idRuta === null
        ? null
        : mapa.rutas.filter((r) => pasaTerritorio(r, filtros)).map((r) => r.id),
    [mapa.rutas, filtros]
  );

  const sinUbicacion = delAmbito.filter((c) => !tieneUbicacion(c)).length;
  const elegido = mapa.clientes.find((c) => c.id === seleccionId) ?? null;
  const rutaDelElegido = elegido ? mapa.rutas.find((r) => r.id === elegido.id_ruta) : undefined;

  const cambiarFiltros = (cambio: Partial<Filtros>) => {
    // Lo que el filtro territorial recién elegido deja sin sentido en los otros se limpia; el que cambió manda
    const cambiado = FACETAS_CLIENTES.find((faceta: FacetaClientes) => faceta in cambio) ?? null;
    const siguientes = depurarFiltrosClientes(mapa.rutas, { ...filtros, ...cambio }, cambiado);
    setFiltros(siguientes);
    // Una selección que el filtro oculta deja de tener sentido
    if (elegido && filtrarClientes([elegido], siguientes, mapa.rutas).length === 0) setSeleccionId(null);
  };
  const verEnMapa = (idCliente: number) => {
    setSeleccionId(idCliente);
    alVerEnMapa();
  };

  const selectorSucursal = hayVariasSucursales && (
    <SelectorCompacto
      etiqueta="Sucursal"
      valor={filtros.idSucursal === null ? '' : String(filtros.idSucursal)}
      onCambiar={(v) => cambiarFiltros({ idSucursal: v === '' ? null : Number(v) })}
      limpiable
      placeholder="Todas las sucursales"
      opciones={disponibles.sucursales.map(([id, nombre]) => ({ valor: String(id), texto: nombre }))}
    />
  );
  const selectorZona = hayVariasZonas && (
    <SelectorCompacto
      etiqueta="Zona"
      valor={filtros.idZona === null ? '' : String(filtros.idZona)}
      onCambiar={(v) => cambiarFiltros({ idZona: v === '' ? null : Number(v) })}
      limpiable
      placeholder="Todas las zonas"
      opciones={disponibles.zonas.map(([id, codigo]) => ({ valor: String(id), texto: codigo }))}
    />
  );
  const selectorRuta = <SelectorRuta rutas={disponibles.rutas} idRuta={filtros.idRuta} onCambiar={(idRuta) => cambiarFiltros({ idRuta })} />;

  const lista = (territorio?: ReactNode) => (
    <ListaClientes
      clientes={visibles}
      seleccionId={seleccionId}
      onElegir={setSeleccionId}
      onVerEnMapa={verEnMapa}
      texto={filtros.texto}
      onTexto={(texto) => cambiarFiltros({ texto })}
      filtros={
        <>
          {territorio}
          <InterruptoresClase filtros={filtros} onCambiar={cambiarFiltros} haySinClase={conteo.sinClase > 0} />
        </>
      }
    />
  );

  const piezas: PiezasDelModo = {
    filtrosEscritorio: (
      <>
        {selectorSucursal}
        {selectorZona}
        {selectorRuta}
      </>
    ),
    filtroBarraMovil: selectorRuta,
    etiquetaLista: 'Ver la lista de clientes',
    lista: lista(),
    // En el celular la barra superior solo lleva la ruta: la sucursal y la zona van sobre la lista
    listaMovil: lista(
      (selectorSucursal || selectorZona) && (
        <div className={cn('grid gap-2', selectorSucursal && selectorZona ? 'grid-cols-2' : 'grid-cols-1')}>
          {selectorSucursal}
          {selectorZona}
        </div>
      )
    ),
    resumen: (accion) => <ResumenRuta total={delAmbito.length} conteo={conteo} sinUbicacion={sinUbicacion} accion={accion} />,
    exportar: <BotonExportar href={urlDeReporte('clientes', parametrosDeClientes(filtros))} etiqueta="Exportar clientes a Excel" />,
    ficha: (variante) =>
      elegido && <FichaCliente key={elegido.id} variante={variante} cliente={elegido} ruta={rutaDelElegido} onCerrar={() => setSeleccionId(null)} />,
    hayElegido: elegido !== null,
    mapa: (
      <MapaClientes
        rutas={mapa.rutas}
        contornos={mapa.contornos}
        clientes={visibles}
        idsRutasEnfoque={rutasEnfocadas}
        seleccionId={seleccionId}
        onElegir={setSeleccionId}
      />
    ),
  };

  return {
    piezas,
    /** Ruta filtrada, para llevarla al otro modo */
    idRuta: filtros.idRuta,
    /** Deja filtrado el mapa de clientes por una ruta (p. ej. al venir desde la cobertura) */
    fijarRuta: (idRuta: number | null) => cambiarFiltros({ idRuta }),
  };
}
