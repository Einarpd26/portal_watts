"use client";

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import { cn } from '@/utils/cn';
import { formatoArea, type EstadoPoligono } from '@/utils/estadoPoligono';
import type { RutaForm } from '@/hooks/useGestionRutas';
import type { RutaErrors } from '@/utils/rutaValidation';
import type { RutaItem, ZonaDeRuta } from '@/types';

interface FormularioRutaProps {
  editando: RutaItem | null;
  zonas: ZonaDeRuta[];
  form: RutaForm;
  setForm: (form: RutaForm) => void;
  errors: RutaErrors;
  estado: EstadoPoligono;
  isSubmitting: boolean;
  puedeGuardar: boolean;
  onGuardar: () => void;
  onCancelar: () => void;
}

/** Resumen del polígono en una línea: el detalle y sus acciones están en la barra del mapa */
function resumenPoligono(estado: EstadoPoligono): { texto: string; tono: 'neutro' | 'ok' | 'error' } {
  switch (estado.tipo) {
    case 'pendiente':
      return { texto: 'Sin definir: dibújalo o impórtalo desde el mapa.', tono: 'neutro' };
    case 'guardado':
      return { texto: 'Se conserva el polígono guardado.', tono: 'neutro' };
    case 'dibujando':
      return { texto: 'Dibujando en el mapa…', tono: 'neutro' };
    case 'validando':
      return { texto: 'Validando…', tono: 'neutro' };
    case 'valido':
      return { texto: `Válido${estado.area_m2 !== null ? ` · ${formatoArea(estado.area_m2)}` : ''}`, tono: 'ok' };
    case 'invalido':
      return { texto: 'Hay que corregirlo (ver el mapa).', tono: 'error' };
  }
}

const TONOS = { neutro: 'text-gray-600', ok: 'text-success-700', error: 'text-primary-700' } as const;

/** Datos administrativos de la ruta. El polígono se maneja desde el mapa. */
export function FormularioRuta({
  editando,
  zonas,
  form,
  setForm,
  errors,
  estado,
  isSubmitting,
  puedeGuardar,
  onGuardar,
  onCancelar,
}: FormularioRutaProps) {
  const zona = zonas.find((z) => z.id === (editando?.id_zona ?? form.id_zona));
  const resumen = resumenPoligono(estado);

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
        <h2 className="text-sm font-bold text-gray-900">{editando ? `Editar ${editando.codigo_ruta}` : 'Nueva ruta'}</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {editando ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Zona</p>
            <p className="text-sm text-gray-900">
              {zona?.codigo_zona} — {zona?.zona}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Para cambiarla usa el traslado de rutas.</p>
          </div>
        ) : (
          <Select
            label="Zona"
            placeholder="Seleccionar zona"
            buscable
            valor={deNumeroONulo(form.id_zona)}
            onCambiar={(v) => setForm({ ...form, id_zona: aNumeroONulo(v) })}
            opciones={zonas.map((z) => ({ valor: String(z.id), texto: `${z.codigo_zona} — ${z.zona}` }))}
            error={errors.id_zona}
            disabled={isSubmitting}
          />
        )}
        <Input
          label="Código"
          value={form.codigo_ruta}
          onChange={(e) => setForm({ ...form, codigo_ruta: e.target.value })}
          error={errors.codigo_ruta}
          disabled={isSubmitting}
          placeholder="R-N5"
        />
        <Input
          label="Nombre"
          value={form.ruta}
          onChange={(e) => setForm({ ...form, ruta: e.target.value })}
          error={errors.ruta}
          disabled={isSubmitting}
        />
        <Input
          label="Descripción (opcional)"
          value={form.descripcion_ruta}
          onChange={(e) => setForm({ ...form, descripcion_ruta: e.target.value })}
          error={errors.descripcion_ruta}
          disabled={isSubmitting}
        />
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Polígono</p>
          <p className={cn('text-sm', TONOS[resumen.tono])}>{resumen.texto}</p>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 p-3">
        <Button type="button" variant="secondary" onClick={onCancelar} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={!puedeGuardar}>
          Guardar ruta
        </Button>
      </div>
    </form>
  );
}
