"use client";

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useGestionRutas, type Evaluacion } from '@/hooks/useGestionRutas';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { logger } from '@/lib/logger';

// MapLibre necesita WebGL y el navegador: solo se carga en el cliente y solo en esta pestaña (ADR-002 §4)
const MapaTerritorial = dynamic(() => import('@/components/territorio/MapaTerritorial').then((m) => m.MapaTerritorial), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" aria-label="Cargando mapa" />,
});

const formatoArea = (m2: number) =>
  m2 >= 10_000 ? `${(m2 / 10_000).toLocaleString('es-BO', { maximumFractionDigits: 1 })} ha` : `${Math.round(m2)} m²`;

function ResultadoValidacion({ evaluacion }: { evaluacion: Evaluacion }) {
  if (evaluacion.valida) {
    return (
      <Alert state="success">
        Polígono válido
        {evaluacion.vertices !== null ? ` · ${evaluacion.vertices - 1} vértices` : ''}
        {evaluacion.area_m2 !== null ? ` · ${formatoArea(evaluacion.area_m2)}` : ''}. Revisa la vista previa en el
        mapa antes de guardar.
      </Alert>
    );
  }
  return (
    <Alert state="error">
      {/* Alert envuelve su contenido en un <p>: solo se admite contenido en línea */}
      <span className="block">{evaluacion.motivo ?? 'El archivo no es válido.'}</span>
      {evaluacion.conflictos.map((c, i) => (
        <span key={c.id ?? `fuera-${i}`} className="mt-1 block text-sm">
          • {c.fuera_de_alcance ? 'Otra ruta fuera de tus zonas' : c.codigo_ruta} · {formatoArea(c.area_m2)} en común
        </span>
      ))}
    </Alert>
  );
}

