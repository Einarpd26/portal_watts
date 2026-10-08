// Validación compartida (cliente y servidor) de las rutas comerciales (CU-05). Sin dependencias de Node.

/** Tamaño máximo del archivo GeoJSON (A2). El cuerpo de la API se configura con el mismo límite. */
export const GEOJSON_MAX_BYTES = 512 * 1024;
export const GEOJSON_MAX_VERTICES = 5000;

// Mismos límites que las zonas (no se importan de zonaValidation para que `npm test` cargue el archivo sin alias)
const CODIGO_MAX = 20;
const NOMBRE_MIN = 2;
const NOMBRE_MAX = 100;
const DESCRIPCION_MAX = 255;

// Mayúsculas, números, guion y guion bajo; sin espacios (igual que el código de zona)
const CODIGO_REGEX = /^[A-Z0-9][A-Z0-9_-]*$/;

export type Posicion = [number, number];
export interface PoligonoGeoJson {
  type: 'Polygon';
  coordinates: Posicion[][];
}

export type GeoJsonErrorCodigo =
  | 'vacio'
  | 'tamano'
  | 'json_invalido'
  | 'tipo'
  | 'multiples'
  | 'coordenadas'
  | 'rango'
  | 'anillo_abierto'
  | 'vertices';

export type GeoJsonInterpretado =
  | { ok: true; poligono: PoligonoGeoJson }
  | { ok: false; error: GeoJsonErrorCodigo; mensaje: string };

const fallo = (error: GeoJsonErrorCodigo, mensaje: string): GeoJsonInterpretado => ({ ok: false, error, mensaje });

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Extrae la geometría de un Polygon suelto, un Feature o un FeatureCollection con una sola entidad */
function extraerGeometria(raiz: Record<string, unknown>): { geometria: unknown } | GeoJsonInterpretado {
  if (raiz.type === 'Polygon') return { geometria: raiz };
  if (raiz.type === 'Feature') return { geometria: raiz.geometry };
  if (raiz.type === 'FeatureCollection') {
    const entidades = Array.isArray(raiz.features) ? raiz.features : [];
    if (entidades.length !== 1) {
      return fallo('multiples', 'El archivo debe contener una sola ruta (un único Polygon).');
    }
    const unica = entidades[0];
    return { geometria: esObjeto(unica) ? unica.geometry : null };
  }
  if (raiz.type === 'MultiPolygon') {
    return fallo('tipo', 'El archivo es un MultiPolygon: cada ruta debe ser un único Polygon.');
  }
  return fallo('tipo', 'El archivo debe ser un GeoJSON de tipo Polygon.');
}

/**
 * Interpreta el texto de un archivo GeoJSON y lo normaliza a un `Polygon` 2D con coordenadas
 * [longitud, latitud]. La validez geométrica (autointersección) y la superposición con otras
 * rutas las decide la base de datos con PostGIS; esta función cubre lo que se puede rechazar
 * antes de viajar al servidor.
 */
