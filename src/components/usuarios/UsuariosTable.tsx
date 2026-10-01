import React from 'react';
import Button from '@/components/ui/Button';
import type { UsuarioActivo } from '@/types';

interface UsuariosTableProps {
  users: UsuarioActivo[];
  isLoading: boolean;
  onRevoke: (user: UsuarioActivo) => void;
  callerAlcanceTipo: 'GLOBAL' | 'SUCURSAL';
  callerIdSucursal: number | null;
}

function RolBadge({ codigo }: { codigo: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-primary-700">
      {codigo}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded" />
        </td>
      ))}
    </tr>
  );
}

export default function UsuariosTable({
  users,
  isLoading,
  onRevoke,
  callerAlcanceTipo,
  callerIdSucursal,
}: UsuariosTableProps) {
  const canRevokeUser = (user: UsuarioActivo): boolean => {
    if (callerAlcanceTipo === 'GLOBAL') return true;
    if (callerIdSucursal === null) return false;
    return user.roles.some((r) => r.id_sucursal === callerIdSucursal);
  };

  return (
    <div className="bg-white rounded-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Cuentas Activas</h2>
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
          {users.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Colaborador
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                CI
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rol
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Alcance
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm">No hay cuentas activas</span>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const primaryRole = user.roles[0];
                const canRevoke = canRevokeUser(user);

                return (
                  <tr
                    key={user.id_persona}
                    className="hover:bg-gray-50/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {user.apellidos} {user.nombres}
                      </div>
                      {user.email && (
                        <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {user.ci}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {primaryRole ? (
                        <RolBadge codigo={primaryRole.codigo} />
                      ) : (
                        <span className="text-gray-400 text-xs">Sin rol</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {primaryRole?.alcance_tipo === 'GLOBAL'
                        ? 'Global'
                        : primaryRole?.id_sucursal
                        ? `Sucursal #${primaryRole.id_sucursal}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canRevoke && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onRevoke(user)}
                        >
                          Revocar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
