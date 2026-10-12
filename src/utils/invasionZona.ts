// Textos de la regla de no invasión (ADR-002 D7): la envolvente de una zona no puede cubrir rutas
// de otras zonas, ni por crecer sobre ellas (invasión) ni porque la ruta caiga dentro de ella
// (cobertura). Sin dependencias de Node.
import type { ConflictoRuta } from '@/types';

const lista = (codigos: string[]) =>
  codigos.length <= 1 ? (codigos[0] ?? '') : `${codigos.slice(0, -1).join(', ')} y ${codigos[codigos.length - 1]}`;

/** Motivo breve del rechazo, para el título de la vista previa */
export function motivoInvasion(codigoZona: string): string {
  return `La zona ${codigoZona} pasaría a cubrir rutas de otra zona.`;
}

/** Rutas que la zona cubriría; las de fuera del alcance se cuentan sin revelar su código */
function rutasCubiertas(invasiones: ConflictoRuta[]) {
  const propias = invasiones.filter((i) => !i.fuera_de_alcance && i.codigo_ruta);
  const ajenas = invasiones.length - propias.length;
  const cubiertas = propias.map((i) => (i.codigo_zona ? `${i.codigo_ruta} (zona ${i.codigo_zona})` : `${i.codigo_ruta}`));
  if (ajenas > 0) cubiertas.push(ajenas === 1 ? 'otra ruta fuera de tus zonas' : `${ajenas} rutas fuera de tus zonas`);
  return { propias, cubiertas };
}

/**
 * Rechazo de un traslado (CU-06 A3): no sugiere ajustar el polígono, que en un traslado no cambia;
 * sugiere trasladar primero las rutas cubiertas que se puedan, una por una (sin cadenas automáticas)
 */
export function mensajeInvasionTraslado(codigoZona: string, invasiones: ConflictoRuta[]): string {
  const { propias, cubiertas } = rutasCubiertas(invasiones);
  const trasladables = propias.filter((i) => i.trasladable).map((i) => i.codigo_ruta as string);
  const sugerencia = trasladables.length > 0 ? ` Traslada primero ${lista(trasladables)} a la zona ${codigoZona}.` : '';
  return `${motivoInvasion(codigoZona)} Cubriría ${lista(cubiertas)}.${sugerencia}`;
}

/** Qué rutas cubriría y qué hacer: ajustar el polígono o trasladar las rutas que se puedan (CU-06) */
export function detalleInvasion(codigoZona: string, invasiones: ConflictoRuta[]): string {
  const { propias, cubiertas } = rutasCubiertas(invasiones);

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

/** Zonas cuya envolvente cubriría la ruta; las de fuera del alcance se marcan para saber a quién pedirle el espacio */
function zonasCubridoras(coberturas: ConflictoRuta[]): string {
  const nombres = coberturas.map((c) => `${c.codigo_zona ?? 'otra zona'}${c.fuera_de_alcance ? ' (fuera de tus zonas)' : ''}`);
  return `${nombres.length === 1 ? 'la zona' : 'las zonas'} ${lista(nombres)}`;
}

/** Motivo breve: la ruta caería dentro del contorno de otra zona (alta o edición) */
export function motivoCobertura(coberturas: ConflictoRuta[]): string {
  return `La ruta quedaría dentro del contorno de ${zonasCubridoras(coberturas)}, y una zona no puede cubrir rutas de otra.`;
}

/**
 * Rechazo de un alta o una edición por cobertura ajena (CU-05 A4): se corrige el polígono o, si la zona
 * cubridora no es de quien opera, se le pide a la Gerencia o al Fiscalizador que la modifique
 */
export function mensajeCobertura(coberturas: ConflictoRuta[]): string {
  const ajenas = coberturas.filter((c) => c.fuera_de_alcance).map((c) => c.codigo_zona ?? 'esa zona');
  const sugerencia =
    ajenas.length > 0
      ? `Ajusta el polígono o pide a la Gerencia o al Fiscalizador que modifiquen ${ajenas.length === 1 ? 'la zona' : 'las zonas'} ${lista(ajenas)}.`
      : 'Ajusta el polígono.';
  return `${motivoCobertura(coberturas)} ${sugerencia}`;
}

/** Rechazo de un traslado por cobertura (CU-06 A3): la zona de origen, sin la ruta, la seguiría cubriendo */
export function mensajeCoberturaTraslado(coberturas: ConflictoRuta[]): string {
  return `El contorno de ${zonasCubridoras(coberturas)} seguiría cubriendo la ruta tras el traslado, y una zona no puede cubrir rutas de otra. Traslada antes las rutas de esa zona que la rodean.`;
}
