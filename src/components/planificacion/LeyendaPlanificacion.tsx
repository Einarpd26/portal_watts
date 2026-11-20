import { cn } from '@/utils/cn';

// Colores de las rutas en el calendario, igual que ChipVisita
const LEYENDA = [
  { punto: 'bg-gray-100 border-gray-300', etiqueta: 'Planificada' },
  { punto: 'bg-indigo-100 border-indigo-200', etiqueta: 'Impar / par / eventual' },
  { punto: 'bg-amber-100 border-amber-300', etiqueta: 'Duplicada' },
] as const;

/** Leyenda de colores de las rutas del calendario (solo en pantallas anchas) */
export default function LeyendaPlanificacion() {
  return (
    <ul className="hidden items-center gap-3 md:flex" aria-label="Leyenda de colores">
      {LEYENDA.map(({ punto, etiqueta }) => (
        <li key={etiqueta} className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full border', punto)} aria-hidden="true" />
          {etiqueta}
        </li>
      ))}
    </ul>
  );
}
