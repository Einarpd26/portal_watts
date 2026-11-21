"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useImportarRutas } from '@/hooks/useImportarRutas';
import { ResultadosImportacion } from '@/components/territorio/ResultadosImportacion';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import { COLOR_ESTADO, COLOR_SIN_EVALUAR, ESTADOS_ORDEN, ETIQUETA_ESTADO, estadoPorIndice } from '@/utils/importacionRutas';
import { LOTE_MAX_BYTES, LOTE_MAX_RUTAS } from '@/utils/rutaValidation';
import { logger } from '@/lib/logger';

// MapLibre necesita WebGL y el navegador: solo se carga en el cliente y solo en esta pestaña (ADR-002 §4)
const MapaImportacion = dynamic(
  () => import('@/components/territorio/MapaImportacion').then((m) => m.MapaImportacion),
  { ssr: false, loading: () => <PageLoader className="h-full" /> }
);

const ID_PANTALLA_COMPLETA = 'mapa-importacion';

const accion = (promesa: Promise<void>, contexto: string) => {
  promesa.catch((err: unknown) => {
    logger.error(`Error no controlado al ${contexto}:`, err);
  });
};

const TITULO_PASO = 'text-xs font-bold uppercase tracking-wider text-gray-400';

/**
 * Pestaña de importación de rutas por lote (CU-16). A la izquierda los tres pasos (sucursal, archivo,
 * importar), en el centro el mapa y, al tener la vista previa, a la derecha los resultados.
 * El informe de correcciones se descarga en Excel.
 */
