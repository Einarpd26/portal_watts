import { useCallback, useEffect, useState } from 'react';
import { DIA_LABELS, type DiaKey } from '@/utils/diasSemana';
import { accionDelPincel, quedaDuplicada } from '@/utils/planificacionMapa';
import type { Frecuencia, VisitaPlanificada } from '@/types';

/** Cuánto permanece el aviso con «Deshacer» (ADR-004 D2): lo bastante para reaccionar, sin tapar el mapa */
const DURACION_AVISO_MS = 8000;

export interface EdicionDelMapa {
  /** Planifica la ruta y devuelve la visita creada, o null si el servidor la rechazó */
  planificar: (idSlot: number, idRuta: number, dia: DiaKey, frecuencia: Frecuencia) => Promise<VisitaPlanificada | null>;
  quitar: (visita: VisitaPlanificada) => Promise<boolean>;
}

export interface AvisoPincel {
  mensaje: string;
  /** Lo que conviene saber de lo que se acaba de hacer (p. ej. que la ruta quedó duplicada) */
  advertencia: string | null;
  deshacer: () => Promise<unknown>;
}

export interface Pincel {
  idSlot: number;
  dia: DiaKey;
  frecuencia: Frecuencia;
}

/**
 * Pincel de la planificación sobre el mapa (ADR-004 D2): un clic en una ruta la planifica en el slot, día y
 * frecuencia activos o la quita si ya estaba. Cada acción deja un aviso con «Deshacer» de la última.
 */
export function usePincelPlanificacion(
  visitas: readonly VisitaPlanificada[],
  nombreDeSlot: (idSlot: number) => string,
  edicion: EdicionDelMapa | null
) {
  const [aviso, setAviso] = useState<AvisoPincel | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const pintar = async (idRuta: number, pincel: Pincel) => {
    if (!edicion) return;
    const lugar = (idSlot: number, dia: DiaKey) => `${nombreDeSlot(idSlot)} · ${DIA_LABELS[dia]}`;
    const accion = accionDelPincel(visitas, { ...pincel, idRuta });

    if (accion.tipo === 'quitar') {
      const visita = visitas.find((v) => v.id === accion.idVisita);
      // Una visita con id negativo todavía se está guardando: no hay nada que quitar hasta que termine
      if (!visita || visita.id < 0) return;
      if (!(await edicion.quitar(visita))) return;
      setAviso({
        mensaje: `${visita.codigo_ruta} quitada de ${lugar(visita.id_slot, visita.dia)}.`,
        advertencia: null,
        deshacer: () => edicion.planificar(visita.id_slot, visita.id_ruta, visita.dia, visita.frecuencia),
      });
      return;
    }

    const duplicada = quedaDuplicada(visitas, { id_ruta: idRuta, frecuencia: pincel.frecuencia });
    const creada = await edicion.planificar(pincel.idSlot, idRuta, pincel.dia, pincel.frecuencia);
    if (!creada) return;
    setAviso({
      mensaje: `${creada.codigo_ruta} planificada en ${lugar(creada.id_slot, creada.dia)}.`,
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

  return { aviso, pintar, deshacer, descartarAviso };
}
