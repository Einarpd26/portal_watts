// Informe de correcciones de la importación por lote (CU-16 A6, ADR-002 D9 punto 10).
// Clasifica cada ruta rechazada y dice qué hay que cambiar EN EL ORIGEN de los datos para que pase;
// no propone ni aplica polígonos corregidos. Sin dependencias: se usa en el servidor y el navegador.

/** Umbrales del solape, medidos contra la ruta menor de la pareja (fracción del 0 al 1) */
export const UMBRALES_SOLAPE = { astilla: 0.01, chico: 0.1, contenida: 0.95 } as const;

export type EstadoRuta = 'nueva' | 'actualizada' | 'sin_cambios' | 'rechazada';

export type TipoProblema =
  | 'astilla'
  | 'solape_chico'
  | 'solape_parcial'
  | 'contenida_en_otra'
  | 'contiene_a_otras'
  | 'geometria_invalida'
  | 'invasion'
  | 'cobertura_ajena'
  | 'zona_inexistente'
  | 'fuera_de_alcance'
  | 'ruta_en_otra_zona'
  | 'fuera_de_bolivia'
  | 'codigo_repetido'
  | 'datos_invalidos'
  | 'geometria'
  | 'error';

export const ETIQUETA_PROBLEMA: Record<TipoProblema, string> = {
  astilla: 'Astilla (menos del 1 % de la ruta menor)',
  solape_chico: 'Solape chico (1 % a 10 %)',
  solape_parcial: 'Solape parcial (10 % a 95 %)',
  contenida_en_otra: 'Contenida en otra ruta',
  contiene_a_otras: 'Contiene a otras rutas',
  geometria_invalida: 'Geometría inválida',
  invasion: 'Invade rutas de otra zona',
  cobertura_ajena: 'Cae dentro del contorno de otra zona',
  zona_inexistente: 'La zona no existe en la sucursal',
  fuera_de_alcance: 'Zona fuera de tu alcance',
  ruta_en_otra_zona: 'El código está en otra zona',
  fuera_de_bolivia: 'Fuera de Bolivia',
  codigo_repetido: 'Código repetido en el archivo',
  datos_invalidos: 'Datos inválidos',
  geometria: 'Geometría no válida para el formato',
  error: 'Error inesperado',
};

/** Una ruta en conflicto, tal como la devuelve la base de datos */
export interface ConflictoInforme {
  codigo_ruta: string;
  codigo_zona?: string | null;
  /** Área común, en m² */
  area_m2: number;
  /** Área de la ruta en conflicto, en m² */
  area_ruta_m2: number;
}

/** Resultado de una ruta en `ruta_lote_procesar` */
export interface ResultadoDeLote {
  indice: number;
  codigo_ruta: string;
  estado: EstadoRuta;
  motivo?: string;
  /** Zona en la que ya está la ruta (motivo `en_otra_zona`) */
  codigo_zona?: string;
  detalle?: string;
  /** Área de la ruta que se intentó guardar, en m² */
  area_m2?: number;
  conflictos?: ConflictoInforme[];
  invasiones?: Array<{ codigo_ruta: string; codigo_zona?: string | null }>;
  coberturas?: Array<{ codigo_zona: string }>;
}

/** Ruta que `interpretarLoteRutas` rechazó antes de consultar la base */
export interface RechazoDelArchivo {
  indice: number;
  codigo_ruta: string | null;
  motivo: 'datos_invalidos' | 'geometria' | 'fuera_de_bolivia' | 'codigo_repetido_en_archivo';
  mensaje: string;
}

export interface FilaInforme {
  /** Posición en el archivo, desde 1 */
  posicion: number;
  codigo_ruta: string | null;
  codigo_zona: string | null;
  estado: EstadoRuta;
  tipo: TipoProblema | null;
  problema: string;
  detalle: string;
  en_conflicto: string;
  area_comun_m2: number | null;
  pct_de_esta_ruta: number | null;
  pct_de_la_otra: number | null;
  accion: string;
}

