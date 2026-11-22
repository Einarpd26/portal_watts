"use client";

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { aNumeroONulo, deNumeroONulo } from '@/utils/seleccion';
import type { PersonaSinCuenta, Rol, Sucursal } from '@/types';
import type { FormState } from '@/hooks/useGestionUsuarios';

export interface CamposNuevoAccesoProps {
  personasSinCuenta: PersonaSinCuenta[];
  roles: Rol[];
  sucursales: Sucursal[];
  form: FormState;
  setForm: (updates: Partial<FormState>) => void;
  formErrors: Partial<Record<keyof FormState, string>>;
}

/** Los campos de «Dar acceso»: los comparten la columna lateral de escritorio y la hoja del celular */
export default function CamposNuevoAcceso({ personasSinCuenta, roles, sucursales, form, setForm, formErrors }: CamposNuevoAccesoProps) {
  return (
    <>
      <Select
        label="Colaborador"
        buscable
        valor={deNumeroONulo(form.id_persona)}
        onCambiar={(v) => setForm({ id_persona: aNumeroONulo(v) })}
        opciones={personasSinCuenta.map((p) => ({ valor: String(p.id), texto: `${p.apellidos}, ${p.nombres} — CI: ${p.ci}` }))}
        error={formErrors.id_persona}
        placeholder="Seleccionar colaborador"
      />

      <Input
        label="Email"
        type="email"
        placeholder="colaborador@empresa.com"
        value={form.email}
        onChange={(e) => setForm({ email: e.target.value })}
        error={formErrors.email}
        autoComplete="email"
      />

      <Select
        label="Rol"
        valor={deNumeroONulo(form.id_rol)}
        onCambiar={(v) => setForm({ id_rol: aNumeroONulo(v) })}
        opciones={roles.map((r) => ({ valor: String(r.id), texto: r.nombre }))}
        error={formErrors.id_rol}
        placeholder="Seleccionar rol"
      />

      {/* Sucursal: solo cuando el alcance del rol es de sucursal */}
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
    </>
  );
}
