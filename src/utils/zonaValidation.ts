// Validación compartida (cliente y servidor) de las zonas comerciales (CU-04).
// Sin dependencias de Node.
export const CODIGO_MAX = 20;
export const NOMBRE_MIN = 2;
export const NOMBRE_MAX = 100;
export const DESCRIPCION_MAX = 255;
export const CANAL_MAX = 50;

// Mayúsculas, números, guion y guion bajo; sin espacios
const CODIGO_REGEX = /^[A-Z0-9][A-Z0-9_-]*$/;

export interface ZonaEntrada {
  codigo_zona: string;
  zona: string;
  descripcion_zona: string;
  canal_venta: string;
  id_sucursal: number | null;
}

export interface ZonaErrors {
  codigo_zona?: string;
  zona?: string;
  descripcion_zona?: string;
  canal_venta?: string;
  id_sucursal?: string;
}

export interface ZonaNormalizada {
  codigo_zona: string;
  zona: string;
  descripcion_zona: string | null;
  canal_venta: string | null;
  id_sucursal: number | null;
}

export interface ZonaValidation {
  isValid: boolean;
  errors: ZonaErrors;
  data: ZonaNormalizada;
}

/**
 * Valida y normaliza una zona. El código se guarda en mayúsculas para que "zn" y "ZN" no
 * puedan coexistir dentro de una sucursal. `exigirSucursal` es false al editar, porque una zona
 * no cambia de sucursal (cambiaría la jurisdicción de sus rutas).
 */
export function validarZona(entrada: ZonaEntrada, opciones: { exigirSucursal: boolean }): ZonaValidation {
  const errors: ZonaErrors = {};
  const codigo = entrada.codigo_zona.trim().toUpperCase();
  const nombre = entrada.zona.trim();
  const descripcion = entrada.descripcion_zona.trim();
  const canal = entrada.canal_venta.trim();

  if (!codigo) {
    errors.codigo_zona = 'El código es obligatorio.';
  } else if (codigo.length > CODIGO_MAX) {
    errors.codigo_zona = `El código no puede superar ${CODIGO_MAX} caracteres.`;
  } else if (!CODIGO_REGEX.test(codigo)) {
    errors.codigo_zona = 'Usa solo letras, números, guion o guion bajo, sin espacios.';
  }

  if (nombre.length < NOMBRE_MIN) {
    errors.zona = `El nombre debe tener al menos ${NOMBRE_MIN} caracteres.`;
  } else if (nombre.length > NOMBRE_MAX) {
    errors.zona = `El nombre no puede superar ${NOMBRE_MAX} caracteres.`;
  }

  if (descripcion.length > DESCRIPCION_MAX) {
    errors.descripcion_zona = `La descripción no puede superar ${DESCRIPCION_MAX} caracteres.`;
  }

  if (canal.length > CANAL_MAX) {
    errors.canal_venta = `El canal de venta no puede superar ${CANAL_MAX} caracteres.`;
  }

  if (opciones.exigirSucursal && !(Number.isInteger(entrada.id_sucursal) && (entrada.id_sucursal as number) > 0)) {
    errors.id_sucursal = 'Selecciona una sucursal.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      codigo_zona: codigo,
      zona: nombre,
      descripcion_zona: descripcion || null,
      canal_venta: canal || null,
      id_sucursal: entrada.id_sucursal,
    },
  };
}
