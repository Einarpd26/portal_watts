"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { HojaFormulario } from '@/components/ui/HojaFormulario';
import type { CatalogoForm } from '@/hooks/useGestionCatalogos';
import type { CatalogoErrors } from '@/utils/catalogoValidation';

interface CatalogoFormHojaProps {
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

/** Alta y edición de un elemento del catálogo en una hoja: inferior en el celular, lateral en escritorio */
export default function CatalogoFormHoja({
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
}: CatalogoFormHojaProps) {
  return (
    <HojaFormulario
      abierta={open}
      titulo={editando ? `Editar ${etiqueta}` : `Nueva ${etiqueta}`}
      bloqueada={isSubmitting}
      onEnviar={onSubmit}
      onCerrar={onCancel}
      pie={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="flex-1">
            {editando ? 'Guardar cambios' : 'Crear'}
          </Button>
        </>
      }
    >
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
    </HojaFormulario>
  );
}
