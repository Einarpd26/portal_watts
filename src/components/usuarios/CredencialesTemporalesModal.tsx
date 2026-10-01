import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import type { CredencialesTemporales } from '@/hooks/useGestionUsuarios';

interface CredencialesTemporalesModalProps {
  credenciales: CredencialesTemporales | null;
  onClose: () => void;
}

function CopyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el valor sigue visible para copiarlo a mano
    }
  };

  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="flex items-center gap-2 rounded-input border border-gray-200 bg-gray-50 px-3 py-2">
        <span className={`min-w-0 flex-1 select-all break-all text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="flex-shrink-0 text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

export default function CredencialesTemporalesModal({ credenciales, onClose }: CredencialesTemporalesModalProps) {
  if (!credenciales) return null;

  const expira = new Date(credenciales.expiresAt).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Sin cierre por click afuera: la contraseña no se vuelve a mostrar */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credenciales-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <h3 id="credenciales-title" className="mb-1 text-lg font-bold text-gray-900">
          Acceso creado
        </h3>
        <p className="mb-5 text-sm text-gray-600">
          Compartí estas credenciales con <strong className="text-gray-900">{credenciales.nombre}</strong>. Deberá
          cambiar la contraseña en su primer inicio de sesión.
        </p>

        <div className="space-y-3">
          <CopyField label="Correo" value={credenciales.email} />
          <CopyField label="Contraseña temporal" value={credenciales.password} mono />
        </div>

        <div className="mt-4 rounded-input border border-primary-200 bg-primary-50 p-3 text-xs text-primary-700">
          Esta contraseña se muestra <strong>una sola vez</strong> y vence el {expira}. Si se pierde o vence, revocá el
          acceso y creá uno nuevo.
        </div>

        <Button variant="primary" size="md" onClick={onClose} className="mt-5 w-full">
          Entendido
        </Button>
      </div>
    </div>
  );
}
