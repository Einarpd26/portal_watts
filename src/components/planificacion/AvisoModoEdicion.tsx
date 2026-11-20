import { IconoAlerta } from './iconos';

/** Aviso mientras el modo edición está activo en el calendario: los cambios se guardan al instante */
export default function AvisoModoEdicion() {
  return (
    <div role="status" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
      <IconoAlerta className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium">Modo edición activo</span>
      <span className="hidden sm:inline">· cada cambio se guarda al instante</span>
    </div>
  );
}
