// Días de visita de la planificación (CU-09): de lunes a sábado, con el código de dos letras
// que guarda planificacion_rutas.dia_semana.
export type DiaKey = 'LU' | 'MA' | 'MI' | 'JU' | 'VI' | 'SA';

export const DIAS_ORDEN: readonly DiaKey[] = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

export const DIA_LABELS: Record<DiaKey, string> = {
  LU: 'Lunes',
  MA: 'Martes',
  MI: 'Miércoles',
  JU: 'Jueves',
  VI: 'Viernes',
  SA: 'Sábado',
};
