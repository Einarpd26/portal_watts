// Validación y traducción de resultados de la gestión de slots (CU-08, ADR-003)

export type ErrorSlot =
  | 'supervisor_invalido'
  | 'no_encontrada'
  | 'vendedor_fuera_de_equipo'
  | 'vendedor_ocupado'
  | 'direccion_invalida'
  | 'nombre_invalido'
  | 'orden_invalido'
  | 'error';

const ERRORES_DE_NEGOCIO: readonly ErrorSlot[] = [
  'supervisor_invalido',
  'no_encontrada',
  'vendedor_fuera_de_equipo',
  'vendedor_ocupado',
  'direccion_invalida',
  'nombre_invalido',
  'orden_invalido',
];

/** Largo máximo del nombre de un slot (el diseño de datos lo define de 50 caracteres) */
export const MAX_NOMBRE_SLOT = 50;

export interface ResultadoSlotDb {
  id?: number;
  movido?: boolean;
}

/** Interpreta el JSON que devuelven slot_crear, slot_asignar_vendedor y slot_mover */
export function interpretarResultadoSlot(
  valor: unknown
): { ok: true; datos: ResultadoSlotDb } | { ok: false; error: ErrorSlot } {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return { ok: false, error: 'error' };
  const json = valor as Record<string, unknown>;
  if (json.ok === true) {
    return {
      ok: true,
      datos: {
        id: typeof json.id === 'number' ? json.id : undefined,
        movido: typeof json.movido === 'boolean' ? json.movido : undefined,
      },
    };
  }
  const error = ERRORES_DE_NEGOCIO.find((e) => e === json.error);
  return { ok: false, error: error ?? 'error' };
}

const esIdValido = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Convierte el parámetro de ruta (`/slots/[id]`) en un id, o null si no es un entero positivo */
export function parsearIdSlot(valor: string | string[] | undefined): number | null {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return esIdValido(id) ? id : null;
}

/** Cuerpo de POST /api/planificacion/slots: el nombre es opcional; vacío usa el nombre por defecto */
export function validarNuevoSlot(cuerpo: unknown): { ok: true; nombre: string | null } | { ok: false; mensaje: string } {
  const nombre = (cuerpo as { nombre?: unknown } | null)?.nombre;
  if (nombre === undefined || nombre === null) return { ok: true, nombre: null };
  if (typeof nombre !== 'string') return { ok: false, mensaje: 'El nombre del slot debe ser texto.' };
  const limpio = nombre.trim();
  if (limpio.length > MAX_NOMBRE_SLOT) {
    return { ok: false, mensaje: `El nombre del slot no puede superar ${MAX_NOMBRE_SLOT} caracteres.` };
  }
  return { ok: true, nombre: limpio === '' ? null : limpio };
}

/** Cuerpo de PUT /api/planificacion/slots/[id]: `id_vendedor` es un id, o null para dejar el slot vacío */
export function validarAsignacionSlot(cuerpo: unknown): { ok: true; idVendedor: number | null } | { ok: false; mensaje: string } {
  const valor = (cuerpo as { id_vendedor?: unknown } | null)?.id_vendedor;
  if (valor === null) return { ok: true, idVendedor: null };
  if (esIdValido(valor)) return { ok: true, idVendedor: valor };
  return { ok: false, mensaje: 'Indica el vendedor o null para dejar el slot vacío.' };
}

/** Cuerpo de PATCH /api/planificacion/slots/[id]: el nombre es obligatorio, de hasta MAX_NOMBRE_SLOT caracteres */
export function validarRenombre(cuerpo: unknown): { ok: true; nombre: string } | { ok: false; mensaje: string } {
  const nombre = (cuerpo as { nombre?: unknown } | null)?.nombre;
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return { ok: false, mensaje: 'El nombre del slot no puede estar vacío.' };
  }
  const limpio = nombre.trim();
  if (limpio.length > MAX_NOMBRE_SLOT) {
    return { ok: false, mensaje: `El nombre del slot no puede superar ${MAX_NOMBRE_SLOT} caracteres.` };
  }
  return { ok: true, nombre: limpio };
}

/** Cuerpo de PUT /api/planificacion/slots/orden: los ids de todos sus slots, en el orden nuevo */
export function validarOrdenSlots(cuerpo: unknown): { ok: true; ids: number[] } | { ok: false; mensaje: string } {
  const ids = (cuerpo as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500 || !ids.every(esIdValido)) {
    return { ok: false, mensaje: 'Indica el orden de tus slots.' };
  }
  if (new Set(ids).size !== ids.length) return { ok: false, mensaje: 'El orden tiene slots repetidos.' };
  return { ok: true, ids };
}

/** Cuerpo de POST /api/planificacion/slots/[id]/mover */
export function validarMovimiento(cuerpo: unknown): { ok: true; direccion: 'arriba' | 'abajo' } | { ok: false; mensaje: string } {
  const direccion = (cuerpo as { direccion?: unknown } | null)?.direccion;
  if (direccion === 'arriba' || direccion === 'abajo') return { ok: true, direccion };
  return { ok: false, mensaje: 'La dirección debe ser «arriba» o «abajo».' };
}

/** Estado HTTP y mensaje al usuario para cada error de negocio */
export function respuestaDeErrorSlot(error: ErrorSlot): { status: number; mensaje: string } {
  switch (error) {
    case 'supervisor_invalido':
      return { status: 403, mensaje: 'Solo un supervisor activo gestiona los slots de su equipo.' };
    case 'no_encontrada':
      return { status: 404, mensaje: 'El slot no existe o no es tuyo.' };
    case 'vendedor_fuera_de_equipo':
      return { status: 400, mensaje: 'Ese vendedor no pertenece a tu equipo.' };
    case 'vendedor_ocupado':
      return { status: 409, mensaje: 'Ese vendedor ya ocupa otro slot: libéralo primero.' };
    case 'direccion_invalida':
      return { status: 400, mensaje: 'La dirección debe ser «arriba» o «abajo».' };
    case 'orden_invalido':
      return { status: 409, mensaje: 'Tus slots cambiaron: se recargó la lista, vuelve a intentarlo.' };
    case 'nombre_invalido':
      return { status: 400, mensaje: `El nombre del slot es obligatorio y de hasta ${MAX_NOMBRE_SLOT} caracteres.` };
    default:
      return { status: 500, mensaje: 'No se pudo completar la operación.' };
  }
}