export function interpretarGeoJson(texto: string): GeoJsonInterpretado {
  if (!texto.trim()) return fallo('vacio', 'El archivo está vacío.');
  if (new TextEncoder().encode(texto).length > GEOJSON_MAX_BYTES) {
    return fallo('tamano', `El archivo supera el tamaño máximo de ${GEOJSON_MAX_BYTES / 1024} KB.`);
  }

  let raiz: unknown;
  try {
    raiz = JSON.parse(texto);
  } catch {
    return fallo('json_invalido', 'El archivo no es un JSON válido.');
  }
  if (!esObjeto(raiz)) return fallo('tipo', 'El archivo debe ser un GeoJSON de tipo Polygon.');

  const extraida = extraerGeometria(raiz);
  if ('ok' in extraida) return extraida;
  const geometria = extraida.geometria;
  if (!esObjeto(geometria) || geometria.type !== 'Polygon') {
    return fallo('tipo', 'La geometría debe ser de tipo Polygon (no se admiten MultiPolygon ni otros tipos).');
  }

  const anillos = geometria.coordinates;
  if (!Array.isArray(anillos) || anillos.length === 0) {
    return fallo('coordenadas', 'El Polygon no tiene coordenadas.');
  }

  let vertices = 0;
  const normalizados: Posicion[][] = [];
  for (const anillo of anillos) {
    if (!Array.isArray(anillo) || anillo.length < 4) {
      return fallo('coordenadas', 'Cada anillo necesita al menos 4 posiciones (el primero se repite al final).');
    }
    const posiciones: Posicion[] = [];
    for (const p of anillo) {
      if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        return fallo('coordenadas', 'Las posiciones deben ser [longitud, latitud] numéricas.');
      }
      const [lon, lat] = p as number[];
      if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
        return fallo('rango', 'Una coordenada está fuera de rango: usa [longitud, latitud] en grados (WGS84).');
      }
      posiciones.push([lon, lat]);
    }
    const primera = posiciones[0];
    const ultima = posiciones[posiciones.length - 1];
    if (primera[0] !== ultima[0] || primera[1] !== ultima[1]) {
      return fallo('anillo_abierto', 'El anillo no está cerrado: la primera y la última posición deben coincidir.');
    }
    vertices += posiciones.length;
    normalizados.push(posiciones);
  }
  if (vertices > GEOJSON_MAX_VERTICES) {
    return fallo('vertices', `El polígono supera el máximo de ${GEOJSON_MAX_VERTICES} vértices.`);
  }

  return { ok: true, poligono: { type: 'Polygon', coordinates: normalizados } };
}

export interface RutaEntrada {
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string;
  id_zona: number | null;
}

export interface RutaErrors {
  codigo_ruta?: string;
  ruta?: string;
  descripcion_ruta?: string;
  id_zona?: string;
}

export interface RutaNormalizada {
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string | null;
  id_zona: number | null;
}

export interface RutaValidation {
  isValid: boolean;
  errors: RutaErrors;
  data: RutaNormalizada;
}

/**
 * Valida y normaliza los datos administrativos de una ruta. El código se guarda en mayúsculas.
 * `exigirZona` es false al editar: el traslado entre zonas es otro caso de uso (CU-06).
 */
export function validarRuta(entrada: RutaEntrada, opciones: { exigirZona: boolean }): RutaValidation {
  const errors: RutaErrors = {};
  const codigo = entrada.codigo_ruta.trim().toUpperCase();
  const nombre = entrada.ruta.trim();
  const descripcion = entrada.descripcion_ruta.trim();

  if (!codigo) {
    errors.codigo_ruta = 'El código es obligatorio.';
  } else if (codigo.length > CODIGO_MAX) {
    errors.codigo_ruta = `El código no puede superar ${CODIGO_MAX} caracteres.`;
  } else if (!CODIGO_REGEX.test(codigo)) {
    errors.codigo_ruta = 'Usa solo letras, números, guion o guion bajo, sin espacios.';
  }

  if (nombre.length < NOMBRE_MIN) {
    errors.ruta = `El nombre debe tener al menos ${NOMBRE_MIN} caracteres.`;
  } else if (nombre.length > NOMBRE_MAX) {
    errors.ruta = `El nombre no puede superar ${NOMBRE_MAX} caracteres.`;
  }

  if (descripcion.length > DESCRIPCION_MAX) {
    errors.descripcion_ruta = `La descripción no puede superar ${DESCRIPCION_MAX} caracteres.`;
  }

  if (opciones.exigirZona && !(Number.isInteger(entrada.id_zona) && (entrada.id_zona as number) > 0)) {
    errors.id_zona = 'Selecciona una zona.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      codigo_ruta: codigo,
      ruta: nombre,
      descripcion_ruta: descripcion || null,
      id_zona: entrada.id_zona,
    },
  };
}
