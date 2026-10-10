// Textos de la regla de no invasión (ADR-002 D7): la envolvente de una zona no puede pasar a
// cubrir rutas de otras zonas. Sin dependencias de Node.
import type { ConflictoRuta } from '@/types';

const lista = (codigos: string[]) =>
  codigos.length <= 1 ? (codigos[0] ?? '') : `${codigos.slice(0, -1).join(', ')} y ${codigos[codigos.length - 1]}`;

/** Motivo breve del rechazo, para el título de la vista previa */
export function motivoInvasion(codigoZona: string): string {
  return `La zona ${codigoZona} pasaría a cubrir rutas de otra zona.`;
}

/** Qué rutas cubriría y qué hacer: ajustar el polígono o trasladar las rutas que se puedan (CU-06) */
export function detalleInvasion(codigoZona: string, invasiones: ConflictoRuta[]): string {
  const propias = invasiones.filter((i) => !i.fuera_de_alcance && i.codigo_ruta);
  const ajenas = invasiones.length - propias.length;
  const cubiertas = propias.map((i) => (i.codigo_zona ? `${i.codigo_ruta} (zona ${i.codigo_zona})` : `${i.codigo_ruta}`));
  if (ajenas > 0) cubiertas.push(ajenas === 1 ? 'otra ruta fuera de tus zonas' : `${ajenas} rutas fuera de tus zonas`);

  const trasladables = propias.filter((i) => i.trasladable).map((i) => i.codigo_ruta as string);
  const sugerencia =
    trasladables.length > 0
      ? `Ajusta el polígono o traslada ${lista(trasladables)} a la zona ${codigoZona}.`
      : 'Ajusta el polígono.';
  return `Cubriría ${lista(cubiertas)}. ${sugerencia}`;
}

/** Mensaje completo para un guardado rechazado (aviso sin vista previa) */
export function mensajeInvasion(codigoZona: string, invasiones: ConflictoRuta[]): string {
  return `${motivoInvasion(codigoZona)} ${detalleInvasion(codigoZona, invasiones)}`;
}
