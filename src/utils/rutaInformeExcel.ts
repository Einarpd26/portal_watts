// Hojas del informe de correcciones en Excel (CU-16 A6). Solo arma los datos: la biblioteca
// `write-excel-file` los convierte en el archivo, en el navegador (ver `descargarInformeExcel`).
// Sin imports de código entre utils, para que `node --experimental-strip-types` cargue el archivo.
import type { EstadoRuta, FilaInforme, ResumenInforme, TipoProblema } from './rutaInforme';

type Color = `#${string}`;

export interface EstiloCelda {
  value: string | number | boolean;
  format?: string;
  fontWeight?: 'bold';
  fontSize?: number;
  backgroundColor?: Color;
  wrap?: boolean;
  alignVertical?: 'top' | 'center' | 'bottom';
}
export type CeldaExcel = null | string | number | EstiloCelda;

export interface HojaExcel {
  sheet: string;
  data: CeldaExcel[][];
  columns: Array<{ width: number }>;
  stickyRowsCount: number;
}

export interface MetaInforme {
  sucursal: string;
  archivo: string;
  generado: string;
  /** false: era una vista previa y todavía no se guardó nada */
  confirmado: boolean;
}

const COLOR_TITULO: Color = '#D9E1F2';

/** Un color por familia de problema, para ver de un vistazo qué hay que atender */
const COLOR_DEL_TIPO: Record<TipoProblema, Color> = {
  astilla: '#FFF2CC',
  solape_chico: '#FFE699',
  solape_parcial: '#F8CBAD',
  contenida_en_otra: '#F4B183',
  contiene_a_otras: '#F4B183',
  geometria_invalida: '#E6B8B7',
  geometria: '#E6B8B7',
  invasion: '#D9D2E9',
  cobertura_ajena: '#D9D2E9',
  zona_inexistente: '#DDEBF7',
  fuera_de_alcance: '#DDEBF7',
  ruta_en_otra_zona: '#DDEBF7',
  fuera_de_bolivia: '#FCE4D6',
  codigo_repetido: '#FCE4D6',
  datos_invalidos: '#EDEDED',
  error: '#EDEDED',
};

const NOMBRE_DE_ESTADO: Record<EstadoRuta, string> = {
  nueva: 'Nueva',
  actualizada: 'Actualizada',
  sin_cambios: 'Sin cambios',
  rechazada: 'Rechazada',
};

const titulo = (value: string): EstiloCelda => ({
  value,
  fontWeight: 'bold',
  backgroundColor: COLOR_TITULO,
  wrap: true,
  alignVertical: 'center',
});

/** Texto que Excel no debe reinterpretar como número o fecha */
const codigo = (value: string | null): CeldaExcel => (value === null ? null : { value, format: '@', alignVertical: 'top' });
const largo = (value: string): EstiloCelda => ({ value, wrap: true, alignVertical: 'top' });
const numero = (value: number | null): CeldaExcel => (value === null ? null : { value, alignVertical: 'top' });

function hojaResumen(filas: FilaInforme[], resumen: ResumenInforme, meta: MetaInforme): HojaExcel {
  const etiquetaDe = (tipo: TipoProblema) => filas.find((f) => f.tipo === tipo)?.problema ?? tipo;
  const tipos = (Object.entries(resumen.por_tipo) as Array<[TipoProblema, number]>).sort((a, b) => b[1] - a[1]);

  const data: CeldaExcel[][] = [
    [{ value: 'Informe de importación de rutas', fontWeight: 'bold', fontSize: 14 }],
    ['Sucursal', meta.sucursal],
    ['Archivo', meta.archivo],
    ['Generado', meta.generado],
    ['Estado del informe', meta.confirmado ? 'Importación confirmada' : 'Vista previa: todavía no se guardó nada'],
    [null],
    [titulo('Resultado'), titulo('Cantidad')],
    ['Rutas en el archivo', resumen.total],
    ['Nuevas', resumen.por_estado.nueva],
    ['Actualizadas', resumen.por_estado.actualizada],
    ['Sin cambios', resumen.por_estado.sin_cambios],
    ['Rechazadas', resumen.por_estado.rechazada],
  ];
  if (tipos.length > 0) {
    data.push([null], [titulo('Problemas de las rutas rechazadas'), titulo('Cantidad')]);
    for (const [tipo, cantidad] of tipos) {
      data.push([{ value: etiquetaDe(tipo), backgroundColor: COLOR_DEL_TIPO[tipo] }, cantidad]);
    }
  }
  return { sheet: 'Resumen', data, columns: [{ width: 44 }, { width: 44 }], stickyRowsCount: 0 };
}

const TITULOS_RECHAZADAS = [
  'Posición',
  'Código de ruta',
  'Zona',
  'Tipo de problema',
  'Detalle',
  'Rutas en conflicto',
  'Área en común (m²)',
  '% de esta ruta',
  '% de la otra ruta',
  'Qué corregir en el origen',
];

function hojaRechazadas(filas: FilaInforme[]): HojaExcel {
  const rechazadas = filas.filter((f) => f.estado === 'rechazada');
  const data: CeldaExcel[][] = [TITULOS_RECHAZADAS.map(titulo)];

  if (rechazadas.length === 0) {
    data.push([{ value: 'Ninguna ruta fue rechazada.', alignVertical: 'top' }, ...TITULOS_RECHAZADAS.slice(1).map(() => null)]);
  }
  for (const f of rechazadas) {
    data.push([
      { value: f.posicion, alignVertical: 'top' },
      codigo(f.codigo_ruta),
      f.codigo_zona === null ? null : { value: f.codigo_zona, format: '@', alignVertical: 'top' },
      { value: f.problema, backgroundColor: f.tipo ? COLOR_DEL_TIPO[f.tipo] : undefined, wrap: true, alignVertical: 'top' },
      largo(f.detalle),
      largo(f.en_conflicto),
      numero(f.area_comun_m2),
      numero(f.pct_de_esta_ruta),
      numero(f.pct_de_la_otra),
      largo(f.accion),
    ]);
  }
  return {
    sheet: 'Rechazadas',
    data,
    columns: [{ width: 9 }, { width: 16 }, { width: 10 }, { width: 34 }, { width: 40 }, { width: 38 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 70 }],
    stickyRowsCount: 1,
  };
}

function hojaImportadas(filas: FilaInforme[]): HojaExcel {
  const importadas = filas.filter((f) => f.estado !== 'rechazada');
  const data: CeldaExcel[][] = [['Posición', 'Código de ruta', 'Zona', 'Resultado'].map(titulo)];
  for (const f of importadas) {
    data.push([
      f.posicion,
      codigo(f.codigo_ruta),
      f.codigo_zona === null ? null : { value: f.codigo_zona, format: '@' },
      NOMBRE_DE_ESTADO[f.estado],
    ]);
  }
  return { sheet: 'Importadas', data, columns: [{ width: 9 }, { width: 16 }, { width: 10 }, { width: 18 }], stickyRowsCount: 1 };
}

/** Las tres hojas del informe: Resumen, Rechazadas (lo que hay que corregir) e Importadas */
export function hojasDelInforme(filas: FilaInforme[], resumen: ResumenInforme, meta: MetaInforme): HojaExcel[] {
  return [hojaResumen(filas, resumen, meta), hojaRechazadas(filas), hojaImportadas(filas)];
}

const dos = (n: number) => String(n).padStart(2, '0');

export function nombreDelArchivo(fecha: Date): string {
  const dia = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
  return `informe-importacion-rutas-${dia}-${hora}.xlsx`;
}
