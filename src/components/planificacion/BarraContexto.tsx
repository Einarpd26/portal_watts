import { IconoUsuario } from './iconos';

interface BarraContextoProps {
  nombre: string;
  /** Vendedores del equipo que todavía no tienen slot */
  sinSlot: number;
}

/** Quién planifica y cuántos vendedores de su equipo faltan por ubicar en un slot */
export default function BarraContexto({ nombre, sinSlot }: BarraContextoProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <IconoUsuario className="h-4 w-4 shrink-0 text-gray-400" />
        <span className="text-sm font-semibold text-gray-800">{nombre}</span>
      </div>
      <div className="hidden h-4 w-px shrink-0 self-center bg-gray-200 sm:block" />
      <span className="text-xs text-gray-500">
        {sinSlot === 0
          ? 'Todos los vendedores de tu equipo tienen slot'
          : `${sinSlot} ${sinSlot === 1 ? 'vendedor de tu equipo no tiene' : 'vendedores de tu equipo no tienen'} slot`}
      </span>
    </div>
  );
}
