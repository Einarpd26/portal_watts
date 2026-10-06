"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { CatalogoForm } from '@/hooks/useGestionCatalogos';
import type { CatalogoErrors } from '@/utils/catalogoValidation';

interface CatalogoFormModalProps {
  open: boolean;
  editando: boolean;
  etiqueta: string;
  descripcionObligatoria: boolean;
  form: CatalogoForm;
  setForm: (form: CatalogoForm) => void;
  errors: CatalogoErrors;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function CatalogoFormModal({
  open,
  editando,
  etiqueta,
  descripcionObligatoria,
  form,
  setForm,
  errors,
  isSubmitting,
  onSubmit,
  onCancel,
}: CatalogoFormModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, open && !isSubmitting);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalogo-form-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h3 id="catalogo-form-title" className="mb-5 text-lg font-bold text-gray-900">
          {editando ? `Editar ${etiqueta}` : `Nueva ${etiqueta}`}
        </h3>

        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            error={errors.nombre}
            disabled={isSubmitting}
            autoFocus
          />
          <Input
            label={descripcionObligatoria ? 'Descripción' : 'Descripción (opcional)'}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            error={errors.descripcion}
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {editando ? 'Guardar cambios' : 'Crear'}
          </Button>
        </div>
      </form>
    </div>
  );
}