const MAX_LISTA = 5;

const redondear = (n: number, decimales: number) => Math.round(n * 10 ** decimales) / 10 ** decimales;
/** Número para un texto: coma decimal, sin depender del idioma del equipo */
const numero = (n: number) => String(redondear(n, 2)).replace('.', ',');
const porcentaje = (parte: number, total: number) => (total > 0 ? redondear((parte / total) * 100, 1) : null);

/** "A, B, C y 2 más": una lista corta aunque haya cientos */
function listaCorta(items: string[]): string {
  if (items.length <= MAX_LISTA) return items.join(', ');
  return `${items.slice(0, MAX_LISTA).join(', ')} y ${items.length - MAX_LISTA} más`;
}

export interface ClasificacionSolape {
  tipo: 'astilla' | 'solape_chico' | 'solape_parcial' | 'contenida_en_otra' | 'contiene_a_otras';
  /** El conflicto con mayor fracción de solape */
  peor: ConflictoInforme | null;
  /** Rutas en conflicto que quedan casi enteras dentro de la ruta propia */
  contenidas: ConflictoInforme[];
}

/** Fracción de la ruta menor de la pareja que cubre el solape */
const fraccion = (propia: number, c: ConflictoInforme) => {
  const menor = Math.min(propia, c.area_ruta_m2);
  return menor > 0 ? c.area_m2 / menor : 0;
};

/**
 * Tipo de solape de una ruta rechazada por superposición. Se mide contra la ruta menor de cada
 * pareja; manda el peor conflicto. Sin conflictos conocidos se trata como parcial, para que alguien lo revise.
 */
export function clasificarSolape(areaPropia: number, conflictos: ConflictoInforme[]): ClasificacionSolape {
  if (conflictos.length === 0) return { tipo: 'solape_parcial', peor: null, contenidas: [] };

  const medidos = conflictos.map((c) => ({ c, f: fraccion(areaPropia, c) }));
  const peor = medidos.reduce((a, b) => (b.f > a.f ? b : a));
  const casiEnteras = medidos.filter((m) => m.f > UMBRALES_SOLAPE.contenida);

  if (casiEnteras.some((m) => areaPropia < m.c.area_ruta_m2)) {
    const dentroDe = casiEnteras.find((m) => areaPropia < m.c.area_ruta_m2)!;
    return { tipo: 'contenida_en_otra', peor: dentroDe.c, contenidas: [] };
  }
  if (casiEnteras.length > 0) {
    return { tipo: 'contiene_a_otras', peor: peor.c, contenidas: casiEnteras.map((m) => m.c) };
  }
  if (peor.f < UMBRALES_SOLAPE.astilla) return { tipo: 'astilla', peor: peor.c, contenidas: [] };
  if (peor.f < UMBRALES_SOLAPE.chico) return { tipo: 'solape_chico', peor: peor.c, contenidas: [] };
  return { tipo: 'solape_parcial', peor: peor.c, contenidas: [] };
}

interface Contexto {
  codigosDelArchivo: Set<string>;
  zonaSolicitada: string | null;
}

const nombreDeConflicto = (c: { codigo_ruta: string; codigo_zona?: string | null }, ctx: Contexto) =>
  ctx.codigosDelArchivo.has(c.codigo_ruta)
    ? `${c.codigo_ruta} (del mismo archivo)`
    : c.codigo_zona
      ? `${c.codigo_ruta} (zona ${c.codigo_zona})`
      : c.codigo_ruta;

const filaBase = (posicion: number, codigo: string | null, zona: string | null, estado: EstadoRuta): FilaInforme => ({
  posicion,
  codigo_ruta: codigo,
  codigo_zona: zona,
  estado,
  tipo: null,
  problema: '',
  detalle: '',
  en_conflicto: '',
  area_comun_m2: null,
  pct_de_esta_ruta: null,
  pct_de_la_otra: null,
  accion: '',
});

