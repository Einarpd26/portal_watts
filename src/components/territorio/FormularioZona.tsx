"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { SucursalOpcion, ZonaForm } from '@/hooks/useGestionTerritorio';
import { estadoCorreccionSucursal, MENSAJE_CORRECCION_SUCURSAL } from '@/utils/correccionSucursalZona';
import type { ZonaErrors } from '@/utils/zonaValidation';
import type { ZonaItem } from '@/types';

interface FormularioZonaProps {
  editando: ZonaItem | null;
  form: ZonaForm;
  setForm: (form: ZonaForm) => void;
  errors: ZonaErrors;
  sucursales: SucursalOpcion[];
  /** Opera con alcance global: puede corregir la sucursal de una zona vacía (CU-04 A4) */
  alcanceGlobal: boolean;
  confirmaCambio: boolean;
  setConfirmaCambio: (confirma: boolean) => void;
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
  alcanceGlobal,
  confirmaCambio,
  setConfirmaCambio,
  isSubmitting,
  onGuardar,
  onCancelar,
}: FormularioZonaProps) {
  const sucursalActual = sucursales.find((s) => s.id === form.id_sucursal);
  // La sucursal se corrige solo por error de registro: con alcance global y la zona sin rutas ni supervisor
  const correccion = editando
    ? estadoCorreccionSucursal({
        alcanceGlobal,
        totalRutas: editando.total_rutas,
        tieneSupervisor: editando.supervisor !== null,
      })
    : null;
  const puedeCorregir = correccion === 'editable' && sucursales.length > 1;
  const cambiaSucursal = editando !== null && form.id_sucursal !== editando.id_sucursal;

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

        {(editando && !puedeCorregir) || sucursales.length <= 1 ? (
          // Con una sola sucursal visible no hay nada que elegir; si no se puede corregir, se explica el motivo
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Sucursal</p>
            <p className="text-sm text-gray-900">{sucursalActual?.nombre ?? '—'}</p>
            {correccion && correccion !== 'editable' && (
              <p className="mt-0.5 text-xs text-gray-500">{MENSAJE_CORRECCION_SUCURSAL[correccion]}</p>
            )}
          </div>
        ) : (
          <Select
            label="Sucursal"
            placeholder="Seleccionar sucursal"
            value={form.id_sucursal ?? ''}
            onChange={(e) => setForm({ ...form, id_sucursal: e.target.value ? Number(e.target.value) : null })}
            error={cambiaSucursal ? undefined : errors.id_sucursal}
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

      <div className="shrink-0 border-t border-gray-200">
        {/* Al pie para que la confirmación se vea siempre, sin depender del desplazamiento del formulario */}
        {puedeCorregir && cambiaSucursal && editando && (
          <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>
              Vas a mover la zona de <strong>{editando.sucursal_nombre}</strong> a{' '}
              <strong>{sucursalActual?.nombre}</strong>. Úsalo solo para corregir un error de registro.
            </p>
            <label className="mt-2 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary-600"
                checked={confirmaCambio}
                disabled={isSubmitting}
                onChange={(e) => setConfirmaCambio(e.target.checked)}
              />
              <span>Confirmo el cambio de sucursal</span>
            </label>
            {errors.id_sucursal && <p className="mt-1 text-xs font-medium text-red-700">{errors.id_sucursal}</p>}
          </div>
        )}
        <div className="flex justify-end gap-2 p-3">
          <Button type="button" variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {editando ? 'Guardar cambios' : 'Crear zona'}
          </Button>
        </div>
      </div>
    </form>
  );
}
