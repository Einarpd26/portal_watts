import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { DiaKey } from '@/utils/diasSemana';
import type { Frecuencia, SlotsListado } from '@/types';

type Toast = { type: 'success' | 'error'; message: string };

const LISTADO_VACIO: SlotsListado = { slots: [], visitas: [], rutas: [], disponibles: [], es_supervisor: true };

export function useGestionSlots() {
  const [listado, setListado] = useState<SlotsListado>(LISTADO_VACIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  // Visitas que se están guardando: evita mover dos veces la misma mientras el servidor responde
  const moviendoRef = useRef(new Set<number>());

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/planificacion/slots');
      if (!res.ok) {
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, 'No se pudieron cargar los slots.') });
        return;
      }
      setListado((await res.json()) as SlotsListado);
    } catch (err: unknown) {
      logger.error('Error cargando slots:', err);
      setToast({ type: 'error', message: 'No se pudieron cargar los slots.' });
    }
  }, []);

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
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, fallo) });
      } else if (exito) {
        setToast({ type: 'success', message: exito });
      }
    } catch (err: unknown) {
      logger.error(fallo, err);
      setToast({ type: 'error', message: fallo });
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
      setToast({ type: 'error', message: mensaje });
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
    toast,
    clearToast,
    crearSlot,
    asignarVendedor,
    renombrarSlot,
    eliminarSlot,
    moverSlot,
    agregarVisita,
    cambiarFrecuencia,
    quitarVisita,
    moverVisita,
  };
}
