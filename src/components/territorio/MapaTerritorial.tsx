"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { FullscreenControl, Layer, Map, NavigationControl, Popup, Source } from '@vis.gl/react-maplibre';
import type { MapEvent, MapLayerMouseEvent, MapRef } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CapaDibujo } from '@/components/territorio/CapaDibujo';
import { AtribucionMapa } from '@/components/mapa/AtribucionMapa';
import { ESTILO_BASE, VISTA_INICIAL, cajaDe, encuadrarEnCaja } from '@/components/mapa/baseMapa';
import type { Posicion } from '@/utils/ajusteVertices';
import { COLOR_CONFLICTO, COLOR_INVALIDO, COLOR_PROPUESTA, PALETA_ZONAS } from '@/utils/coloresTerritorio';
import type { ConflictoRuta, ContornoZona, PoligonoRuta, RutaItem } from '@/types';

// Encuadre moderado: margen de un cuarto del lado menor y tope de zoom de barrio (no de calle)
const MARGEN_ENCUADRE = 0.25;
const ZOOM_MAXIMO_ENCUADRE = 14;

interface MapaTerritorialProps {
  rutas: RutaItem[];
  /** Qué se elige con un clic: una ruta (pestaña Rutas) o el contorno de una zona (pestaña Zonas) */
  seleccion?: 'ruta' | 'zona';
  /** Id de la ruta o de la zona elegida, según `seleccion` */
  seleccionId: number | null;
  onSeleccionar: (id: number | null) => void;
  /** Polígono importado aún sin confirmar (vista previa) */
  vistaPrevia: PoligonoRuta | null;
  /** La vista previa no es guardable: se pinta en rojo */
  vistaPreviaInvalida: boolean;
  /** Rutas existentes con las que se superpone la propuesta (A1) */
  conflictos: ConflictoRuta[];
  /** Contorno de cada zona, derivado de sus rutas (ADR-002 D6) */
  contornos: ContornoZona[];
  /** Color de cada zona: sus rutas y su contorno se pintan con él */
  coloresZona: globalThis.Map<number, string>;
  /** Elemento que pasa a pantalla completa (incluye las capas flotantes sobre el mapa) */
  idPantallaCompleta: string;
  /** Dibujo o edición del polígono en curso; null si no se está dibujando */
  dibujo: {
    clave: number;
    poligonoInicial: PoligonoRuta | null;
    verticesVecinos: Posicion[];
    onCambio: (poligono: PoligonoRuta) => void;
  } | null;
  /** Contenido flotante anclado sobre la ruta elegida (sus acciones); null para no mostrarlo */
  tarjetaSeleccion?: ReactNode;
}

type Coleccion = GeoJSON.FeatureCollection<GeoJSON.Polygon, Record<string, unknown>>;

const coleccion = (poligonos: Array<{ poligono: PoligonoRuta; propiedades: Record<string, unknown> }>): Coleccion => ({
  type: 'FeatureCollection',
  features: poligonos.map(({ poligono, propiedades }) => ({
    type: 'Feature',
    properties: propiedades,
    geometry: poligono,
  })),
});

