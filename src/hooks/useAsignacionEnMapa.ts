import { useCallback, useEffect, useState } from 'react';
import { DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { quedaDuplicada } from '@/utils/planificacionMapa';
import type { Frecuencia, VisitaPlanificada } from '@/types';

/** Cuánto permanece el aviso con «Deshacer» (ADR-004 D2): lo bastante para reaccionar, sin tapar el mapa */
const DURACION_AVISO_MS = 8000;

export interface EdicionDelMapa {
  /** Planifica la ruta y devuelve la visita creada, o null si el servidor la rechazó */
  planificar: (idSlot: number, idRuta: number, dia: DiaKey, frecuencia: Frecuencia) => Promise<VisitaPlanificada | null>;
  quitar: (visita: VisitaPlanificada) => Promise<boolean>;
}

export interface AvisoAsignacion {
  mensaje: string;
  /** Lo que conviene saber de lo que se acaba de hacer (p. ej. que la ruta quedó duplicada) */
  advertencia: string | null;
  deshacer: () => Promise<unknown>;
}

export interface Asignacion {
  idSlot: number;
  dia: DiaKey;
  frecuencia: Frecuencia;
}

/**
 * Asignación de una ruta a un slot desde su ficha en el mapa (ADR-004 D2): planifica la ruta en el slot, día y
 * frecuencia elegidos y deja un aviso con «Deshacer», que dura unos segundos.
 */
export function useAsignacionEnMapa(
  visitas: readonly VisitaPlanificada[],
  nombreDeSlot: (idSlot: number) => string,
  edicion: EdicionDelMapa | null
) {
  const [aviso, setAviso] = useState<AvisoAsignacion | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const asignar = async (idRuta: number, asignacion: Asignacion) => {
    if (!edicion) return;
    const duplicada = quedaDuplicada(visitas, { id_ruta: idRuta, frecuencia: asignacion.frecuencia });
    const creada = await edicion.planificar(asignacion.idSlot, idRuta, asignacion.dia, asignacion.frecuencia);
    if (!creada) return;
    setAviso({
      mensaje: `${creada.codigo_ruta} planificada en ${nombreDeSlot(creada.id_slot)} · ${DIA_LABELS[creada.dia]}.`,
      advertencia: duplicada
        ? 'Queda duplicada: ya está planificada en la semana. Puedes dejarla así o marcarla como eventual desde su ficha.'
        : null,
      deshacer: () => edicion.quitar(creada),
    });
  };

  const deshacer = async () => {
    const actual = aviso;
    setAviso(null);
    await actual?.deshacer();
  };

  const descartarAviso = useCallback(() => setAviso(null), []);

  return { aviso, asignar, deshacer, descartarAviso };
}