function conTipo(fila: FilaInforme, tipo: TipoProblema, accion: string, detalle = ''): FilaInforme {
  return { ...fila, tipo, problema: ETIQUETA_PROBLEMA[tipo], accion, detalle };
}

function filaDeSuperposicion(fila: FilaInforme, r: ResultadoDeLote, ctx: Contexto): FilaInforme {
  const conflictos = r.conflictos ?? [];
  const propia = r.area_m2 ?? 0;
  const clasif = clasificarSolape(propia, conflictos);
  const peor = clasif.peor;
  const detallada: FilaInforme = {
    ...fila,
    en_conflicto: listaCorta((clasif.tipo === 'contiene_a_otras' ? clasif.contenidas : conflictos).map((c) => nombreDeConflicto(c, ctx))),
    area_comun_m2: peor ? redondear(peor.area_m2, 2) : null,
    pct_de_esta_ruta: peor ? porcentaje(peor.area_m2, propia) : null,
    pct_de_la_otra: peor ? porcentaje(peor.area_m2, peor.area_ruta_m2) : null,
  };
  const con = peor ? nombreDeConflicto(peor, ctx) : 'otra ruta';

  switch (clasif.tipo) {
    case 'astilla':
      return conTipo(detallada, 'astilla', `Recortar el borde que comparte con ${con} (≈ ${numero(peor!.area_m2)} m²) en el origen.`);
    case 'solape_chico':
      return conTipo(
        detallada,
        'solape_chico',
        `Ajustar el límite que comparte con ${con}: se solapan ${numero(peor!.area_m2)} m² (${numero(detallada.pct_de_esta_ruta ?? 0)} % de esta ruta).`
      );
    case 'solape_parcial':
      return conTipo(
        detallada,
        'solape_parcial',
        peor
          ? `Redefinir el límite con ${con}: se solapan ${numero(peor.area_m2)} m² (${numero(detallada.pct_de_esta_ruta ?? 0)} % de esta ruta y ${numero(detallada.pct_de_la_otra ?? 0)} % de la otra).`
          : 'Se superpone con otra ruta: revisar el polígono en el origen.'
      );
    case 'contenida_en_otra':
      return conTipo(detallada, 'contenida_en_otra', `Esta ruta está dentro de ${con}. Decidir en el origen cuál conserva el área.`);
    case 'contiene_a_otras':
      return conTipo(
        detallada,
        'contiene_a_otras',
        `Contiene a ${clasif.contenidas.length} ${clasif.contenidas.length === 1 ? 'ruta' : 'rutas'}. Si es una ruta paraguas o de otro canal, excluirla del lote; si no, quitarle el área de las rutas que contiene.`
      );
  }
}

function filaDeRechazo(fila: FilaInforme, r: ResultadoDeLote, ctx: Contexto): FilaInforme {
  switch (r.motivo) {
    case 'superposicion':
      return filaDeSuperposicion(fila, r, ctx);
    case 'geometria_invalida':
      return conTipo(fila, 'geometria_invalida', `Corregir la geometría en el origen: ${r.detalle ?? 'el polígono no es válido'}.`, r.detalle ?? '');
    case 'no_poligono':
    case 'geojson_invalido':
      return conTipo(fila, 'geometria', 'Entregar la ruta como un único Polygon válido.');
    case 'invasion': {
      const lista = listaCorta((r.invasiones ?? []).map((i) => nombreDeConflicto(i, ctx)));
      return conTipo(
        { ...fila, en_conflicto: lista },
        'invasion',
        `La zona ${ctx.zonaSolicitada ?? ''} pasaría a cubrir rutas de otra zona (${lista}). Ajustar el polígono o trasladar antes esas rutas (CU-06).`
      );
    }
    case 'cobertura': {
      const zonas = listaCorta((r.coberturas ?? []).map((c) => `zona ${c.codigo_zona}`));
      return conTipo(
        { ...fila, en_conflicto: zonas },
        'cobertura_ajena',
        `El polígono quedaría dentro del contorno de la ${zonas}. Ajustar el polígono o pedir a la Gerencia o al Fiscalizador que modifique esa zona.`
      );
    }
    case 'zona_inexistente':
      return conTipo(
        fila,
        'zona_inexistente',
        `La zona ${ctx.zonaSolicitada ?? ''} no existe en la sucursal elegida. Crearla antes (CU-04) o corregir el código de zona en el origen.`
      );
    case 'fuera_de_alcance':
      return conTipo(fila, 'fuera_de_alcance', `La zona ${ctx.zonaSolicitada ?? ''} no está entre las zonas que puedes operar. Pedir la importación a quien la administra.`);
    case 'en_otra_zona':
    case 'duplicado':
      return conTipo(
        fila,
        'ruta_en_otra_zona',
        `El código ya existe en la zona ${r.codigo_zona ?? 'otra'}. Para pasarla a otra zona usa el traslado (CU-06); el lote no cambia la zona de una ruta.`
      );
    default:
      return conTipo(fila, 'error', 'No se pudo procesar esta ruta. Volver a intentar la importación.');
  }
}

