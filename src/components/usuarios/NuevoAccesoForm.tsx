import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
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
          value={form.id_persona ?? ''}
          onChange={(e) =>
            setForm({ id_persona: e.target.value ? Number(e.target.value) : null })
          }
          error={formErrors.id_persona}
          placeholder="Seleccionar colaborador"
        >
          {personasSinCuenta.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellidos}, {p.nombres} — CI: {p.ci}
            </option>
          ))}
        </Select>

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
          value={form.id_rol ?? ''}
          onChange={(e) =>
            setForm({ id_rol: e.target.value ? Number(e.target.value) : null })
          }
          error={formErrors.id_rol}
          placeholder="Seleccionar rol"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </Select>

        {/* Sucursal — solo cuando alcance es SUCURSAL */}
        {form.alcance_tipo === 'SUCURSAL' && (
          <Select
            label="Sucursal"
            value={form.id_sucursal ?? ''}
            onChange={(e) =>
              setForm({ id_sucursal: e.target.value ? Number(e.target.value) : null })
            }
            error={formErrors.id_sucursal}
            placeholder="Seleccionar sucursal"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre_sucursal}
              </option>
            ))}
          </Select>
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
