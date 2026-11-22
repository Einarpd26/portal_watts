"use client";

import Button from '@/components/ui/Button';
import { HojaFormulario } from '@/components/ui/HojaFormulario';
import CamposNuevoAcceso, { type CamposNuevoAccesoProps } from './CamposNuevoAcceso';

interface NuevoAccesoHojaProps extends CamposNuevoAccesoProps {
  abierta: boolean;
  isSubmitting: boolean;
  /** Valida y pide la confirmación; la hoja sigue abierta si hay errores en los campos */
  onSubmit: () => void;
  onCerrar: () => void;
}

/** «Dar acceso» en una hoja inferior, para pantallas chicas: así la lista de cuentas queda arriba y no debajo del formulario */
export default function NuevoAccesoHoja({ abierta, isSubmitting, onSubmit, onCerrar, ...campos }: NuevoAccesoHojaProps) {
  return (
    <HojaFormulario
      abierta={abierta}
      titulo="Dar acceso"
      bloqueada={isSubmitting}
      onEnviar={onSubmit}
      onCerrar={onCerrar}
      pie={
        <>
          <Button type="button" variant="secondary" onClick={onCerrar} disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Dar acceso
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500">Otorgá credenciales de acceso a un colaborador activo.</p>
      <CamposNuevoAcceso {...campos} />
    </HojaFormulario>
  );
}
