"use client";

import { cn } from '@/utils/cn';
import { IconoEditar } from './iconos';

interface BotonModoEdicionProps {
  editMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** Botón «Modo Edición» de la planificación; la página le asocia la tecla E (useAtajoTecla) */
export default function BotonModoEdicion({ editMode, onToggle, disabled = false }: BotonModoEdicionProps) {
  return (
    <button
      type="button"
      aria-pressed={editMode}
      aria-keyshortcuts="E"
      title="Modo edición (tecla E)"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        editMode
          ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <IconoEditar className="h-3.5 w-3.5" />
      Modo Edición
      <kbd
        className={cn(
          'hidden rounded border px-1 text-[10px] font-semibold leading-4 md:inline-block',
          editMode ? 'border-white/50 text-white' : 'border-gray-300 text-gray-500'
        )}
      >
        E
      </kbd>
    </button>
  );
}
