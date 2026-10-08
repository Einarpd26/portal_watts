import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { validarZona, type ZonaErrors } from '@/utils/zonaValidation';
import type { SupervisorCandidato, ZonaItem } from '@/types';

export interface ZonaForm {
  codigo_zona: string;
  zona: string;
  descripcion_zona: string;
  canal_venta: string;
  id_sucursal: number | null;
}

export interface SucursalOpcion {
  id: number;
  nombre: string;
}

const FORM_VACIO: ZonaForm = { codigo_zona: '', zona: '', descripcion_zona: '', canal_venta: '', id_sucursal: null };

type Toast = { type: 'success' | 'error'; message: string };

export interface UseGestionTerritorioReturn {
  zonas: ZonaItem[];
  supervisores: SupervisorCandidato[];
  sucursales: SucursalOpcion[];
  isLoading: boolean;
  isSubmitting: boolean;
  // Alta y edición de zonas (CU-04)
  formModal: { open: boolean; zona: ZonaItem | null };
  form: ZonaForm;
  setForm: (form: ZonaForm) => void;
  formErrors: ZonaErrors;
  openCrear: () => void;
  openEditar: (zona: ZonaItem) => void;
  closeForm: () => void;
  submitForm: () => Promise<void>;
  // Baja
  deleteTarget: ZonaItem | null;
  openEliminar: (zona: ZonaItem) => void;
  closeEliminar: () => void;
  submitEliminar: () => Promise<void>;
  // Supervisor de zona (CU-07)
  supervisorTarget: ZonaItem | null;
  supervisorSeleccion: number | null;
  setSupervisorSeleccion: (id: number | null) => void;
  openSupervisor: (zona: ZonaItem) => void;
  closeSupervisor: () => void;
  submitSupervisor: () => Promise<void>;
  toast: Toast | null;
  clearToast: () => void;
}

export function useGestionTerritorio(): UseGestionTerritorioReturn {
  const [zonas, setZonas] = useState<ZonaItem[]>([]);
  const [supervisores, setSupervisores] = useState<SupervisorCandidato[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOpcion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formModal, setFormModal] = useState<{ open: boolean; zona: ZonaItem | null }>({ open: false, zona: null });
  const [form, setFormState] = useState<ZonaForm>(FORM_VACIO);
  const [formErrors, setFormErrors] = useState<ZonaErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<ZonaItem | null>(null);
  const [supervisorTarget, setSupervisorTarget] = useState<ZonaItem | null>(null);
  const [supervisorSeleccion, setSupervisorSeleccion] = useState<number | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/zonas');
      if (res.ok) {
        const data = (await res.json()) as {
          zonas?: ZonaItem[];
          supervisores?: SupervisorCandidato[];
          sucursales?: SucursalOpcion[];
        };
        setZonas(data.zonas ?? []);
        setSupervisores(data.supervisores ?? []);
        setSucursales(data.sucursales ?? []);
      } else {
        showToast('error', 'No se pudo cargar el territorio.');
      }
    } catch (err: unknown) {
      logger.error('Error cargando el territorio:', err);
      showToast('error', 'Error de red al cargar el territorio.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Carga inicial: el estado se actualiza al resolver el fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Lee el cuerpo de error de la API sin tragarse fallos de parseo
  const leerError = useCallback(async (res: Response, alternativo: string) => {
    try {
      const body = (await res.json()) as { error?: string; errors?: ZonaErrors };
      if (body.errors) setFormErrors(body.errors);
      return body.error ?? alternativo;
    } catch (parseErr: unknown) {
      logger.error('Respuesta de territorio sin JSON válido:', parseErr);
      return alternativo;
    }
  }, []);

  // ---- CU-04: alta y edición
  const setForm = useCallback((next: ZonaForm) => {
    setFormState(next);
    setFormErrors({});
  }, []);

  const openCrear = useCallback(() => {
    // Con una sola sucursal visible (alcance de sucursal) no hay nada que elegir
    setFormState({ ...FORM_VACIO, id_sucursal: sucursales.length === 1 ? sucursales[0].id : null });
    setFormErrors({});
    setFormModal({ open: true, zona: null });
  }, [sucursales]);

  const openEditar = useCallback((zona: ZonaItem) => {
    setFormState({
      codigo_zona: zona.codigo_zona,
      zona: zona.zona,
      descripcion_zona: zona.descripcion_zona ?? '',
      canal_venta: zona.canal_venta ?? '',
      id_sucursal: zona.id_sucursal,
    });
    setFormErrors({});
    setFormModal({ open: true, zona });
  }, []);

  const closeForm = useCallback(() => setFormModal({ open: false, zona: null }), []);

  const submitForm = useCallback(async () => {
    const editando = formModal.zona;
    const validacion = validarZona(form, { exigirSucursal: !editando });
    if (!validacion.isValid) {
      setFormErrors(validacion.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(editando ? `/api/admin/zonas/${editando.id}` : '/api/admin/zonas', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });
      if (res.ok) {
        closeForm();
        showToast('success', editando ? 'Se actualizó la zona.' : 'Se creó la zona.');
        await load();
      } else {
        showToast('error', await leerError(res, 'No se pudo guardar la zona.'));
      }
    } catch (err: unknown) {
      logger.error('Error guardando la zona:', err);
      showToast('error', 'Error de red al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, formModal.zona, closeForm, showToast, load, leerError]);

  // ---- Baja
  const openEliminar = useCallback((zona: ZonaItem) => setDeleteTarget(zona), []);
  const closeEliminar = useCallback(() => setDeleteTarget(null), []);

  const submitEliminar = useCallback(async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/zonas/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      if (res.ok) {
        showToast('success', 'Se eliminó la zona.');
        await load();
      } else {
        showToast('error', await leerError(res, 'No se pudo eliminar la zona.'));
      }
    } catch (err: unknown) {
      logger.error('Error eliminando la zona:', err);
      showToast('error', 'Error de red al eliminar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteTarget, showToast, load, leerError]);

  // ---- CU-07: supervisor de zona
  const openSupervisor = useCallback((zona: ZonaItem) => {
    setSupervisorSeleccion(zona.supervisor?.id_persona ?? null);
    setSupervisorTarget(zona);
  }, []);
  const closeSupervisor = useCallback(() => setSupervisorTarget(null), []);

  const submitSupervisor = useCallback(async () => {
    if (!supervisorTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/zonas/${supervisorTarget.id}/supervisor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_persona: supervisorSeleccion }),
      });
      setSupervisorTarget(null);
      if (res.ok) {
        showToast(
          'success',
          supervisorSeleccion === null ? 'La zona quedó sin supervisor.' : 'Se actualizó el supervisor de la zona.'
        );
        await load();
      } else {
        showToast('error', await leerError(res, 'No se pudo actualizar el supervisor.'));
      }
    } catch (err: unknown) {
      logger.error('Error asignando el supervisor:', err);
      showToast('error', 'Error de red al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [supervisorTarget, supervisorSeleccion, showToast, load, leerError]);

  return {
    zonas, supervisores, sucursales, isLoading, isSubmitting,
    formModal, form, setForm, formErrors, openCrear, openEditar, closeForm, submitForm,
    deleteTarget, openEliminar, closeEliminar, submitEliminar,
    supervisorTarget, supervisorSeleccion, setSupervisorSeleccion, openSupervisor, closeSupervisor, submitSupervisor,
    toast, clearToast,
  };
}
