import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import type { PersonaSinCuenta, Rol, Sucursal } from '@/types';
import type { FormState } from '@/hooks/useGestionUsuarios';

interface NuevoAccesoFormProps {
  personasSinCuenta: PersonaSinCuenta[];
  roles: Rol[];
  sucursales: Sucursal[];
  form: FormState;
  setForm: (updates: Partial<FormState>) => void;
  formErrors: Partial<Record<keyof FormState, string>>;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function NuevoAccesoForm({
  personasSinCuenta,
  roles,
  sucursales,
  form,
  setForm,
  formErrors,
  isSubmitting,
  onSubmit,
}: NuevoAccesoFormProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-900">Dar Acceso</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Otorgá credenciales de acceso a un colaborador activo
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        className="space-y-4"
      >
        {/* Colaborador */}
        <Select
          label="Colaborador"
          buscable
          valor={deNumeroONulo(form.id_persona)}
          onCambiar={(v) => setForm({ id_persona: aNumeroONulo(v) })}
          opciones={personasSinCuenta.map((p) => ({ valor: String(p.id), texto: `${p.apellidos}, ${p.nombres} — CI: ${p.ci}` }))}
          error={formErrors.id_persona}
          placeholder="Seleccionar colaborador"
        />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="colaborador@empresa.com"
          value={form.email}
          onChange={(e) => setForm({ email: e.target.value })}
          error={formErrors.email}
          autoComplete="email"
        />

        {/* Rol */}
        <Select
          label="Rol"
          valor={deNumeroONulo(form.id_rol)}
          onCambiar={(v) => setForm({ id_rol: aNumeroONulo(v) })}
          opciones={roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
          error={formErrors.id_rol}
          placeholder="Seleccionar rol"
        />

        {/* Sucursal — solo cuando alcance es SUCURSAL */}
        {form.alcance_tipo === 'SUCURSAL' && (
          <Select
            label="Sucursal"
            valor={deNumeroONulo(form.id_sucursal)}
            onCambiar={(v) => setForm({ id_sucursal: aNumeroONulo(v) })}
            opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre_sucursal }))}
            error={formErrors.id_sucursal}
            placeholder="Seleccionar sucursal"
          />
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full"
        >
          Dar Acceso
        </Button>
      </form>
    </div>
  );
}
