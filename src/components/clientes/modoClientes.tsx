"use client";

import { useMemo, useState } from 'react';
import { MapaClientes } from './MapaClientes';
import BotonExportar from '@/components/ui/BotonExportar';
import FichaCliente from './FichaCliente';
import { InterruptoresClase } from './InterruptoresClase';
import ListaClientes from './ListaClientes';
import { ResumenRuta } from './ResumenRuta';
import { SelectorRuta } from './SelectorRuta';
import type { PiezasDelModo } from '@/components/mapa/piezasDelModo';
import { parametrosDeClientes, urlDeReporte } from '@/utils/reportes';
import { FILTROS_INICIALES, conteoPorClase, filtrarClientes, tieneUbicacion, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
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

  const rutas = useMemo(() => [...mapa.rutas].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)), [mapa.rutas]);

  // El resumen cuenta los clientes de la ruta elegida, sin mirar los otros filtros: así se ve qué se está ocultando
  const delAmbito = useMemo(() => filtrarClientes(mapa.clientes, { ...FILTROS_INICIALES, idRuta: filtros.idRuta }), [mapa.clientes, filtros.idRuta]);
  const conteo = useMemo(() => conteoPorClase(delAmbito), [delAmbito]);
  const visibles = useMemo(() => filtrarClientes(mapa.clientes, filtros), [mapa.clientes, filtros]);

  const sinUbicacion = delAmbito.filter((c) => !tieneUbicacion(c)).length;
  const elegido = mapa.clientes.find((c) => c.id === seleccionId) ?? null;
  const rutaDelElegido = elegido ? mapa.rutas.find((r) => r.id === elegido.id_ruta) : undefined;

  const cambiarFiltros = (f: Filtros) => {
    setFiltros(f);
    // Una selección que el filtro oculta deja de tener sentido
    if (elegido && filtrarClientes([elegido], f).length === 0) setSeleccionId(null);
  };
  const verEnMapa = (idCliente: number) => {
    setSeleccionId(idCliente);
    alVerEnMapa();
  };

  const selectorRuta = <SelectorRuta rutas={rutas} idRuta={filtros.idRuta} onCambiar={(idRuta) => cambiarFiltros({ ...filtros, idRuta })} />;
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

  const piezas: PiezasDelModo = {
    filtrosEscritorio: selectorRuta,
    filtroBarraMovil: selectorRuta,
    etiquetaLista: 'Ver la lista de clientes',
    lista,
    listaMovil: lista,
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
        idRutaEnfoque={filtros.idRuta}
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
    fijarRuta: (idRuta: number | null) => cambiarFiltros({ ...filtros, idRuta }),
  };
}
