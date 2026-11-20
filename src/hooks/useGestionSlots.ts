import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { DiaKey } from '@/utils/diasSemana';
import type { Frecuencia, SlotsListado, VisitaPlanificada } from '@/types';

const LISTADO_VACIO: SlotsListado = { slots: [], visitas: [], rutas: [], disponibles: [], es_supervisor: true };

export function useGestionSlots() {
  const [listado, setListado] = useState<SlotsListado>(LISTADO_VACIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Visitas que se están guardando: evita mover dos veces la misma mientras el servidor responde
  const moviendoRef = useRef(new Set<number>());
  // Cambios del pincel en vuelo: el listado real se recarga cuando termina el último, no antes, para que
  // una recarga no borre un cambio optimista que el servidor todavía no confirmó
  const pendientesRef = useRef(0);
  const temporalesRef = useRef(0);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/planificacion/slots');
      if (!res.ok) {
        showToast(await mensajeDeErrorApi(res, 'No se pudieron cargar los slots.'), 'error');
        return;
      }
      setListado((await res.json()) as SlotsListado);
    } catch (err: unknown) {
      logger.error('Error cargando slots:', err);
      showToast('No se pudieron cargar los slots.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    // Carga inicial: el estado se actualiza al resolver el fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().finally(() => setIsLoading(false));
  }, [cargar]);

  // Una sola operación a la vez; al terminar siempre se recarga para mostrar el estado real
  const ejecutar = async (
    solicitud: () => Promise<Response>,
    exito: string | null,
    fallo: string
  ) => {
    setIsSubmitting(true);
    try {
      const res = await solicitud();
      if (!res.ok) {
        showToast(await mensajeDeErrorApi(res, fallo), 'error');
      } else if (exito) {
        showToast(exito, 'success');
      }
    } catch (err: unknown) {
      logger.error(fallo, err);
      showToast(fallo, 'error');
    } finally {
      setIsSubmitting(false);
      await cargar();
    }
  };

  const crearSlot = () =>
    ejecutar(
      () => fetch('/api/planificacion/slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
      'Slot agregado.',
      'No se pudo agregar el slot.'
    );

  const asignarVendedor = (idSlot: number, idVendedor: number | null) =>
    ejecutar(
      () =>
        fetch(`/api/planificacion/slots/${idSlot}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_vendedor: idVendedor }),
        }),
      idVendedor === null ? 'Slot vacío.' : 'Vendedor asignado al slot.',
      'No se pudo actualizar el slot.'
    );

  const renombrarSlot = (idSlot: number, nombre: string) =>
    ejecutar(
      () =>
        fetch(`/api/planificacion/slots/${idSlot}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre }),
        }),
      null,
      'No se pudo renombrar el slot.'
    );

  const eliminarSlot = (idSlot: number) =>
    ejecutar(
      () => fetch(`/api/planificacion/slots/${idSlot}`, { method: 'DELETE' }),
      'Slot eliminado. Su vendedor sigue en tu equipo y queda disponible.',
      'No se pudo eliminar el slot.'
    );

  const agregarVisita = (idSlot: number, idRuta: number, dia: DiaKey, frecuencia: Frecuencia) =>
    ejecutar(
      () =>
        fetch('/api/planificacion/visitas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_slot: idSlot, id_ruta: idRuta, dia, frecuencia }),
        }),
      'Ruta planificada.',
      'No se pudo planificar la ruta.'
    );

  const cambiarFrecuencia = (idVisita: number, frecuencia: Frecuencia) =>
    ejecutar(
      () =>
        fetch(`/api/planificacion/visitas/${idVisita}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frecuencia }),
        }),
      'Frecuencia actualizada.',
      'No se pudo cambiar la frecuencia.'
    );

  // Mover es optimista: la grilla se actualiza al soltar y, si el servidor lo rechaza, la visita vuelve a
  // su celda. Así el chip no regresa a la celda anterior mientras espera la respuesta.
  const moverVisita = async (idVisita: number, idSlot: number, dia: DiaKey) => {
    if (moviendoRef.current.has(idVisita)) return;
    const original = listado.visitas.find((v) => v.id === idVisita);
    if (!original || (original.id_slot === idSlot && original.dia === dia)) return;

    const colocar = (id_slot: number, dia_destino: DiaKey) =>
      setListado((prev) => ({
        ...prev,
        visitas: prev.visitas.map((v) => (v.id === idVisita ? { ...v, id_slot, dia: dia_destino } : v)),
      }));
    const revertir = (mensaje: string) => {
      colocar(original.id_slot, original.dia);
      showToast(mensaje, 'error');
    };

    moviendoRef.current.add(idVisita);
    colocar(idSlot, dia);
    try {
      const res = await fetch(`/api/planificacion/visitas/${idVisita}/mover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_slot: idSlot, dia }),
      });
      if (!res.ok) revertir(await mensajeDeErrorApi(res, 'No se pudo mover la ruta.'));
    } catch (err: unknown) {
      logger.error('Error moviendo la visita:', err);
      revertir('No se pudo mover la ruta.');
    } finally {
      moviendoRef.current.delete(idVisita);
    }
  };

  // Reordenar también es optimista: la fila queda donde se soltó y, si el servidor lo rechaza, se
  // recarga la lista con el orden real
  const reordenarSlots = async (ids: number[]) => {
    const orden = new Map(ids.map((id, i) => [id, i]));
    setListado((prev) => ({
      ...prev,
      slots: [...prev.slots].sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0)).map((s) => ({ ...s, orden: orden.get(s.id) ?? s.orden })),
    }));
    try {
      const res = await fetch('/api/planificacion/slots/orden', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        showToast(await mensajeDeErrorApi(res, 'No se pudo reordenar los slots.'), 'error');
        await cargar();
      }
    } catch (err: unknown) {
      logger.error('Error reordenando los slots:', err);
      showToast('No se pudo reordenar los slots.', 'error');
      await cargar();
    }
  };

  // Pincel del mapa (ADR-004 D4): el cambio se ve al instante y se revierte con el motivo si el servidor lo rechaza.
  // Devuelven el resultado para que la vista arme el «Deshacer».
  const terminarCambioDelPincel = async () => {
    pendientesRef.current -= 1;
    if (pendientesRef.current === 0) await cargar();
  };

  const planificarEnMapa = async (idSlot: number, idRuta: number, dia: DiaKey, frecuencia: Frecuencia): Promise<VisitaPlanificada | null> => {
    const ruta = listado.rutas.find((r) => r.id === idRuta);
    if (!ruta) return null;
    temporalesRef.current += 1;
    const temporal: VisitaPlanificada = {
      id: -temporalesRef.current,
      id_slot: idSlot,
      id_ruta: idRuta,
      codigo_ruta: ruta.codigo_ruta,
      ruta: ruta.ruta,
      dia,
      frecuencia,
    };
    const sinTemporal = (prev: SlotsListado) => ({ ...prev, visitas: prev.visitas.filter((v) => v.id !== temporal.id) });

    pendientesRef.current += 1;
    setListado((prev) => ({ ...prev, visitas: [...prev.visitas, temporal] }));
    try {
      const res = await fetch('/api/planificacion/visitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_slot: idSlot, id_ruta: idRuta, dia, frecuencia }),
      });
      if (!res.ok) {
        setListado(sinTemporal);
        showToast(await mensajeDeErrorApi(res, 'No se pudo planificar la ruta.'), 'error');
        return null;
      }
      const { id } = (await res.json()) as { id: number };
      const creada = { ...temporal, id };
      setListado((prev) => ({ ...prev, visitas: prev.visitas.map((v) => (v.id === temporal.id ? creada : v)) }));
      return creada;
    } catch (err: unknown) {
      logger.error('Error planificando la ruta desde el mapa:', err);
      setListado(sinTemporal);
      showToast('No se pudo planificar la ruta.', 'error');
      return null;
    } finally {
      await terminarCambioDelPincel();
    }
  };

  const quitarDelMapa = async (visita: VisitaPlanificada): Promise<boolean> => {
    pendientesRef.current += 1;
    setListado((prev) => ({ ...prev, visitas: prev.visitas.filter((v) => v.id !== visita.id) }));
    const restaurar = () => setListado((prev) => ({ ...prev, visitas: [...prev.visitas, visita] }));
    try {
      const res = await fetch(`/api/planificacion/visitas/${visita.id}`, { method: 'DELETE' });
      if (!res.ok) {
        restaurar();
        showToast(await mensajeDeErrorApi(res, 'No se pudo quitar la ruta.'), 'error');
        return false;
      }
      return true;
    } catch (err: unknown) {
      logger.error('Error quitando la ruta desde el mapa:', err);
      restaurar();
      showToast('No se pudo quitar la ruta.', 'error');
      return false;
    } finally {
      await terminarCambioDelPincel();
    }
  };

  const quitarVisita = (idVisita: number) =>
    ejecutar(
      () => fetch(`/api/planificacion/visitas/${idVisita}`, { method: 'DELETE' }),
      'Ruta quitada de la planificación.',
      'No se pudo quitar la ruta.'
    );

  const moverSlot = (idSlot: number, direccion: 'arriba' | 'abajo') =>
    ejecutar(
      () =>
        fetch(`/api/planificacion/slots/${idSlot}/mover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direccion }),
        }),
      null,
      'No se pudo reordenar el slot.'
    );

  return {
    listado,
    isLoading,
    isSubmitting,
    crearSlot,
    asignarVendedor,
    renombrarSlot,
    eliminarSlot,
    moverSlot,
    agregarVisita,
    cambiarFrecuencia,
    quitarVisita,
    planificarEnMapa,
    quitarDelMapa,
    moverVisita,
    reordenarSlots,
  };
}
