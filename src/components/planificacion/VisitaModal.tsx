"use client";

import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { cn } from '@/utils/cn';
import { DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { FRECUENCIAS, FRECUENCIA_LABELS } from '@/utils/frecuencias';
import { rutasDuplicadasEnSemana } from '@/utils/planificacionDuplicados';
import type { Frecuencia, RutaPlanificable, VisitaPlanificada } from '@/types';

export type VisitaModalEstado =
  | { tipo: 'agregar'; idSlot: number; dia: DiaKey; nombreSlot: string }
  | { tipo: 'editar'; visita: VisitaPlanificada; nombreSlot: string };

interface VisitaModalProps {
  estado: VisitaModalEstado | null;
  rutas: RutaPlanificable[];
  /** Todas las visitas de la semana, para avisar si lo que se elige quedaría duplicado */
  visitas: VisitaPlanificada[];
  isSubmitting: boolean;
  onAgregar: (idSlot: number, idRuta: number, dia: DiaKey, frecuencia: Frecuencia) => void;
  onCambiarFrecuencia: (idVisita: number, frecuencia: Frecuencia) => void;
  onQuitar: (idVisita: number) => void;
  onCancel: () => void;
}

export default function VisitaModal(props: VisitaModalProps) {
  const { estado } = props;
  // El contenido se monta de nuevo en cada apertura para no arrastrar la selección anterior
  return estado ? <ContenidoVisitaModal key={estado.tipo === 'editar' ? `e${estado.visita.id}` : `a${estado.idSlot}${estado.dia}`} {...props} estado={estado} /> : null;
}

function ContenidoVisitaModal({
  estado,
  rutas,
  visitas,
  isSubmitting,
  onAgregar,
  onCambiarFrecuencia,
  onQuitar,
  onCancel,
}: VisitaModalProps & { estado: VisitaModalEstado }) {
  const editando = estado.tipo === 'editar';
  const [idRuta, setIdRuta] = useState<number | null>(editando ? estado.visita.id_ruta : null);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(editando ? estado.visita.frecuencia : 'semanal');
  const [filtro, setFiltro] = useState('');

  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, !isSubmitting);

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? rutas.filter((r) => `${r.codigo_ruta} ${r.ruta} ${r.codigo_zona}`.toLowerCase().includes(q)) : rutas;
  }, [rutas, filtro]);

  // ¿Quedaría duplicada con lo que se está eligiendo? Se simula la semana con y sin la visita.
  const quedaDuplicada = useMemo(() => {
    if (idRuta === null) return false;
    const otras = visitas.filter((v) => !(editando && v.id === estado.visita.id));
    return rutasDuplicadasEnSemana([...otras, { id_ruta: idRuta, frecuencia }]).has(idRuta);
  }, [visitas, idRuta, frecuencia, editando, estado]);

  const dia = editando ? estado.visita.dia : estado.dia;
  const sinCambios = editando && frecuencia === estado.visita.frecuencia;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visita-modal-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-2xl"
      >
        <h3 id="visita-modal-title" className="mb-1 text-lg font-bold text-gray-900">
          {editando ? 'Ruta planificada' : 'Planificar una ruta'}
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          {estado.nombreSlot} · {DIA_LABELS[dia]}
        </p>

        {editando ? (
          <p className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
            {estado.visita.codigo_ruta} — {estado.visita.ruta}
          </p>
        ) : (
          <div className="mb-4 space-y-2">
            <Input
              label="Buscar ruta"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Código, nombre o zona"
              disabled={isSubmitting}
            />
            <ul className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200" role="listbox" aria-label="Rutas de tus zonas">
              {filtradas.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400">
                  {rutas.length === 0 ? 'Tus zonas todavía no tienen rutas.' : 'Sin resultados.'}
                </li>
              ) : (
                filtradas.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={idRuta === r.id}
                      onClick={() => setIdRuta(r.id)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm transition hover:bg-gray-50',
                        idRuta === r.id && 'bg-primary-50 font-semibold text-primary-700'
                      )}
                    >
                      {r.codigo_ruta} — {r.ruta}
                      <span className="ml-2 text-xs text-gray-400">{r.codigo_zona}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">Frecuencia de visita</p>
          <div className="grid grid-cols-4 gap-2">
            {FRECUENCIAS.map((f) => (
              <button
                key={f}
                type="button"
                disabled={isSubmitting}
                onClick={() => setFrecuencia(f)}
                className={cn(
                  'rounded-xl border py-2 text-xs font-medium transition-colors',
                  frecuencia === f
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {FRECUENCIA_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {quedaDuplicada && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Esta ruta ya está planificada en la semana: quedará marcada como duplicada. Puedes guardarla igual, o usar
            «Eventual» si es una cobertura.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {editando ? (
            <Button variant="danger" onClick={() => onQuitar(estado.visita.id)} disabled={isSubmitting}>
              Quitar ruta
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            {editando ? (
              <Button
                onClick={() => onCambiarFrecuencia(estado.visita.id, frecuencia)}
                isLoading={isSubmitting}
                disabled={isSubmitting || sinCambios}
              >
                Guardar
              </Button>
            ) : (
              <Button
                onClick={() => idRuta !== null && onAgregar(estado.idSlot, idRuta, estado.dia, frecuencia)}
                isLoading={isSubmitting}
                disabled={isSubmitting || idRuta === null}
              >
                Planificar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
