"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { SucursalOpcion, ZonaForm } from '@/hooks/useGestionTerritorio';
import type { ZonaErrors } from '@/utils/zonaValidation';
import type { ZonaItem } from '@/types';

interface FormularioZonaProps {
  editando: ZonaItem | null;
  form: ZonaForm;
  setForm: (form: ZonaForm) => void;
  errors: ZonaErrors;
  sucursales: SucursalOpcion[];
  isSubmitting: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
}

/**
 * Datos de la zona en el panel lateral (como FormularioRuta). La zona no tiene polígono propio:
 * su contorno es la envolvente de sus rutas (ADR-002 D7), así que el mapa solo la muestra.
 */
export function FormularioZona({
  editando,
  form,
  setForm,
  errors,
  sucursales,
  isSubmitting,
  onGuardar,
  onCancelar,
}: FormularioZonaProps) {
  const sucursalActual = sucursales.find((s) => s.id === form.id_sucursal);

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar();
      }}
    >
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">{editando ? `Editar ${editando.codigo_zona}` : 'Nueva zona'}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Sucursal</p>
            <p className="text-sm text-gray-900">{sucursalActual?.nombre ?? '—'}</p>
            {editando && <p className="mt-0.5 text-xs text-gray-500">Una zona no puede cambiar de sucursal.</p>}
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

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Contorno</p>
          <p className="text-sm text-gray-600">
            Se calcula solo: es la figura que envuelve a las rutas de la zona. Se define al crear o trasladar rutas.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 p-3">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          {editando ? 'Guardar cambios' : 'Crear zona'}
        </Button>
      </div>
    </form>
  );
}
