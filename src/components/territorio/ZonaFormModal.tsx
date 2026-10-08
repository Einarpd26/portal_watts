"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { SucursalOpcion, ZonaForm } from '@/hooks/useGestionTerritorio';
import type { ZonaErrors } from '@/utils/zonaValidation';

interface ZonaFormModalProps {
  open: boolean;
  editando: boolean;
  form: ZonaForm;
  setForm: (form: ZonaForm) => void;
  errors: ZonaErrors;
  sucursales: SucursalOpcion[];
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function ZonaFormModal({
  open,
  editando,
  form,
  setForm,
  errors,
  sucursales,
  isSubmitting,
  onSubmit,
  onCancel,
}: ZonaFormModalProps) {
  // Esc equivale a Cancelar (salvo mientras se envía)
  useEscapeKey(onCancel, open && !isSubmitting);

  if (!open) return null;

  const sucursalActual = sucursales.find((s) => s.id === form.id_sucursal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="zona-form-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h3 id="zona-form-title" className="mb-5 text-lg font-bold text-gray-900">
          {editando ? 'Editar zona' : 'Nueva zona'}
        </h3>

        <div className="space-y-4">
          <Input
            label="Código"
            value={form.codigo_zona}
            onChange={(e) => setForm({ ...form, codigo_zona: e.target.value })}
            error={errors.codigo_zona}
            disabled={isSubmitting}
            placeholder="ZN"
            autoFocus
          />
          <Input
            label="Nombre de la zona"
            value={form.zona}
            onChange={(e) => setForm({ ...form, zona: e.target.value })}
            error={errors.zona}
            disabled={isSubmitting}
          />
          <Input
            label="Descripción (opcional)"
            value={form.descripcion_zona}
            onChange={(e) => setForm({ ...form, descripcion_zona: e.target.value })}
            error={errors.descripcion_zona}
            disabled={isSubmitting}
          />
          <Input
            label="Canal de venta (opcional)"
            value={form.canal_venta}
            onChange={(e) => setForm({ ...form, canal_venta: e.target.value })}
            error={errors.canal_venta}
            disabled={isSubmitting}
            placeholder="Minorista"
          />

          {editando || sucursales.length <= 1 ? (
            // Una zona no cambia de sucursal; con una sola sucursal visible tampoco hay nada que elegir
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">Sucursal</p>
              <p className="text-sm text-gray-900">{sucursalActual?.nombre ?? '—'}</p>
              {editando && <p className="mt-1 text-xs text-gray-500">Una zona no puede cambiar de sucursal.</p>}
            </div>
          ) : (
            <Select
              label="Sucursal"
              placeholder="Seleccionar sucursal"
              value={form.id_sucursal ?? ''}
              onChange={(e) => setForm({ ...form, id_sucursal: e.target.value ? Number(e.target.value) : null })}
              error={errors.id_sucursal}
              disabled={isSubmitting}
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          )}
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