export function ImportarRutasPanel() {
  const g = useImportarRutas();
  const inputArchivo = useRef<HTMLInputElement>(null);
  // Los resultados se abren solos con la vista previa y en escritorio se pueden plegar para dar el ancho al mapa
  const [resultadosPlegados, setResultadosPlegados] = useState(false);

  const estados = useMemo(() => estadoPorIndice(g.respuesta?.filas ?? []), [g.respuesta]);
  const ocupado = g.fase === 'evaluando' || g.fase === 'confirmando';
  const confirmada = g.fase === 'confirmada';
  const resumen = g.respuesta?.resumen;
  const aGuardar = resumen ? resumen.por_estado.nueva + resumen.por_estado.actualizada : 0;
  const sucursal = g.sucursales.find((s) => s.id === g.idSucursal);

  return (
    <div id={ID_PANTALLA_COMPLETA} className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row">
      <aside className="flex min-h-0 w-full shrink-0 flex-col border-gray-200 bg-white lg:w-80 lg:border-r">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-2" aria-labelledby="paso-sucursal">
            <h2 id="paso-sucursal" className={TITULO_PASO}>
              1. Sucursal
            </h2>
            <Select
              label="Sucursal de destino"
              compact
              valor={deNumeroONulo(g.idSucursal)}
              disabled={g.isLoading || ocupado || confirmada}
              onCambiar={(v) => g.elegirSucursal(aNumeroONulo(v))}
              opciones={[{ valor: '', texto: 'Elige la sucursal' }, ...g.sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre }))]}
            />
            <p className="text-xs text-gray-500">Las zonas del archivo se buscan en esta sucursal; ella no va dentro del archivo.</p>
          </section>

          <section className="space-y-2" aria-labelledby="paso-archivo">
            <h2 id="paso-archivo" className={TITULO_PASO}>
              2. Archivo
            </h2>
            <input
              ref={inputArchivo}
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              className="sr-only"
              aria-label="Archivo GeoJSON de rutas"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) accion(g.elegirArchivo(archivo), 'leer el archivo de rutas');
                e.target.value = '';
              }}
            />
            <Button variant="secondary" size="sm" className="w-full" disabled={ocupado || confirmada} onClick={() => inputArchivo.current?.click()}>
              {g.archivo ? 'Elegir otro archivo' : 'Elegir archivo GeoJSON'}
            </Button>
            {g.archivo ? (
              <p className="text-xs text-gray-700">
                <span className="break-all font-semibold">{g.archivo.nombre}</span>
                <br />
                {g.archivo.rutas.length} rutas leídas
                {g.archivo.rechazadas.length > 0 && `, ${g.archivo.rechazadas.length} con errores en el archivo`}.
              </p>
            ) : (
              <p className="text-xs text-gray-500">FeatureCollection de polígonos, hasta {LOTE_MAX_RUTAS} rutas y {LOTE_MAX_BYTES / 1024 / 1024} MB.</p>
            )}
          </section>

          {g.error && <Alert state="error">{g.error}</Alert>}

          <section className="space-y-2" aria-labelledby="paso-importar">
            <h2 id="paso-importar" className={TITULO_PASO}>
              3. Importar
            </h2>
            {confirmada ? (
              <>
                <Alert state="success">
                  Importación confirmada en {sucursal?.nombre}: {resumen?.por_estado.nueva} nuevas y {resumen?.por_estado.actualizada} actualizadas.
                </Alert>
                <Button variant="secondary" className="w-full" onClick={g.reiniciar}>
                  Importar otro archivo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={g.fase === 'previa' ? 'secondary' : 'primary'}
                  className="w-full"
                  disabled={g.idSucursal === null || !g.archivo || g.archivo.rutas.length === 0 || ocupado}
                  onClick={() => accion(g.evaluar(), 'evaluar el lote de rutas')}
                >
                  {g.fase === 'evaluando' ? 'Evaluando…' : g.fase === 'previa' ? 'Volver a evaluar' : 'Ver vista previa'}
                </Button>
                {(g.fase === 'previa' || g.fase === 'confirmando') && (
                  <>
                    <p className="text-xs text-gray-600">Todavía no se guardó nada. Revisa el resultado a la derecha y confirma.</p>
                    <Button className="w-full" disabled={aGuardar === 0 || ocupado} onClick={() => accion(g.confirmar(), 'confirmar la importación')}>
                      {g.fase === 'confirmando' ? 'Guardando…' : `Confirmar importación (${aGuardar})`}
                    </Button>
                  </>
                )}
              </>
            )}
            {g.respuesta && (
              <Button variant="secondary" className="w-full" disabled={g.isDescargando} onClick={() => accion(g.descargarInforme(), 'descargar el informe')}>
                {g.isDescargando ? 'Generando…' : 'Descargar informe (Excel)'}
              </Button>
            )}
          </section>
        </div>
      </aside>

      <section aria-label="Mapa de la importación" className="relative min-h-[18rem] flex-1 bg-gray-100">
        <MapaImportacion
          rutas={g.archivo?.rutas ?? []}
          estados={estados}
          seleccionIndice={g.seleccionPosicion === null ? null : g.seleccionPosicion - 1}
          onSeleccionar={(indice) => g.setSeleccionPosicion(indice === null ? null : indice + 1)}
          idPantallaCompleta={ID_PANTALLA_COMPLETA}
        />
        <div className="absolute left-2 top-2 z-10 rounded-xl border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <ul className="space-y-1 text-xs text-gray-700" aria-label="Leyenda de estados">
            {g.respuesta ? (
              ESTADOS_ORDEN.map((estado) => (
                <li key={estado} className="flex items-center gap-2">
                  {/* El color del estado es un dato, no un estilo fijo */}
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ESTADO[estado] }} aria-hidden="true" />
                  {ETIQUETA_ESTADO[estado]}
                </li>
              ))
            ) : (
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_SIN_EVALUAR }} aria-hidden="true" />
                Sin evaluar
              </li>
            )}
          </ul>
        </div>
        {g.respuesta && (
          <button
            type="button"
            aria-expanded={!resultadosPlegados}
            onClick={() => setResultadosPlegados((v) => !v)}
            className="absolute right-2 top-2 z-10 hidden rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white lg:block"
          >
            {resultadosPlegados ? 'Mostrar resultados' : 'Ocultar resultados'}
          </button>
        )}
      </section>

      {g.respuesta && resumen && (
        <ResultadosImportacion
          resumen={resumen}
          filas={g.filasVisibles}
          confirmada={confirmada}
          sucursal={sucursal?.nombre ?? ''}
          filtroEstado={g.filtroEstado}
          onFiltroEstado={g.setFiltroEstado}
          busqueda={g.busqueda}
          onBusqueda={g.setBusqueda}
          seleccionPosicion={g.seleccionPosicion}
          onSeleccionar={g.setSeleccionPosicion}
          plegado={resultadosPlegados}
        />
      )}
    </div>
  );
}
