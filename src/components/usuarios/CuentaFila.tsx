"use client";

import { MenuAcciones, type AccionDeFila } from '@/components/ui/MenuAcciones';
import { cn } from '@/utils/cn';
import { colorDeAvatar, iniciales } from '@/utils/avatar';
import { textoDeAlcance } from '@/utils/cuentasActivas';
import type { UsuarioActivo } from '@/types';

interface CuentaFilaProps {
  cuenta: UsuarioActivo;
  esPropia: boolean;
  puedeRevocar: boolean;
  onRevocar: (cuenta: UsuarioActivo) => void;
  onDesbloquear?: (cuenta: UsuarioActivo) => void;
}

/**
 * Una cuenta activa como fila, para el celular: avatar, nombre, correo, rol, CI y alcance, y un menú «⋮» con lo que
 * se puede hacer con ella. Sin acciones posibles (por ejemplo, la cuenta propia) no hay menú.
 */
export default function CuentaFila({ cuenta, esPropia, puedeRevocar, onRevocar, onDesbloquear }: CuentaFilaProps) {
  const nombreCompleto = `${cuenta.apellidos} ${cuenta.nombres}`;
  const rol = cuenta.roles[0];
  const acciones: AccionDeFila[] = [
    ...(cuenta.bloqueado && onDesbloquear ? [{ etiqueta: 'Desbloquear', onClick: () => onDesbloquear(cuenta) }] : []),
    ...(puedeRevocar ? [{ etiqueta: 'Revocar acceso', variante: 'peligro' as const, onClick: () => onRevocar(cuenta) }] : []),
  ];

  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
      <div
        className={cn('flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-bold', colorDeAvatar(nombreCompleto))}
        aria-hidden="true"
      >
        {iniciales(cuenta.nombres, cuenta.apellidos)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="break-words text-sm font-semibold text-gray-900">{nombreCompleto}</span>
          {esPropia && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Tu cuenta</span>}
          {cuenta.bloqueado && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
              {cuenta.es_permanente ? 'Bloqueo definitivo' : 'Bloqueo temporal'}
            </span>
          )}
        </div>
        {cuenta.email && <p className="mt-0.5 break-all text-xs text-gray-400">{cuenta.email}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          {rol ? (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-primary-700">{rol.codigo}</span>
          ) : (
            <span className="text-gray-400">Sin rol</span>
          )}
          <span>{textoDeAlcance(rol)}</span>
          <span className="font-mono">CI {cuenta.ci}</span>
        </p>
      </div>

      {acciones.length > 0 && <MenuAcciones etiqueta={`Acciones para ${nombreCompleto}`} acciones={acciones} />}
    </li>
  );
}
