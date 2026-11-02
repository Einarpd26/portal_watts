"use client";

import { useRef, useState, type KeyboardEvent } from 'react';
import { DIAS_ORDEN } from '@/utils/diasSemana';
import { MAX_NOMBRE_SLOT } from '@/utils/slotValidation';
import { cn } from '@/utils/cn';
import type { SlotItem, VendedorDisponible } from '@/types';

interface FilaSlotProps {
  slot: SlotItem;
  posicion: number;
  total: number;
  /** Vendedores del equipo sin slot, que se pueden asignar a este */
  disponibles: VendedorDisponible[];
  /** Modo edición: habilita renombrar, asignar, reordenar y eliminar */
  editMode: boolean;
  deshabilitado: boolean;
  onAsignar: (idSlot: number, idVendedor: number | null) => void;
  onRenombrar: (idSlot: number, nombre: string) => void;
  onEliminar: (idSlot: number) => void;
  onMover: (idSlot: number, direccion: 'arriba' | 'abajo') => void;
}

const BOTON_FLECHA =
  'flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-xs text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30';

export default function FilaSlot({
  slot,
  posicion,
  total,
  disponibles,
  editMode,
  deshabilitado,
  onAsignar,
  onRenombrar,
  onEliminar,
  onMover,
}: FilaSlotProps) {
  const nombre = slot.nombre ?? `Slot ${posicion}`;
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nombre);
  const [confirmando, setConfirmando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const empezarEdicion = () => {
    setValor(nombre);
    setEditando(true);
    setConfirmando(false);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const confirmarNombre = () => {
    setEditando(false);
    const limpio = valor.trim();
    if (limpio && limpio !== nombre) onRenombrar(slot.id, limpio);
  };

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      setValor(nombre);
      setEditando(false);
    }
  };

  return (
    <tr className="border-t border-gray-200">
      <td className="sticky left-0 z-10 w-[200px] min-w-[200px] border-r border-gray-200 bg-white px-2 py-2 md:w-auto md:min-w-0">
        <div className="flex items-start gap-2">
          {editMode && (
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                aria-label={`Subir ${nombre}`}
                className={BOTON_FLECHA}
                disabled={deshabilitado || posicion === 1}
                onClick={() => onMover(slot.id, 'arriba')}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Bajar ${nombre}`}
                className={BOTON_FLECHA}
                disabled={deshabilitado || posicion === total}
                onClick={() => onMover(slot.id, 'abajo')}
              >
                ↓
              </button>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {confirmando ? (
              <div className="flex flex-col gap-1.5 py-0.5">
                <span className="text-xs text-gray-600">¿Eliminar este slot?</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmando(false);
                      onEliminar(slot.id);
                    }}
                    className="flex-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {editando ? (
                  <input
                    ref={inputRef}
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    onBlur={confirmarNombre}
                    onKeyDown={alTeclear}
                    maxLength={MAX_NOMBRE_SLOT}
                    aria-label="Nombre del slot"
                    className="w-full truncate border-b border-primary-400 bg-transparent text-xs font-semibold text-gray-900 outline-none"
                  />
                ) : editMode ? (
                  <button
                    type="button"
                    onClick={empezarEdicion}
                    disabled={deshabilitado}
                    title="Editar nombre"
                    className="w-full truncate text-left text-xs font-semibold text-gray-900 transition hover:text-primary-600"
                  >
                    {nombre}
                  </button>
                ) : (
                  <span className="truncate text-xs font-semibold text-gray-900">{nombre}</span>
                )}

                <select
                  aria-label={`Vendedor de ${nombre}`}
                  value={slot.id_vendedor ?? ''}
                  disabled={!editMode || deshabilitado}
                  onChange={(e) => onAsignar(slot.id, e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    'w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none transition focus:border-primary-600',
                    slot.id_vendedor === null ? 'text-gray-400' : 'text-gray-800',
                    !editMode && 'cursor-default appearance-none border-transparent bg-transparent px-0'
                  )}
                >
                  <option value="">Sin asignar</option>
                  {slot.id_vendedor !== null && (
                    <option value={slot.id_vendedor}>{slot.vendedor_nombre ?? `Persona ${slot.id_vendedor}`}</option>
                  )}
                  {disponibles.map((v) => (
                    <option key={v.id_persona} value={v.id_persona}>
                      {v.nombre}
                    </option>
                  ))}
                </select>

                {editMode && (
                  <button
                    type="button"
                    onClick={() => setConfirmando(true)}
                    disabled={deshabilitado}
                    className="self-start rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    Eliminar slot
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </td>

      {/* Celdas de día: sin rutas por ahora; el siguiente paso las llena con la planificación (CU-09) */}
      {DIAS_ORDEN.map((dia) => (
        <td key={dia} className="min-w-0 overflow-hidden border-r border-gray-200 bg-zinc-50 p-2 last:border-r-0" aria-label={`${nombre}, ${dia}`}>
          <div className="min-h-[2rem]" />
        </td>
      ))}
    </tr>
  );
}
