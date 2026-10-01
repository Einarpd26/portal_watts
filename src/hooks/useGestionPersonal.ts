import { useState, useEffect, useCallback } from 'react';
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

export type ToastState = { message: string; type: 'success' | 'error' } | null;

export function useGestionPersonal() {
  const [personas, setPersonas] = useState<PersonaConAsignacion[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setForm(FORM_EMPTY);
    setFormErrors({});
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setForm(FORM_EMPTY);
    setFormErrors({});
  }, []);

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

  const submitNuevaPersona = useCallback(async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/create-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ci: form.ci.trim(),
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim() || undefined,
          id_sucursal: Number(form.id_sucursal),
          id_cargo: Number(form.id_cargo),
          fecha_inicio: form.fecha_inicio || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? 'Error al registrar colaborador', type: 'error' });
        return;
      }
      setToast({ message: 'Colaborador registrado correctamente', type: 'success' });
      closeModal();
      await fetchPersonas();
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, closeModal, fetchPersonas]);

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
    openModal,
    closeModal,
    submitNuevaPersona,
  };
}
