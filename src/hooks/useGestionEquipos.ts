import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { mensajeDeErrorApi } from '@/utils/apiError';
import type { EquipoSupervisor, EquiposListado, VendedorSinEquipo, ZonaSinSupervisor } from '@/types';

type Toast = { type: 'success' | 'error'; message: string };

/** Vendedor al que se le cambia o asigna el supervisor, con el supervisor que tiene hoy */
export interface VendedorObjetivo {
  id_persona: number;
  nombre: string;
  id_sucursal: number;
  id_supervisor_actual: number | null;
}

const LISTADO_VACIO: EquiposListado = { equipos: [], sin_supervisor: [], zonas_sin_supervisor: [], alcance_global: false };

export function useGestionEquipos() {
  const [listado, setListado] = useState<EquiposListado>(LISTADO_VACIO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [vendedorTarget, setVendedorTarget] = useState<VendedorObjetivo | null>(null);
  const [supervisorSeleccion, setSupervisorSeleccion] = useState<number | null>(null);
  const [reemplazoTarget, setReemplazoTarget] = useState<EquipoSupervisor | null>(null);
  const [reemplazoSeleccion, setReemplazoSeleccion] = useState<number | null>(null);
  const [zonaTarget, setZonaTarget] = useState<ZonaSinSupervisor | null>(null);
  const [zonaSeleccion, setZonaSeleccion] = useState<number | null>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/equipos');
      if (!res.ok) {
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, 'No se pudieron cargar los equipos.') });
        return;
      }
      setListado((await res.json()) as EquiposListado);
    } catch (err: unknown) {
      logger.error('Error cargando equipos:', err);
      setToast({ type: 'error', message: 'No se pudieron cargar los equipos.' });
    }
  }, []);

  useEffect(() => {
    // Carga inicial: el estado se actualiza al resolver el fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar().finally(() => setIsLoading(false));
  }, [cargar]);

  // Supervisores activos a los que se puede asignar un vendedor o pasar un equipo
  const supervisoresActivos = listado.equipos.filter((e) => e.activo);

  // --- Asignar, cambiar o quitar el supervisor de un vendedor (ADR-003 D3 y D4) ---
  const openVendedor = (vendedor: VendedorObjetivo) => {
    setVendedorTarget(vendedor);
    setSupervisorSeleccion(vendedor.id_supervisor_actual);
  };
  const openVendedorSinEquipo = (v: VendedorSinEquipo) =>
    openVendedor({ id_persona: v.id_persona, nombre: v.nombre, id_sucursal: v.id_sucursal, id_supervisor_actual: null });
  const closeVendedor = () => setVendedorTarget(null);

  const submitVendedor = async () => {
    if (!vendedorTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/equipos/vendedor/${vendedorTarget.id_persona}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_supervisor: supervisorSeleccion }),
      });
      if (!res.ok) {
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, 'No se pudo actualizar el equipo.') });
      } else {
        const cuerpo = (await res.json()) as { slots_liberados?: number };
        const liberados = cuerpo.slots_liberados ?? 0;
        setToast({
          type: 'success',
          message:
            supervisorSeleccion === null
              ? `${vendedorTarget.nombre} quedó sin supervisor.${liberados > 0 ? ' Su slot quedó vacío y conserva sus rutas.' : ''}`
              : `Equipo actualizado para ${vendedorTarget.nombre}.${liberados > 0 ? ' Su slot anterior quedó vacío y conserva sus rutas.' : ''}`,
        });
      }
    } catch (err: unknown) {
      logger.error('Error actualizando el equipo del vendedor:', err);
      setToast({ type: 'error', message: 'No se pudo actualizar el equipo.' });
    } finally {
      // Se cierra siempre: un modal abierto taparía el aviso del resultado
      setVendedorTarget(null);
      setIsSubmitting(false);
      await cargar();
    }
  };

  // --- Reemplazar a un supervisor retirado (ADR-003 D6) ---
  const openReemplazo = (equipo: EquipoSupervisor) => {
    setReemplazoTarget(equipo);
    setReemplazoSeleccion(null);
  };
  const closeReemplazo = () => setReemplazoTarget(null);

  const submitReemplazo = async () => {
    if (!reemplazoTarget || reemplazoSeleccion === null) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/equipos/reemplazar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_inactivo: reemplazoTarget.id_persona, id_nuevo: reemplazoSeleccion }),
      });
      if (!res.ok) {
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, 'No se pudo reemplazar al supervisor.') });
      } else {
        setToast({
          type: 'success',
          message: 'Supervisor reemplazado. El equipo y los slots pasaron con su planificación; asigna sus zonas en «Zonas sin supervisor».',
        });
      }
    } catch (err: unknown) {
      logger.error('Error reemplazando al supervisor:', err);
      setToast({ type: 'error', message: 'No se pudo reemplazar al supervisor.' });
    } finally {
      setReemplazoTarget(null);
      setIsSubmitting(false);
      await cargar();
    }
  };

  // --- Asignar una zona sin supervisor (CU-07): reutiliza la API de zonas ---
  const openZona = (zona: ZonaSinSupervisor) => {
    setZonaTarget(zona);
    setZonaSeleccion(null);
  };
  const closeZona = () => setZonaTarget(null);

  const submitZona = async () => {
    if (!zonaTarget || zonaSeleccion === null) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/zonas/${zonaTarget.id}/supervisor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_persona: zonaSeleccion }),
      });
      if (!res.ok) {
        setToast({ type: 'error', message: await mensajeDeErrorApi(res, 'No se pudo asignar la zona.') });
      } else {
        setToast({ type: 'success', message: `La zona ${zonaTarget.codigo_zona} tiene supervisor.` });
      }
    } catch (err: unknown) {
      logger.error('Error asignando el supervisor de la zona:', err);
      setToast({ type: 'error', message: 'No se pudo asignar la zona.' });
    } finally {
      setZonaTarget(null);
      setIsSubmitting(false);
      await cargar();
    }
  };

  return {
    listado,
    supervisoresActivos,
    isLoading,
    isSubmitting,
    toast,
    clearToast,
    vendedorTarget,
    supervisorSeleccion,
    setSupervisorSeleccion,
    openVendedor,
    openVendedorSinEquipo,
    closeVendedor,
    submitVendedor,
    reemplazoTarget,
    reemplazoSeleccion,
    setReemplazoSeleccion,
    openReemplazo,
    closeReemplazo,
    submitReemplazo,
    zonaTarget,
    zonaSeleccion,
    setZonaSeleccion,
    openZona,
    closeZona,
    submitZona,
  };
}
