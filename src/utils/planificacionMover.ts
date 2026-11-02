// Arrastre de visitas entre las celdas de la grilla (CU-09). Solo tipos y lógica pura, para poder
// probarla con node --test; los componentes entregan estos datos a dnd-kit.
import type { Frecuencia } from '@/types';
import type { DiaKey } from '@/utils/diasSemana';

/** Origen de un arrastre: la visita y la celda de la que sale */
export interface OrigenVisita {
  idVisita: number;
  idSlot: number;
  dia: DiaKey;
  idRuta: number;
  frecuencia: Frecuencia;
}

/** Celda de destino candidata, con las visitas que ya tiene */
export interface DestinoCelda {
  idSlot: number;
  dia: DiaKey;
  visitas: ReadonlyArray<{ id_ruta: number; frecuencia: Frecuencia }>;
}

/**
 * Se puede soltar si no es la misma celda y el destino no tiene ya esa misma visita (ruta y
 * frecuencia). Mover conserva la frecuencia; el servidor vuelve a validarlo y responde 409.
 */
export function puedeSoltarVisita(destino: DestinoCelda, origen: OrigenVisita): boolean {
  if (destino.idSlot === origen.idSlot && destino.dia === origen.dia) return false;
  return !destino.visitas.some((v) => v.id_ruta === origen.idRuta && v.frecuencia === origen.frecuencia);
}

/** `data` que el chip de una visita le entrega a dnd-kit al arrastrarse */
export interface DatosArrastreVisita {
  type: 'visita';
  origen: OrigenVisita;
}

/** `data` que cada celda de la grilla publica como destino de un arrastre */
export interface DatosCeldaDestino {
  type: 'celda';
  destino: DestinoCelda;
}

type DatosDnd = Record<string, unknown> | null | undefined;

// dnd-kit tipa `data.current` como Record<string, unknown>: el cast vive solo aquí, tras comprobar `type`.
export function datosArrastreVisita(data: DatosDnd): DatosArrastreVisita | null {
  return data?.type === 'visita' ? (data as unknown as DatosArrastreVisita) : null;
}

export function datosCeldaDestino(data: DatosDnd): DatosCeldaDestino | null {
  return data?.type === 'celda' ? (data as unknown as DatosCeldaDestino) : null;
}

/** Id del droppable de una celda (slot + día) */
export function idCeldaPlanificacion(idSlot: number, dia: DiaKey): string {
  return `celda-plan:${idSlot}:${dia}`;
}
