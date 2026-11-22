// Lógica pura de la pantalla de cobertura de rutas (CU-13, ADR-005 D3): tramos de color, resumen, filtros y
// orden. Sin dependencias de Node ni del navegador.
import type { RutaCobertura } from '@/types';
import { depurarTerritorio, opcionesTerritorio, pasaTerritorio, type FacetaTerritorio, type OpcionesTerritorio } from './territorio.ts';

export type TramoCobertura = 'baja' | 'media' | 'alta';

/** Por debajo de este porcentaje la ruta se marca en rojo; desde el siguiente, en verde. Son un acuerdo de negocio ajustable. */
export const UMBRAL_BAJO = 50;
export const UMBRAL_ALTO = 80;

export const COLOR_TRAMO: Record<TramoCobertura, string> = {
  baja: '#dc2626', // red-600
  media: '#d97706', // amber-600
  alta: '#16a34a', // green-600
};

export const ETIQUETA_TRAMO: Record<TramoCobertura, string> = {
  baja: `Menos del ${UMBRAL_BAJO} %`,
  media: `${UMBRAL_BAJO} % a ${UMBRAL_ALTO - 1} %`,
  alta: `${UMBRAL_ALTO} % o más`,
};

export function tramoDe(porcentaje: number): TramoCobertura {
  if (porcentaje < UMBRAL_BAJO) return 'baja';
  return porcentaje < UMBRAL_ALTO ? 'media' : 'alta';
}

export interface ResumenCobertura {
  rutas: number;
  clientesHabilitados: number;
  clientesAtendidos: number;
  /** Atendidos sobre habilitados de todas las rutas (no el promedio de los porcentajes) */
  porcentaje: number;
  rutasBajas: number;
}

export function resumirCobertura(rutas: readonly RutaCobertura[]): ResumenCobertura {
  const habilitados = rutas.reduce((suma, r) => suma + r.clientes_habilitados, 0);
  const atendidos = rutas.reduce((suma, r) => suma + r.clientes_atendidos, 0);
  return {
    rutas: rutas.length,
    clientesHabilitados: habilitados,
    clientesAtendidos: atendidos,
    porcentaje: habilitados === 0 ? 0 : Math.round((1000 * atendidos) / habilitados) / 10,
    rutasBajas: rutas.filter((r) => tramoDe(r.porcentaje) === 'baja').length,
  };
}

export interface FiltrosCobertura {
  idSucursal: number | null;
  idZona: number | null;
  idSupervisor: number | null;
  idRuta: number | null;
}

export const FILTROS_COBERTURA_INICIALES: FiltrosCobertura = { idSucursal: null, idZona: null, idSupervisor: null, idRuta: null };

export const filtrarCobertura = (rutas: readonly RutaCobertura[], f: FiltrosCobertura): RutaCobertura[] => rutas.filter((r) => pasaTerritorio(r, f));

export type OrdenCobertura = 'menor' | 'mayor' | 'codigo';

/** Por defecto, de menor a mayor cobertura: lo urgente queda arriba. Ante empate, por código de ruta. */
export function ordenarCobertura(rutas: readonly RutaCobertura[], orden: OrdenCobertura): RutaCobertura[] {
  const porCodigo = (a: RutaCobertura, b: RutaCobertura) => a.codigo_ruta.localeCompare(b.codigo_ruta);
  const comparar: Record<OrdenCobertura, (a: RutaCobertura, b: RutaCobertura) => number> = {
    menor: (a, b) => a.porcentaje - b.porcentaje || porCodigo(a, b),
    mayor: (a, b) => b.porcentaje - a.porcentaje || porCodigo(a, b),
    codigo: porCodigo,
  };
  return [...rutas].sort(comparar[orden]);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «2026-11-01» → «noviembre de 2026» */
export function nombreDelMes(mes: string | null): string | null {
  if (!mes) return null;
  const [anio, numero] = mes.split('-');
  const nombre = MESES[Number(numero) - 1];
  return nombre ? `${nombre} de ${anio}` : null;
}

/** Momento del recálculo en hora de Bolivia (UTC-4, sin horario de verano): «19/11/2026 03:00» */
export function momentoDeCalculo(instante: string | null): string | null {
  if (!instante) return null;
  const f = new Date(new Date(instante).getTime() - 4 * 3600_000);
  if (Number.isNaN(f.getTime())) return null;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(f.getUTCDate())}/${dos(f.getUTCMonth() + 1)}/${f.getUTCFullYear()} ${dos(f.getUTCHours())}:${dos(f.getUTCMinutes())}`;
}

// --- Filtros encadenados -------------------------------------------------------------------------------------

export type FacetaCobertura = FacetaTerritorio;

export const FACETAS_COBERTURA: readonly FacetaCobertura[] = ['idSucursal', 'idZona', 'idSupervisor', 'idRuta'];

export type OpcionesCobertura = OpcionesTerritorio<RutaCobertura>;

export const opcionesCoberturaSegunFiltros = (rutas: readonly RutaCobertura[], f: FiltrosCobertura): OpcionesCobertura => opcionesTerritorio(rutas, f);

export const depurarFiltrosCobertura = (rutas: readonly RutaCobertura[], f: FiltrosCobertura, conservar: FacetaCobertura | null): FiltrosCobertura =>
  depurarTerritorio(rutas, f, conservar);