/** Pestaña de rutas (CU-05): mapa, lista por zona e importación de GeoJSON con vista previa */
export function RutasPanel() {
  const {
    zonas,
    rutasVisibles,
    isLoading,
    isEvaluando,
    isSubmitting,
    filtroZona,
    setFiltroZona,
    seleccionId,
    setSeleccionId,
    editor,
    form,
    setForm,
    formErrors,
    archivoNombre,
    evaluacion,
    puedeGuardar,
    openCrear,
    openEditar,
    closeEditor,
    elegirArchivo,
    quitarArchivo,
    submit,
    toast,
    clearToast,
  } = useGestionRutas();

  const archivoRef = useRef<HTMLInputElement>(null);

  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(closeEditor, editor !== null && !isSubmitting);

  const editando = editor?.ruta ?? null;
  const zonaDe = (id: number) => zonas.find((z) => z.id === id);
  const sinZonas = !isLoading && zonas.length === 0;

  return (
    <>
      {toast && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <Alert state={toast.type} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-4 px-6 py-6 lg:grid-cols-[24rem_1fr]">
        <section className="flex max-h-[calc(100vh-14rem)] min-h-[24rem] flex-col overflow-hidden rounded-card bg-white shadow-card">
          {editor ? (
            <form
              noValidate
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                submit().catch((err: unknown) => {
                  logger.error('Error no controlado al guardar la ruta:', err);
                });
              }}
            >
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-base font-bold text-gray-900">
                  {editando ? `Editar ${editando.codigo_ruta}` : 'Importar ruta'}
                </h2>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {editando ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">Zona</p>
                    <p className="text-sm text-gray-900">
                      {zonaDe(editando.id_zona)?.codigo_zona} — {zonaDe(editando.id_zona)?.zona}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Para cambiar la zona usa el traslado de rutas.</p>
                  </div>
                ) : (
                  <Select
                    label="Zona"
                    placeholder="Seleccionar zona"
                    value={form.id_zona ?? ''}
                    onChange={(e) => setForm({ ...form, id_zona: e.target.value ? Number(e.target.value) : null })}
                    error={formErrors.id_zona}
                    disabled={isSubmitting}
                  >
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.codigo_zona} — {z.zona}
                      </option>
                    ))}
                  </Select>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
                    {editando ? 'Reemplazar el polígono (opcional)' : 'Archivo GeoJSON'}
                  </p>
                  <input
                    ref={archivoRef}
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    aria-label="Archivo GeoJSON de la ruta"
                    disabled={isSubmitting}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-btn file:border file:border-gray-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-gray-800 hover:file:bg-gray-50"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) {
                        elegirArchivo(archivo).catch((err: unknown) => {
                          logger.error('Error no controlado al leer el archivo GeoJSON:', err);
                        });
                      }
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Un Polygon con coordenadas [longitud, latitud], de hasta 512 KB.
                  </p>
                  {archivoNombre && (
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-primary-600 hover:underline"
                      onClick={() => {
                        quitarArchivo();
                        if (archivoRef.current) archivoRef.current.value = '';
                      }}
                    >
                      Quitar {archivoNombre}
                    </button>
                  )}
                </div>

                {isEvaluando && <p className="text-sm text-gray-500">Validando el polígono…</p>}
                {evaluacion && !isEvaluando && <ResultadoValidacion evaluacion={evaluacion} />}
                <Input
                  label="Código"
                  value={form.codigo_ruta}
                  onChange={(e) => setForm({ ...form, codigo_ruta: e.target.value })}
                  error={formErrors.codigo_ruta}
                  disabled={isSubmitting}
                  placeholder="R-N5"
                />
                <Input
                  label="Nombre de la ruta"
                  value={form.ruta}
                  onChange={(e) => setForm({ ...form, ruta: e.target.value })}
                  error={formErrors.ruta}
                  disabled={isSubmitting}
                />
                <Input
                  label="Descripción (opcional)"
                  value={form.descripcion_ruta}
                  onChange={(e) => setForm({ ...form, descripcion_ruta: e.target.value })}
                  error={formErrors.descripcion_ruta}
                  disabled={isSubmitting}
                />

              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <Button type="button" variant="secondary" onClick={closeEditor} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmitting} disabled={!puedeGuardar}>
                  Guardar ruta
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="space-y-3 border-b border-gray-100 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-gray-900">Rutas</h2>
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-100 px-2 text-xs font-semibold text-gray-600">
                    {rutasVisibles.length}
                  </span>
                </div>
                {zonas.length > 1 && (
                  <Select
                    label="Zona"
                    compact
                    value={filtroZona ?? ''}
                    onChange={(e) => setFiltroZona(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Todas mis zonas</option>
                    {zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.codigo_zona} — {z.zona}
                      </option>
                    ))}
                  </Select>
                )}
                <Button onClick={openCrear} disabled={sinZonas} className="w-full">
                  Importar ruta
                </Button>
              </div>

              <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label="Rutas">
                {isLoading &&
                  Array.from({ length: 4 }, (_, i) => (
                    <li key={i} className="px-5 py-3" aria-hidden="true">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                    </li>
                  ))}
                {sinZonas && (
                  <li className="px-5 py-6 text-sm text-gray-500">
                    No tienes zonas asignadas. Pide a la Gerencia o al Fiscalizador que te asigne una (CU-07).
                  </li>
                )}
                {!isLoading && !sinZonas && rutasVisibles.length === 0 && (
                  <li className="px-5 py-6 text-sm text-gray-500">Aún no hay rutas en esta zona.</li>
                )}
                {rutasVisibles.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      'flex items-center justify-between gap-2 px-5 py-3',
                      r.id === seleccionId && 'bg-primary-50'
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      aria-pressed={r.id === seleccionId}
                      onClick={() => setSeleccionId(r.id === seleccionId ? null : r.id)}
                    >
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {r.codigo_ruta} · {r.ruta}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        Zona {zonaDe(r.id_zona)?.codigo_zona ?? '—'}
                        {r.descripcion_ruta ? ` · ${r.descripcion_ruta}` : ''}
                      </p>
                    </button>
                    <Button variant="secondary" size="sm" onClick={() => openEditar(r)}>
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section
          aria-label="Mapa de rutas"
          className="h-[28rem] overflow-hidden rounded-card bg-white shadow-card lg:h-[calc(100vh-14rem)] lg:min-h-[24rem]"
        >
          <MapaTerritorial
            rutas={rutasVisibles}
            seleccionId={seleccionId}
            onSeleccionar={setSeleccionId}
            vistaPrevia={evaluacion?.geojson ?? null}
            vistaPreviaInvalida={evaluacion !== null && !evaluacion.valida}
            conflictos={evaluacion?.conflictos ?? []}
          />
        </section>
      </div>
    </>
  );
}
