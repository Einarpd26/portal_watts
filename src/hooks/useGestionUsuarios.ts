import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PersonaSinCuenta, Rol, Sucursal, UsuarioActivo } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormState {
  id_persona: number | null;
  email: string;
  password: string;
  id_rol: number | null;
  alcance_tipo: 'GLOBAL' | 'SUCURSAL';
  id_sucursal: number | null;
}

const EMPTY_FORM: FormState = {
  id_persona: null,
  email: '',
  password: '',
  id_rol: null,
  alcance_tipo: 'SUCURSAL',
  id_sucursal: null,
};

export interface UseGestionUsuariosReturn {
  // Data
  personasSinCuenta: PersonaSinCuenta[];
  activeUsers: UsuarioActivo[];
  roles: Rol[];
  sucursales: Sucursal[];
  isLoading: boolean;
  // Form
  form: FormState;
  setForm: (updates: Partial<FormState>) => void;
  resetForm: () => void;
  formErrors: Partial<Record<keyof FormState, string>>;
  isSubmitting: boolean;
  // Modals
  confirmModal: {
    open: boolean;
    preview: { nombre: string; email: string; rolNombre: string } | null;
  };
  openConfirm: () => void;
  closeConfirm: () => void;
  revokeModal: { open: boolean; user: UsuarioActivo | null };
  openRevoke: (user: UsuarioActivo) => void;
  closeRevoke: () => void;
  // Actions
  submitInvite: () => Promise<void>;
  submitRevoke: () => Promise<void>;
  // Feedback
  toast: { type: 'success' | 'error' | 'warning'; message: string } | null;
  clearToast: () => void;
}

// ---------------------------------------------------------------------------
// Roles that have GLOBAL scope
// ---------------------------------------------------------------------------
const GLOBAL_ROLES = ['GERENCIA_COMERCIAL'];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGestionUsuarios(): UseGestionUsuariosReturn {
  const [personasSinCuenta, setPersonasSinCuenta] = useState<PersonaSinCuenta[]>([]);
  const [activeUsers, setActiveUsers] = useState<UsuarioActivo[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [form, setFormState] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    preview: { nombre: string; email: string; rolNombre: string } | null;
  }>({ open: false, preview: null });

  const [revokeModal, setRevokeModal] = useState<{ open: boolean; user: UsuarioActivo | null }>({
    open: false,
    user: null,
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [personasRes, usersRes] = await Promise.all([
        fetch('/api/admin/personas-sin-cuenta'),
        fetch('/api/admin/active-users'),
      ]);

      if (personasRes.ok) {
        const d = await personasRes.json();
        setPersonasSinCuenta(d.personas ?? []);
      }

      if (usersRes.ok) {
        const d = await usersRes.json();
        setActiveUsers(d.users ?? []);
      }
    } catch (err) {
      console.error('Error loading gestión accesos data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCatalogos = useCallback(async () => {
    const supabase = createClient();
    const [rolesRes, sucursalesRes] = await Promise.all([
      supabase.from('roles').select('id, codigo, nombre, permisos, descripcion, created_at').order('nombre'),
      supabase.from('sucursales').select('id, nombre_sucursal').order('nombre_sucursal'),
    ]);

    if (rolesRes.data) setRoles(rolesRes.data);
    if (sucursalesRes.data) setSucursales(sucursalesRes.data as Sucursal[]);
  }, []);

  useEffect(() => {
    void Promise.all([loadData(), loadCatalogos()]);
  }, [loadData, loadCatalogos]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------
  const setForm = useCallback((updates: Partial<FormState>) => {
    setFormState((prev) => {
      const next = { ...prev, ...updates };

      // Auto-set alcance_tipo when rol changes
      if (updates.id_rol !== undefined) {
        setRoles((currentRoles) => {
          const selectedRole = currentRoles.find((r) => r.id === updates.id_rol);
          if (selectedRole) {
            const isGlobal = GLOBAL_ROLES.includes(selectedRole.codigo);
            next.alcance_tipo = isGlobal ? 'GLOBAL' : 'SUCURSAL';
            if (isGlobal) next.id_sucursal = null;
          }
          return currentRoles;
        });
      }

      return next;
    });
  }, []);

  const resetForm = useCallback(() => {
    setFormState(EMPTY_FORM);
    setFormErrors({});
  }, []);

  // ---------------------------------------------------------------------------
  // Toast helpers
  // ---------------------------------------------------------------------------
  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.id_persona) errors.id_persona = 'Seleccioná un colaborador';
    if (!form.email) errors.email = 'El email es requerido';
    else if (!EMAIL_REGEX.test(form.email)) errors.email = 'Email inválido';
    if (!form.password) errors.password = 'La contraseña es requerida';
    else if (form.password.length < 8) errors.password = 'Mínimo 8 caracteres';
    if (!form.id_rol) errors.id_rol = 'Seleccioná un rol';
    if (form.alcance_tipo === 'SUCURSAL' && !form.id_sucursal) {
      errors.id_sucursal = 'Seleccioná una sucursal';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Modals
  // ---------------------------------------------------------------------------
  const openConfirm = useCallback(() => {
    if (!validate()) return;

    const persona = personasSinCuenta.find((p) => p.id === form.id_persona);
    const rol = roles.find((r) => r.id === form.id_rol);

    setConfirmModal({
      open: true,
      preview: {
        nombre: persona ? `${persona.nombres} ${persona.apellidos}` : '',
        email: form.email,
        rolNombre: rol?.nombre ?? '',
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, personasSinCuenta, roles]);

  const closeConfirm = useCallback(() => {
    setConfirmModal({ open: false, preview: null });
  }, []);

  const openRevoke = useCallback((user: UsuarioActivo) => {
    setRevokeModal({ open: true, user });
  }, []);

  const closeRevoke = useCallback(() => {
    setRevokeModal({ open: false, user: null });
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const submitInvite = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_persona: form.id_persona,
          email: form.email,
          password: form.password,
          id_rol: form.id_rol,
          alcance_tipo: form.alcance_tipo,
          id_sucursal: form.id_sucursal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error ?? 'Error al crear acceso');
        return;
      }

      closeConfirm();
      resetForm();
      await loadData();
      showToast('success', data.message ?? 'Acceso creado correctamente');
    } catch (err) {
      console.error('Error en submitInvite:', err);
      showToast('error', 'Error de conexión. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, closeConfirm, resetForm, loadData, showToast]);

  const submitRevoke = useCallback(async () => {
    if (!revokeModal.user) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/revoke-user/${revokeModal.user.id_persona}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        showToast('error', data.error ?? 'Error al revocar acceso');
        return;
      }

      closeRevoke();
      await loadData();
      showToast('success', 'Acceso revocado correctamente');
    } catch (err) {
      console.error('Error en submitRevoke:', err);
      showToast('error', 'Error de conexión. Intentá de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [revokeModal.user, closeRevoke, loadData, showToast]);

  return {
    personasSinCuenta,
    activeUsers,
    roles,
    sucursales,
    isLoading,
    form,
    setForm,
    resetForm,
    formErrors,
    isSubmitting,
    confirmModal,
    openConfirm,
    closeConfirm,
    revokeModal,
    openRevoke,
    closeRevoke,
    submitInvite,
    submitRevoke,
    toast,
    clearToast,
  };
}