function filaDeRechazoDelArchivo(r: RechazoDelArchivo): FilaInforme {
  const fila = filaBase(r.indice + 1, r.codigo_ruta, null, 'rechazada');
  switch (r.motivo) {
    case 'fuera_de_bolivia':
      return conTipo(fila, 'fuera_de_bolivia', 'Revisar en el origen que las coordenadas sean [longitud, latitud] y no [latitud, longitud].', r.mensaje);
    case 'codigo_repetido_en_archivo':
      return conTipo(fila, 'codigo_repetido', `${r.mensaje} Dejar una sola ruta con ese código en el origen.`, r.mensaje);
    case 'geometria':
      return conTipo(fila, 'geometria', `Corregir la geometría en el origen: ${r.mensaje}`, r.mensaje);
    default:
      return conTipo(fila, 'datos_invalidos', `Corregir en el origen: ${r.mensaje}`, r.mensaje);
  }
}

export interface EntradaInforme {
  resultados: ResultadoDeLote[];
  rechazadasDelArchivo: RechazoDelArchivo[];
  /** Código de la zona pedida por cada ruta del archivo, según su posición */
  zonasPorIndice: Map<number, string>;
  /** Códigos de ruta del archivo, para marcar los conflictos con rutas del mismo lote */
  codigosDelArchivo: Set<string>;
}

/** Une los rechazos del archivo con los resultados de la base y los ordena por posición en el archivo */
export function armarInforme(entrada: EntradaInforme): FilaInforme[] {
  const filas: FilaInforme[] = entrada.rechazadasDelArchivo.map(filaDeRechazoDelArchivo);

  for (const r of entrada.resultados) {
    const zona = entrada.zonasPorIndice.get(r.indice) ?? null;
    const base = filaBase(r.indice + 1, r.codigo_ruta, zona, r.estado);
    filas.push(r.estado === 'rechazada' ? filaDeRechazo(base, r, { codigosDelArchivo: entrada.codigosDelArchivo, zonaSolicitada: zona }) : base);
  }

  return filas.sort((a, b) => a.posicion - b.posicion);
}

export interface ResumenInforme {
  total: number;
  por_estado: Record<EstadoRuta, number>;
  por_tipo: Partial<Record<TipoProblema, number>>;
}

export function resumirInforme(filas: FilaInforme[]): ResumenInforme {
  const resumen: ResumenInforme = {
    total: filas.length,
    por_estado: { nueva: 0, actualizada: 0, sin_cambios: 0, rechazada: 0 },
    por_tipo: {},
  };
  for (const f of filas) {
    resumen.por_estado[f.estado] += 1;
    if (f.tipo) resumen.por_tipo[f.tipo] = (resumen.por_tipo[f.tipo] ?? 0) + 1;
  }
  return resumen;
}
