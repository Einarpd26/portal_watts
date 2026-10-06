import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { validarCatalogo, type CatalogoErrors, type CatalogoTipo } from '@/utils/catalogoValidation';
import type { CatalogoItem } from '@/types';

export interface CatalogoForm {
  nombre: string;
  descripcion: string;
}

const EMPTY_FORM: CatalogoForm = { nombre: '', descripcion: '' };

type Toast = { type: 'success' | 'error'; message: string };
type FormModal = { open: boolean; item: CatalogoItem | null };

export const ETIQUETAS: Record<CatalogoTipo, { singular: string; plural: string }> = {
  sucursales: { singular: 'sucursal', plural: 'sucursales' },
  cargos: { singular: 'cargo', plural: 'cargos' },
};

export interface UseGestionCatalogosReturn {
  tipo: CatalogoTipo;
  cambiarTipo: (tipo: CatalogoTipo) => void;
  items: CatalogoItem[];
  isLoading: boolean;
  isSubmitting: boolean;
  formModal: FormModal;
  form: CatalogoForm;
  setForm: (form: CatalogoForm) => void;
  formErrors: CatalogoErrors;
  openCrear: () => void;
  openEditar: (item: CatalogoItem) => void;
  closeForm: () => void;
  submitForm: () => Promise<void>;
  deleteTarget: CatalogoItem | null;
  openEliminar: (item: CatalogoItem) => void;
  closeEliminar: () => void;
  submitEliminar: () => Promise<void>;
  toast: Toast | null;
  clearToast: () => void;
}

export function useGestionCatalogos(): UseGestionCatalogosReturn {
  const [tipo, setTipo] = useState<CatalogoTipo>('sucursales');
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formModal, setFormModal] = useState<FormModal>({ open: false, item: null });
  const [form, setFormState] = useState<CatalogoForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<CatalogoErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<CatalogoItem | null>(null);

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

  // El indicador de carga lo activa quien dispara el cambio de catálogo (cambiarTipo);
  // las recargas tras guardar o eliminar no muestran el esqueleto.
  const load = useCallback(async (catalogo: CatalogoTipo) => {
    try {
      const res = await fetch(`/api/admin/catalogos/${catalogo}`);
      if (res.ok) {
        const data = (await res.json()) as { items?: CatalogoItem[] };
        setItems(data.items ?? []);
      } else {
        setItems([]);
        showToast('error', `No se pudo cargar el listado de ${ETIQUETAS[catalogo].plural}.`);
      }
    } catch (err: unknown) {
      logger.error('Error cargando catálogo:', err);
      setItems([]);
      showToast('error', 'Error de red al cargar el catálogo.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Carga inicial y al cambiar de catálogo: el estado se actualiza al resolver el fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(tipo);
  }, [tipo, load]);

  const cambiarTipo = useCallback((nuevo: CatalogoTipo) => {
    setIsLoading(true);
    setTipo(nuevo);
    setFormModal({ open: false, item: null });
    setDeleteTarget(null);
  }, []);

  const setForm = useCallback((next: CatalogoForm) => {
    setFormState(next);
    setFormErrors({});
  }, []);

  const openCrear = useCallback(() => {
    setFormState(EMPTY_FORM);
    setFormErrors({});
    setFormModal({ open: true, item: null });
  }, []);

  const openEditar = useCallback((item: CatalogoItem) => {
    setFormState({ nombre: item.nombre, descripcion: item.descripcion ?? '' });
    setFormErrors({});
    setFormModal({ open: true, item });
  }, []);

  const closeForm = useCallback(() => setFormModal({ open: false, item: null }), []);

  // Lee el cuerpo de error de la API sin tragarse fallos de parseo
  const leerError = useCallback(async (res: Response, fallback: string) => {
    try {
      const body = (await res.json()) as { error?: string; errors?: CatalogoErrors };
      if (body.errors) setFormErrors(body.errors);
      return body.error ?? fallback;
    } catch (parseErr: unknown) {
      logger.error('Respuesta de catálogo sin JSON válido:', parseErr);
      return fallback;
    }
  }, []);

  const submitForm = useCallback(async () => {
    const validacion = validarCatalogo(tipo, form.nombre, form.descripcion);
    if (!validacion.isValid) {
      setFormErrors(validacion.errors);
      return;
    }

    const editando = formModal.item;
    const etiqueta = ETIQUETAS[tipo].singular;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        editando ? `/api/admin/catalogos/${tipo}/${editando.id}` : `/api/admin/catalogos/${tipo}`,
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validacion.data),
        }
      );

      if (res.ok) {
        closeForm();
        showToast('success', editando ? `Se actualizó la ${etiqueta}.` : `Se creó la ${etiqueta}.`);
        await load(tipo);
      } else {
        showToast('error', await leerError(res, `No se pudo guardar la ${etiqueta}.`));
      }
    } catch (err: unknown) {
      logger.error('Error guardando catálogo:', err);
      showToast('error', 'Error de red al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [tipo, form, formModal.item, closeForm, showToast, load, leerError]);

  const openEliminar = useCallback((item: CatalogoItem) => setDeleteTarget(item), []);
  const closeEliminar = useCallback(() => setDeleteTarget(null), []);

  const submitEliminar = useCallback(async () => {
    if (!deleteTarget) return;
    const etiqueta = ETIQUETAS[tipo].singular;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/catalogos/${tipo}/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        showToast('success', `Se eliminó la ${etiqueta}.`);
        await load(tipo);
      } else {
        setDeleteTarget(null);
        showToast('error', await leerError(res, `No se pudo eliminar la ${etiqueta}.`));
      }
    } catch (err: unknown) {
      logger.error('Error eliminando catálogo:', err);
      showToast('error', 'Error de red al eliminar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteTarget, tipo, showToast, load, leerError]);

  return {
    tipo,
    cambiarTipo,
    items,
    isLoading,
    isSubmitting,
    formModal,
    form,
    setForm,
    formErrors,
    openCrear,
    openEditar,
    closeForm,
    submitForm,
    deleteTarget,
    openEliminar,
    closeEliminar,
    submitEliminar,
    toast,
    clearToast,
  };
}
