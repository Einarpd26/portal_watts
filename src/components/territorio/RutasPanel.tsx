"use client";

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGestionRutas } from '@/hooks/useGestionRutas';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ListaRutas } from '@/components/territorio/ListaRutas';
import { FormularioRuta } from '@/components/territorio/FormularioRuta';
import { BarraModoMapa } from '@/components/territorio/BarraModoMapa';
import { LeyendaMapa } from '@/components/territorio/LeyendaMapa';
import Alert from '@/components/ui/Alert';
import { cn } from '@/utils/cn';
import { coloresPorZona } from '@/utils/coloresTerritorio';
import { estadoDelPoligono } from '@/utils/estadoPoligono';
import { logger } from '@/lib/logger';

// MapLibre necesita WebGL y el navegador: solo se carga en el cliente y solo en esta pestaña (ADR-002 §4)
const MapaTerritorial = dynamic(
  () => import('@/components/territorio/MapaTerritorial').then((m) => m.MapaTerritorial),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-100" aria-label="Cargando mapa" /> }
);

// El contenedor que pasa a pantalla completa incluye las capas flotantes (leyenda y barra)
const ID_PANTALLA_COMPLETA = 'mapa-rutas';

const accion = (promesa: Promise<void>, contexto: string) => {
  promesa.catch((err: unknown) => {
    logger.error(`Error no controlado al ${contexto}:`, err);
  });
};

/**
 * Pestaña de rutas (CU-05) con el diseño de perfil-ruta de inventory-manager: panel lateral fijo
 * y mapa a pantalla completa. El panel tiene la lista o los datos de la ruta; el polígono se
 * maneja en el mapa con una barra flotante.
 */
export function RutasPanel() {
  const g = useGestionRutas();
  const [busqueda, setBusqueda] = useState('');
  // En pantallas angostas se ve el panel o el mapa, no ambos
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'mapa'>('lista');

  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(g.closeEditor, g.editor !== null && !g.isSubmitting);

  const coloresZona = useMemo(() => coloresPorZona(g.zonas), [g.zonas]);

  const rutasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return g.rutasVisibles;
    return g.rutasVisibles.filter((r) => r.codigo_ruta.toLowerCase().includes(q) || r.ruta.toLowerCase().includes(q));
  }, [busqueda, g.rutasVisibles]);

  const estado = estadoDelPoligono({
    editando: g.editor?.ruta != null,
    dibujando: g.dibujo !== null,
    dibujoConPoligono: g.dibujo?.poligonoInicial != null,
    isEvaluando: g.isEvaluando,
    evaluacion: g.evaluacion,
  });

  const guardar = () => accion(g.submit(), 'guardar la ruta');
  const zonaFiltrada = g.zonas.find((z) => z.id === g.filtroZona);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* El aviso flota: si empujara el contenido, el mapa saltaría al ocultarse */}
      {g.toast && (
        <div className="fixed left-1/2 top-24 z-50 w-[min(92vw,28rem)] -translate-x-1/2 shadow-lg">
          <Alert state={g.toast.type} onClose={g.clearToast}>
            {g.toast.message}
          </Alert>
        </div>
      )}

      <div className="flex shrink-0 border-b border-gray-200 bg-white p-2 lg:hidden" role="group" aria-label="Vista">
        {(['lista', 'mapa'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={vistaMovil === v}
            onClick={() => setVistaMovil(v)}
            className={cn(
              'flex-1 rounded-lg py-1.5 text-sm font-semibold',
              vistaMovil === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {v === 'lista' ? (g.editor ? 'Datos' : 'Lista') : 'Mapa'}
          </button>
        ))}
      </div>

      <aside
        className={cn(
          'min-h-0 w-full shrink-0 flex-col border-gray-200 bg-white lg:flex lg:w-80 lg:border-r',
          vistaMovil === 'lista' ? 'flex flex-1 lg:flex-none' : 'hidden'
        )}
      >
        {g.editor ? (
          <FormularioRuta
            editando={g.editor.ruta}
            zonas={g.zonas}
            form={g.form}
            setForm={g.setForm}
            errors={g.formErrors}
            estado={estado}
            isSubmitting={g.isSubmitting}
            puedeGuardar={g.puedeGuardar}
            onGuardar={guardar}
            onCancelar={g.closeEditor}
          />
        ) : (
          <ListaRutas
            rutas={rutasFiltradas}
            zonas={g.zonas}
            coloresZona={coloresZona}
            isLoading={g.isLoading}
            filtroZona={g.filtroZona}
            onFiltroZona={g.setFiltroZona}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            seleccionId={g.seleccionId}
            onSeleccionar={g.setSeleccionId}
            onNueva={() => {
              g.openCrear();
              setVistaMovil('mapa');
            }}
            onEditar={g.openEditar}
            onExportar={(r) => accion(g.exportar({ tipo: 'ruta', id: r.id }), 'exportar la ruta')}
            isExportando={g.isExportando}
          />
        )}
      </aside>

      <section
        id={ID_PANTALLA_COMPLETA}
        aria-label="Mapa de rutas"
        className={cn('relative min-h-0 flex-1 bg-gray-100 lg:block', vistaMovil === 'mapa' ? 'block' : 'hidden')}
      >
        <MapaTerritorial
          rutas={g.rutasVisibles}
          seleccionId={g.seleccionId}
          onSeleccionar={g.setSeleccionId}
          // Mientras se dibuja, el propio dibujo es la vista previa
          vistaPrevia={g.dibujo ? null : (g.evaluacion?.geojson ?? null)}
          vistaPreviaInvalida={g.evaluacion !== null && !g.evaluacion.valida}
          conflictos={g.evaluacion?.conflictos ?? []}
          contornos={g.contornos}
          coloresZona={coloresZona}
          idPantallaCompleta={ID_PANTALLA_COMPLETA}
          dibujo={g.dibujo ? { ...g.dibujo, verticesVecinos: g.verticesVecinos, onCambio: g.alCambiarDibujo } : null}
        />

        <LeyendaMapa zonas={g.zonas} coloresZona={coloresZona} />

        {!g.editor && g.zonas.length > 0 && (
          <button
            type="button"
            disabled={g.isExportando}
            onClick={() =>
              accion(
                g.exportar(g.filtroZona === null ? { tipo: 'todo' } : { tipo: 'zona', id: g.filtroZona }),
                'exportar el territorio'
              )
            }
            className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
            </svg>
            {zonaFiltrada ? `Exportar zona ${zonaFiltrada.codigo_zona}` : 'Exportar todo'}
          </button>
        )}

        {!g.isLoading && !g.editor && g.zonas.length > 0 && g.rutasVisibles.length === 0 && (
          <p className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs text-amber-700 shadow-sm">
            Esta zona todavía no tiene rutas
          </p>
        )}

        {g.editor && (
          <BarraModoMapa
            estado={estado}
            isSubmitting={g.isSubmitting}
            puedeGuardar={g.puedeGuardar}
            onDibujar={() => accion(g.iniciarDibujo(), 'iniciar el dibujo')}
            onImportar={(archivo) => accion(g.elegirArchivo(archivo), 'leer el archivo GeoJSON')}
            onDescartar={g.detenerDibujo}
            onGuardar={guardar}
          />
        )}
      </section>
    </div>
  );
}
