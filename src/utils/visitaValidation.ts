// Validación y traducción de resultados de la planificación de rutas por día (CU-09, RN-04 y RN-05)
// Autocontenida (solo importa tipos) para poder probarla con node --test; las listas de días y
// frecuencias repiten las de diasSemana.ts y frecuencias.ts, y una prueba vigila que coincidan.
import type { Frecuencia } from '@/types';
import type { DiaKey } from '@/utils/diasSemana';

const DIAS_VALIDOS: readonly string[] = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
const FRECUENCIAS_VALIDAS: readonly string[] = ['semanal', 'impar', 'par', 'eventual'];

const esDia = (v: unknown): v is DiaKey => typeof v === 'string' && DIAS_VALIDOS.includes(v);
const esFrecuencia = (v: unknown): v is Frecuencia => typeof v === 'string' && FRECUENCIAS_VALIDAS.includes(v);

/** Para la prueba de sincronía con diasSemana.ts y frecuencias.ts */
export const DIAS_ACEPTADOS = DIAS_VALIDOS;
export const FRECUENCIAS_ACEPTADAS = FRECUENCIAS_VALIDAS;

export type ErrorVisita =
  | 'supervisor_invalido'
  | 'no_encontrada'
  | 'ruta_invalida'
  | 'ruta_fuera_de_zona'
  | 'dia_invalido'
  | 'frecuencia_invalida'
  | 'ya_planificada'
  | 'error';

const ERRORES_DE_NEGOCIO: readonly ErrorVisita[] = [
  'supervisor_invalido',
  'no_encontrada',
  'ruta_invalida',
  'ruta_fuera_de_zona',
  'dia_invalido',
  'frecuencia_invalida',
  'ya_planificada',
];

/** Interpreta el JSON que devuelven planificacion_agregar, _cambiar_frecuencia y _quitar */
export function interpretarResultadoVisita(
  valor: unknown
): { ok: true; id: number | undefined } | { ok: false; error: ErrorVisita } {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return { ok: false, error: 'error' };
  const json = valor as Record<string, unknown>;
  if (json.ok === true) return { ok: true, id: typeof json.id === 'number' ? json.id : undefined };
  const error = ERRORES_DE_NEGOCIO.find((e) => e === json.error);
  return { ok: false, error: error ?? 'error' };
}

const esIdValido = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Convierte el parámetro de ruta (`/visitas/[id]`) en un id, o null si no es un entero positivo */
export function parsearIdVisita(valor: string | string[] | undefined): number | null {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return esIdValido(id) ? id : null;
}

/** Cuerpo de POST /api/planificacion/visitas; la frecuencia por defecto es semanal */
export function validarNuevaVisita(
  cuerpo: unknown
): { ok: true; idSlot: number; idRuta: number; dia: DiaKey; frecuencia: Frecuencia } | { ok: false; mensaje: string } {
  const { id_slot, id_ruta, dia, frecuencia } = (cuerpo ?? {}) as Record<string, unknown>;
  if (!esIdValido(id_slot)) return { ok: false, mensaje: 'Indica el slot.' };
  if (!esIdValido(id_ruta)) return { ok: false, mensaje: 'Indica la ruta.' };
  if (!esDia(dia)) return { ok: false, mensaje: 'El día debe ser de lunes a sábado.' };
  if (frecuencia !== undefined && !esFrecuencia(frecuencia)) return { ok: false, mensaje: 'La frecuencia no es válida.' };
  return { ok: true, idSlot: id_slot, idRuta: id_ruta, dia, frecuencia: frecuencia ?? 'semanal' };
}

/** Cuerpo de PATCH /api/planificacion/visitas/[id] */
export function validarCambioFrecuencia(cuerpo: unknown): { ok: true; frecuencia: Frecuencia } | { ok: false; mensaje: string } {
  const frecuencia = (cuerpo as { frecuencia?: unknown } | null)?.frecuencia;
  return esFrecuencia(frecuencia) ? { ok: true, frecuencia } : { ok: false, mensaje: 'La frecuencia no es válida.' };
}

/** Estado HTTP y mensaje al usuario para cada error de negocio */
export function respuestaDeErrorVisita(error: ErrorVisita): { status: number; mensaje: string } {
  switch (error) {
    case 'supervisor_invalido':
      return { status: 403, mensaje: 'Solo un supervisor activo planifica en sus slots.' };
    case 'no_encontrada':
      return { status: 404, mensaje: 'El slot o la visita no existe o no es tuya.' };
    case 'ruta_invalida':
      return { status: 400, mensaje: 'La ruta no existe.' };
    case 'ruta_fuera_de_zona':
      return { status: 403, mensaje: 'Solo puedes planificar rutas de las zonas que supervisas.' };
    case 'dia_invalido':
      return { status: 400, mensaje: 'El día debe ser de lunes a sábado.' };
    case 'frecuencia_invalida':
      return { status: 400, mensaje: 'La frecuencia no es válida.' };
    case 'ya_planificada':
      return { status: 409, mensaje: 'Esa ruta ya está planificada en ese slot, día y frecuencia.' };
    default:
      return { status: 500, mensaje: 'No se pudo completar la operación.' };
  }
}
