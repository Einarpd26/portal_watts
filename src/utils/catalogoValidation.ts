// Validación compartida (cliente y servidor) de los catálogos maestros editables:
// sucursales y cargos. Sin dependencias de Node.
export const CATALOGO_TIPOS = ['sucursales', 'cargos'] as const;
export type CatalogoTipo = (typeof CATALOGO_TIPOS)[number];

export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 100;
export const DESCRIPCION_MAX = 255;

export interface CatalogoErrors {
  nombre?: string;
  descripcion?: string;
}

export interface CatalogoValidation {
  isValid: boolean;
  errors: CatalogoErrors;
  data: { nombre: string; descripcion: string };
}

export function esCatalogoTipo(value: unknown): value is CatalogoTipo {
  return typeof value === 'string' && (CATALOGO_TIPOS as readonly string[]).includes(value);
}

/**
 * Valida el nombre y la descripción de una sucursal o un cargo.
 * La descripción es obligatoria en sucursales (columna NOT NULL) y opcional en cargos.
 */
export function validarCatalogo(
  tipo: CatalogoTipo,
  nombre: string,
  descripcion: string
): CatalogoValidation {
  const errors: CatalogoErrors = {};
  const nombreLimpio = nombre.trim();
  const descripcionLimpia = descripcion.trim();

  if (nombreLimpio.length < NOMBRE_MIN) {
    errors.nombre = `El nombre debe tener al menos ${NOMBRE_MIN} caracteres.`;
  } else if (nombreLimpio.length > NOMBRE_MAX) {
    errors.nombre = `El nombre no puede superar ${NOMBRE_MAX} caracteres.`;
  }

  if (tipo === 'sucursales' && !descripcionLimpia) {
    errors.descripcion = 'La descripción es obligatoria.';
  } else if (descripcionLimpia.length > DESCRIPCION_MAX) {
    errors.descripcion = `La descripción no puede superar ${DESCRIPCION_MAX} caracteres.`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { nombre: nombreLimpio, descripcion: descripcionLimpia },
  };
}
