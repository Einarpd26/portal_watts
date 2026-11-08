// Validación y traducción de resultados del equipo de supervisor (CU-08, ADR-003)

export type ErrorEquipo =
  | 'vendedor_invalido'
  | 'supervisor_invalido'
  | 'sucursal_distinta'
  | 'fuera_de_alcance'
  | 'supervisor_activo'
  | 'mismo_supervisor'
  | 'sin_equipo'
  | 'no_encontrado'
  | 'error';

const ERRORES_DE_NEGOCIO: readonly ErrorEquipo[] = [
  'vendedor_invalido',
  'supervisor_invalido',
  'sucursal_distinta',
  'fuera_de_alcance',
  'supervisor_activo',
  'mismo_supervisor',
  'sin_equipo',
];

export interface ResultadoEquipoDb {
  anterior?: number | null;
  slots_liberados?: number;
  vendedores?: number;
  slots?: number;
}

/** Interpreta el JSON que devuelven equipo_asignar_vendedor y supervisor_reemplazar */
export function interpretarResultadoEquipo(
  valor: unknown
): { ok: true; datos: ResultadoEquipoDb } | { ok: false; error: ErrorEquipo } {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return { ok: false, error: 'error' };
  const json = valor as Record<string, unknown>;
  if (json.ok === true) {
    const numero = (v: unknown) => (typeof v === 'number' ? v : undefined);
    return {
      ok: true,
      datos: {
        anterior: typeof json.anterior === 'number' ? json.anterior : null,
        slots_liberados: numero(json.slots_liberados),
        vendedores: numero(json.vendedores),
        slots: numero(json.slots),
      },
    };
  }
  const error = ERRORES_DE_NEGOCIO.find((e) => e === json.error);
  return { ok: false, error: error ?? 'error' };
}

const esIdValido = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Convierte el parámetro de ruta (`/vendedor/[id]`) en un id, o null si no es un entero positivo */
export function parsearId(valor: string | string[] | undefined): number | null {
  if (typeof valor !== 'string' || !/^\d+$/.test(valor)) return null;
  const id = Number(valor);
  return esIdValido(id) ? id : null;
}

/** Cuerpo de PUT /api/admin/equipos/vendedor/[id]: `id_supervisor` es un id, o null para quitar */
export function validarAsignacion(cuerpo: unknown): { ok: true; idSupervisor: number | null } | { ok: false; mensaje: string } {
  const valor = (cuerpo as { id_supervisor?: unknown } | null)?.id_supervisor;
  if (valor === null) return { ok: true, idSupervisor: null };
  if (esIdValido(valor)) return { ok: true, idSupervisor: valor };
  return { ok: false, mensaje: 'Indica el supervisor o null para dejar al vendedor sin supervisor.' };
}

/** Cuerpo de POST /api/admin/equipos/reemplazar */
export function validarReemplazo(
  cuerpo: unknown
): { ok: true; idInactivo: number; idNuevo: number } | { ok: false; mensaje: string } {
  const { id_inactivo, id_nuevo } = (cuerpo ?? {}) as { id_inactivo?: unknown; id_nuevo?: unknown };
  if (!esIdValido(id_inactivo) || !esIdValido(id_nuevo)) {
    return { ok: false, mensaje: 'Indica el supervisor a reemplazar y el supervisor nuevo.' };
  }
  if (id_inactivo === id_nuevo) {
    return { ok: false, mensaje: 'El supervisor nuevo debe ser distinto del que se reemplaza.' };
  }
  return { ok: true, idInactivo: id_inactivo, idNuevo: id_nuevo };
}

/** Estado HTTP y mensaje al usuario para cada error de negocio */
export function respuestaDeError(error: ErrorEquipo): { status: number; mensaje: string } {
  switch (error) {
    case 'vendedor_invalido':
      return { status: 400, mensaje: 'El colaborador no es un vendedor vigente.' };
    case 'supervisor_invalido':
      return { status: 400, mensaje: 'El colaborador no es un supervisor activo con acceso.' };
    case 'sucursal_distinta':
      return { status: 400, mensaje: 'El supervisor y el vendedor deben ser de la misma sucursal.' };
    case 'fuera_de_alcance':
      return { status: 403, mensaje: 'Solo puedes administrar equipos de tu sucursal.' };
    case 'supervisor_activo':
      return { status: 409, mensaje: 'Ese supervisor sigue activo: solo se reemplaza a un supervisor retirado.' };
    case 'mismo_supervisor':
      return { status: 400, mensaje: 'El supervisor nuevo debe ser distinto del que se reemplaza.' };
    case 'sin_equipo':
      return { status: 409, mensaje: 'Ese supervisor no tiene equipo ni slots que traspasar.' };
    case 'no_encontrado':
      return { status: 404, mensaje: 'No se encontró ese supervisor entre los de tu alcance.' };
    default:
      return { status: 500, mensaje: 'No se pudo completar la operación.' };
  }
}