export function MapaTerritorial({
  rutas,
  seleccion = 'ruta',
  seleccionId,
  onSeleccionar,
  vistaPrevia,
  vistaPreviaInvalida,
  conflictos,
  contornos,
  coloresZona,
  idPantallaCompleta,
  dibujo,
  tarjetaSeleccion = null,
}: MapaTerritorialProps) {
  const colorDe = useCallback((idZona: number) => coloresZona.get(idZona) ?? PALETA_ZONAS[0], [coloresZona]);

  const mapaRef = useRef<MapRef>(null);

  const datosRutas = useMemo(
    () =>
      coleccion(
        rutas.map((r) => ({
          poligono: r.geojson,
          propiedades: { id: r.id, color: colorDe(r.id_zona), seleccionada: seleccion === 'ruta' && r.id === seleccionId },
        }))
      ),
    [rutas, seleccion, seleccionId, colorDe]
  );
  const datosConflictos = useMemo(
    () =>
      coleccion(
        conflictos.flatMap((c) => (c.geojson ? [{ poligono: c.geojson, propiedades: { id: c.id } }] : []))
      ),
    [conflictos]
  );
  const datosContornos = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: contornos.map((c) => ({
        type: 'Feature',
        properties: { id: c.id_zona, color: colorDe(c.id_zona), seleccionada: seleccion === 'zona' && c.id_zona === seleccionId },
        geometry: c.geojson,
      })),
    }),
    [contornos, seleccion, seleccionId, colorDe]
  );
  const datosVistaPrevia = useMemo(
    () => coleccion(vistaPrevia ? [{ poligono: vistaPrevia, propiedades: {} }] : []),
    [vistaPrevia]
  );

  // Lo elegido: el polígono de la ruta o el contorno de la zona
  const geometriaElegida = useMemo(
    () =>
      seleccion === 'zona'
        ? (contornos.find((c) => c.id_zona === seleccionId)?.geojson ?? null)
        : (rutas.find((r) => r.id === seleccionId)?.geojson ?? null),
    [seleccion, contornos, rutas, seleccionId]
  );

  // Encuadre: la vista previa manda mientras exista; si no, lo elegido o el conjunto
  // Mientras se dibuja solo se encuadra al empezar: re-encuadrar en cada vértice molestaría
  const poligonoDibujo = dibujo?.poligonoInicial ?? null;
  const dibujando = dibujo !== null;
  const cajaEncuadre = useMemo(() => {
    if (dibujando) return poligonoDibujo ? cajaDe([poligonoDibujo]) : null;
    if (vistaPrevia) return cajaDe([vistaPrevia, ...conflictos.flatMap((c) => (c.geojson ? [c.geojson] : []))]);
    const elegida = geometriaElegida;
    return cajaDe(elegida ? [elegida] : [...rutas.map((r) => r.geojson), ...contornos.map((c) => c.geojson)]);
  }, [dibujando, poligonoDibujo, vistaPrevia, conflictos, rutas, contornos, geometriaElegida]);

  // La tarjeta se ancla al borde norte del polígono elegido para no taparlo
  const anclaTarjeta = useMemo<[number, number] | null>(() => {
    const caja = geometriaElegida ? cajaDe([geometriaElegida]) : null;
    return caja ? [(caja[0] + caja[2]) / 2, caja[3]] : null;
  }, [geometriaElegida]);

  // Al salir del dibujo o de una previsualización (Descartar, Guardar) el mapa se queda donde
  // está: el usuario venía trabajando en esa área y un salto de vista lo desorienta
  const modo = dibujando ? 'dibujo' : vistaPrevia ? 'previsualizacion' : 'normal';
  const modoAnterior = useRef(modo);
  const encuadrar = useCallback(
    (duracion: number) => {
      if (!cajaEncuadre) return;
      const mapa = mapaRef.current;
      if (!mapa) return;
      // Margen proporcional a la vista: el polígono queda centrado con su entorno visible, sin
      // acercarse hasta llenar la pantalla
      encuadrarEnCaja(mapa, cajaEncuadre, { margen: MARGEN_ENCUADRE, margenMinimo: 48, zoomMaximo: ZOOM_MAXIMO_ENCUADRE, duracion });
    },
    [cajaEncuadre]
  );
  useEffect(() => {
    const veniaEditando = modoAnterior.current !== 'normal';
    modoAnterior.current = modo;
    if (modo === 'normal' && veniaEditando) return;
    encuadrar(600);
  }, [encuadrar, modo]);

  // En pantallas angostas el mapa puede montarse oculto (ancho 0): el encuadre calculado así
  // queda corrido, así que al hacerse visible se vuelve a encuadrar
  const anchoAnterior = useRef(0);
  const alRedimensionar = (e: MapEvent) => {
    const ancho = e.target.getContainer().clientWidth;
    if (anchoAnterior.current === 0 && ancho > 0) encuadrar(0);
    anchoAnterior.current = ancho;
  };

  const alHacerClic = (e: MapLayerMouseEvent) => {
    const id = e.features?.[0]?.properties?.id;
    onSeleccionar(typeof id === 'number' ? id : null);
  };

  return (
    <Map
      ref={mapaRef}
      mapLib={import('maplibre-gl')}
      initialViewState={VISTA_INICIAL}
      mapStyle={ESTILO_BASE}
      attributionControl={false}
      // Mientras se dibuja, los clics son del dibujo y no seleccionan rutas
      interactiveLayerIds={dibujo ? [] : [seleccion === 'zona' ? 'contornos-relleno' : 'rutas-relleno']}
      onClick={alHacerClic}
      onResize={alRedimensionar}
      cursor="auto"
    >
      {/* Arriba quedan la leyenda y las herramientas; los controles del mapa van abajo a la derecha */}
      <AtribucionMapa position="bottom-right" />
      <NavigationControl position="bottom-right" showCompass={false} />
      <FullscreenControl position="bottom-right" containerId={idPantallaCompleta} />

      <Source id="contornos" type="geojson" data={datosContornos}>
        {/* En la pestaña Zonas el contorno es lo que se elige: se rellena para recibir el clic */}
        {seleccion === 'zona' && (
          <Layer
            id="contornos-relleno"
            type="fill"
            paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'seleccionada'], 0.25, 0.08] }}
          />
        )}
        <Layer
          id="contornos-borde"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'seleccionada'], 4, 2.5],
            'line-dasharray': [4, 2],
            'line-opacity': 0.9,
          }}
        />
      </Source>

      <Source id="rutas" type="geojson" data={datosRutas}>
        <Layer
          id="rutas-relleno"
          type="fill"
          paint={{
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['get', 'seleccionada'], 0.45, 0.12],
          }}
        />
        <Layer
          id="rutas-borde"
          type="line"
          paint={{
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'seleccionada'], 3, 2],
            'line-opacity': ['case', ['get', 'seleccionada'], 1, 0.8],
          }}
        />
      </Source>

      <Source id="conflictos" type="geojson" data={datosConflictos}>
        <Layer id="conflictos-relleno" type="fill" paint={{ 'fill-color': COLOR_CONFLICTO, 'fill-opacity': 0.45 }} />
        <Layer id="conflictos-borde" type="line" paint={{ 'line-color': COLOR_CONFLICTO, 'line-width': 3 }} />
      </Source>

      <Source id="vista-previa" type="geojson" data={datosVistaPrevia}>
        <Layer
          id="vista-previa-relleno"
          type="fill"
          paint={{ 'fill-color': vistaPreviaInvalida ? COLOR_INVALIDO : COLOR_PROPUESTA, 'fill-opacity': 0.3 }}
        />
        <Layer
          id="vista-previa-borde"
          type="line"
          paint={{
            'line-color': vistaPreviaInvalida ? COLOR_INVALIDO : COLOR_PROPUESTA,
            'line-width': 3,
            'line-dasharray': [2, 1],
          }}
        />
      </Source>

      {anclaTarjeta && tarjetaSeleccion && (
        <Popup
          longitude={anclaTarjeta[0]}
          latitude={anclaTarjeta[1]}
          anchor="bottom"
          offset={10}
          closeButton={false}
          closeOnClick={false}
          maxWidth="none"
          className="popup-ruta"
        >
          {tarjetaSeleccion}
        </Popup>
      )}

      {dibujo && (
        <CapaDibujo
          key={dibujo.clave}
          poligonoInicial={dibujo.poligonoInicial}
          verticesVecinos={dibujo.verticesVecinos}
          onCambio={dibujo.onCambio}
        />
      )}
    </Map>
  );
}
