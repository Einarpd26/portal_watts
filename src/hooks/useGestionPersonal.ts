import { useState, useEffect, useCallback } from 'react';
import { todayBolivia } from '@/utils/boliviaTime';
import { createClient } from '@/lib/supabase/client';
import type { PersonaConAsignacion, Sucursal, Cargo } from '@/types';

export type NuevaPersonaForm = {
  ci: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  id_sucursal: string;
  id_cargo: string;
  fecha_inicio: string;
};

const FORM_EMPTY: NuevaPersonaForm = {
  ci: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  id_sucursal: '',
  id_cargo: '',
  fecha_inicio: '',
};

export type BajaForm = {
  fecha_baja: string;
  revocar_acceso: boolean;
};

export type ToastState = { message: string; type: 'success' | 'error' } | null;

export function useGestionPersonal() {
  const [personas, setPersonas] = useState<PersonaConAsignacion[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [bajaTarget, setBajaTarget] = useState<PersonaConAsignacion | null>(null);
  const [bajaForm, setBajaForm] = useState<BajaForm>({ fecha_baja: '', revocar_acceso: false });
  const [form, setForm] = useState<NuevaPersonaForm>(FORM_EMPTY);
  const [formErrors, setFormErrors] = useState<Partial<NuevaPersonaForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const clearToast = useCallback(() => setToast(null), []);

  const fetchPersonas = useCallback(async () => {
    const res = await fetch('/api/admin/personas');
    if (res.ok) {
      const data = await res.json();
      setPersonas(data.personas ?? []);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function loadAll() {
      setIsLoading(true);
      try {
        const [personasRes, sucursalesRes, cargosRes] = await Promise.all([
          fetch('/api/admin/personas'),
          supabase.from('sucursales').select('id, nombre_sucursal, descripcion, created_at, updated_at').order('nombre_sucursal'),
          supabase.from('cargos').select('id, nombre_cargo, descripcion, created_at, updated_at').order('nombre_cargo'),
        ]);

        if (personasRes.ok) {
          const data = await personasRes.json();
          setPersonas(data.personas ?? []);
        }
        if (sucursalesRes.data) setSucursales(sucursalesRes.data as Sucursal[]);
        if (cargosRes.data) setCargos(cargosRes.data as Cargo[]);
      } finally {
        setIsLoading(false);
      }
    }

    void loadAll();
  }, []);

  const openModal = useCallback(() => {
    setEditingId(null);
    setForm(FORM_EMPTY);
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((p: PersonaConAsignacion) => {
    setEditingId(p.id);
    setForm({
      ci: p.ci,
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono ?? '',
      id_sucursal: p.asignacion ? String(p.asignacion.sucursal_id) : '',
      id_cargo: p.asignacion ? String(p.asignacion.cargo_id) : '',
      fecha_inicio: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(FORM_EMPTY);
    setFormErrors({});
  }, []);

  const openBaja = useCallback((p: PersonaConAsignacion) => {
    setBajaTarget(p);
    setBajaForm({ fecha_baja: todayBolivia(), revocar_acceso: false });
  }, []);

  const closeBaja = useCallback(() => setBajaTarget(null), []);

  function validate(): boolean {
    const errors: Partial<NuevaPersonaForm> = {};
    if (!form.ci.trim()) errors.ci = 'El CI es obligatorio';
    if (!form.nombres.trim()) errors.nombres = 'El nombre es obligatorio';
    if (!form.apellidos.trim()) errors.apellidos = 'El apellido es obligatorio';
    if (!form.id_sucursal) errors.id_sucursal = 'Seleccioná una sucursal';
    if (!form.id_cargo) errors.id_cargo = 'Seleccioná un cargo';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const submitPersona = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const isEdit = editingId !== null;
    try {
      const res = await fetch(isEdit ? `/api/admin/personas/${editingId}` : '/api/admin/create-persona', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ci: form.ci.trim(),
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim() || undefined,
          id_sucursal: Number(form.id_sucursal),
          id_cargo: Number(form.id_cargo),
          fecha_inicio: isEdit ? undefined : form.fecha_inicio || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({
          message: data.error ?? (isEdit ? 'Error al actualizar colaborador' : 'Error al registrar colaborador'),
          type: 'error',
        });
        return;
      }
      setToast({
        message: isEdit ? 'Colaborador actualizado correctamente' : 'Colaborador registrado correctamente',
        type: 'success',
      });
      closeModal();
      await fetchPersonas();
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editingId, closeModal, fetchPersonas]);

  const submitBaja = useCallback(async () => {
    if (!bajaTarget || !bajaForm.fecha_baja) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/personas/${bajaTarget.id}/baja`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bajaForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? 'Error al registrar la baja', type: 'error' });
        return;
      }
      setToast(
        data.revocacion_fallida
          ? { message: 'Baja registrada, pero no se pudo revocar el acceso digital. Revocalo desde Cuentas.', type: 'error' }
          : { message: 'Baja registrada correctamente', type: 'success' }
      );
      closeBaja();
      await fetchPersonas();
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [bajaTarget, bajaForm, closeBaja, fetchPersonas]);

  return {
    personas,
    sucursales,
    cargos,
    isLoading,
    isModalOpen,
    form,
    setForm,
    formErrors,
    isSubmitting,
    toast,
    clearToast,
    editingId,
    openModal,
    openEditModal,
    closeModal,
    submitPersona,
    bajaTarget,
    bajaForm,
    setBajaForm,
    openBaja,
    closeBaja,
    submitBaja,
  };
}
