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

/** "R-S1 (zona ZS)" para una ruta propia; "R-N1 (zona ZN, fuera de tus zonas)" para una ajena */
function descripcionesDeRutas(conflictos: ConflictoRuta[]): string[] {
  const conCodigo = conflictos.filter((c) => c.codigo_ruta);
  const descripciones = conCodigo.map((c) => {
    const zona = c.codigo_zona ? `zona ${c.codigo_zona}` : '';
    const ajena = c.fuera_de_alcance ? 'fuera de tus zonas' : '';
    const detalle = [zona, ajena].filter(Boolean).join(', ');
    return detalle ? `${c.codigo_ruta} (${detalle})` : `${c.codigo_ruta}`;
  });
  // Sin código (por compatibilidad): se agrupan por zona
  const porZona = new Map<string, number>();
  for (const c of conflictos.filter((x) => !x.codigo_ruta)) {
    const zona = c.codigo_zona ?? '';
    porZona.set(zona, (porZona.get(zona) ?? 0) + 1);
  }
  for (const [zona, n] of porZona) {
    const sujeto = n === 1 ? 'otra ruta' : `${n} rutas`;
    descripciones.push(zona ? `${sujeto} de la zona ${zona} (fuera de tus zonas)` : `${sujeto} fuera de tus zonas`);
  }
  return descripciones;
}

/** Pedido de revisión a Gerencia o al Fiscalizador por las zonas de las rutas fuera del alcance */
function pedirRevision(conflictos: ConflictoRuta[]): string {
  const zonas = [...new Set(conflictos.filter((c) => c.fuera_de_alcance && c.codigo_zona).map((c) => c.codigo_zona as string))];
  return zonas.length > 0
    ? `Pide a la Gerencia o al Fiscalizador que revisen ${zonas.length === 1 ? 'la zona' : 'las zonas'} ${lista(zonas)}.`
    : '';
}

/** Rutas que la zona cubriría; las de fuera del alcance se cuentan sin revelar su código */
function rutasCubiertas(invasiones: ConflictoRuta[]) {
  const propias = invasiones.filter((i) => !i.fuera_de_alcance && i.codigo_ruta);
  return { propias, cubiertas: descripcionesDeRutas(invasiones) };
}

/** Rutas con las que se superpone el polígono (CU-05 A1), con la zona de las que están fuera del alcance */
export function descripcionSuperposicion(conflictos: ConflictoRuta[]): string {
  return lista(descripcionesDeRutas(conflictos));
}

/** Pedido final cuando algún conflicto es de una zona ajena; vacío si no hay ninguno */
export function revisionDeZonasAjenas(conflictos: ConflictoRuta[]): string {
  return pedirRevision(conflictos);
}

/**
 * Rechazo de un traslado (CU-06 A3): no sugiere ajustar el polígono, que en un traslado no cambia;
 * sugiere trasladar primero las rutas cubiertas que se puedan, una por una (sin cadenas automáticas)
 */
export function mensajeInvasionTraslado(codigoZona: string, invasiones: ConflictoRuta[]): string {
  const { propias, cubiertas } = rutasCubiertas(invasiones);
  const trasladables = propias.filter((i) => i.trasladable).map((i) => i.codigo_ruta as string);
  const sugerencia = trasladables.length > 0 ? ` Traslada primero ${lista(trasladables)} a la zona ${codigoZona}.` : '';
  const revision = pedirRevision(invasiones);
  return `${motivoInvasion(codigoZona)} Cubriría ${lista(cubiertas)}.${sugerencia}${revision ? ` ${revision}` : ''}`;
}

/** Qué rutas cubriría y qué hacer: ajustar el polígono o trasladar las rutas que se puedan (CU-06) */
export function detalleInvasion(codigoZona: string, invasiones: ConflictoRuta[]): string {
  const { propias, cubiertas } = rutasCubiertas(invasiones);

  const trasladables = propias.filter((i) => i.trasladable).map((i) => i.codigo_ruta as string);
  const sugerencia =
    trasladables.length > 0
      ? `Ajusta el polígono o traslada ${lista(trasladables)} a la zona ${codigoZona}.`
      : 'Ajusta el polígono.';
  const revision = pedirRevision(invasiones);
  return `Cubriría ${lista(cubiertas)}. ${sugerencia}${revision ? ` ${revision}` : ''}`;
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
