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

  // Las rutas sin planificar van primero (son las que falta asignar); las ya planificadas quedan abajo,
  // con los días en que se visitan. Siguen siendo elegibles: planificarlas otra vez las marca duplicadas.
  const { sinPlanificar, yaPlanificadas, diasPorRuta } = useMemo(() => {
    const dias = new Map<number, Set<DiaKey>>();
    for (const v of visitas) {
      if (!dias.has(v.id_ruta)) dias.set(v.id_ruta, new Set());
      dias.get(v.id_ruta)?.add(v.dia);
    }
    return {
      sinPlanificar: filtradas.filter((r) => !dias.has(r.id)),
      yaPlanificadas: filtradas.filter((r) => dias.has(r.id)),
      diasPorRuta: dias,
    };
  }, [filtradas, visitas]);
  const totalSinPlanificar = useMemo(() => {
    const planificadas = new Set(visitas.map((v) => v.id_ruta));
    return rutas.filter((r) => !planificadas.has(r.id)).length;
  }, [rutas, visitas]);

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
            <p className="text-xs text-gray-500">
              {totalSinPlanificar === 0
                ? 'Todas tus rutas ya están planificadas.'
                : `${totalSinPlanificar} de ${rutas.length} rutas sin planificar.`}
            </p>
            <Input
              label="Buscar ruta"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Código, nombre o zona"
              disabled={isSubmitting}
            />
            <ul className="max-h-56 overflow-y-auto rounded-lg border border-gray-200" role="listbox" aria-label="Rutas de tus zonas">
              {filtradas.length === 0 && (
                <li className="px-3 py-2 text-xs text-gray-400">
                  {rutas.length === 0 ? 'Tus zonas todavía no tienen rutas.' : 'Sin resultados.'}
                </li>
              )}
              {sinPlanificar.map((r) => (
                <OpcionRuta key={r.id} ruta={r} seleccionada={idRuta === r.id} onElegir={setIdRuta} />
              ))}
              {yaPlanificadas.length > 0 && (
                <li className="sticky top-0 border-y border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600" role="presentation">
                  Ya planificadas ({yaPlanificadas.length})
                </li>
              )}
              {yaPlanificadas.map((r) => (
                <OpcionRuta
                  key={r.id}
                  ruta={r}
                  seleccionada={idRuta === r.id}
                  onElegir={setIdRuta}
                  dias={[...(diasPorRuta.get(r.id) ?? [])]}
                />
              ))}
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

function OpcionRuta({
  ruta,
  seleccionada,
  onElegir,
  dias,
}: {
  ruta: RutaPlanificable;
  seleccionada: boolean;
  onElegir: (id: number) => void;
  /** Días en que la ruta ya se visita; ausente si todavía no está planificada */
  dias?: DiaKey[];
}) {
  const planificada = dias !== undefined;
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={seleccionada}
        onClick={() => onElegir(ruta.id)}
        className={cn(
          'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition',
          planificada ? 'bg-indigo-50/40 text-indigo-700 hover:bg-indigo-50' : 'hover:bg-gray-50',
          seleccionada && 'bg-primary-50 font-semibold text-primary-700 ring-1 ring-inset ring-primary-300'
        )}
      >
        <span>
          {ruta.codigo_ruta} — {ruta.ruta}
          <span className="ml-2 text-xs text-gray-400">{ruta.codigo_zona}</span>
        </span>
        {planificada && (
          <span className="shrink-0 rounded bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
            {dias.map((d) => DIA_LABELS[d].slice(0, 3)).join(', ')}
          </span>
        )}
      </button>
    </li>
  );
}
