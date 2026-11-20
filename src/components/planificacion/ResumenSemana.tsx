import { cn } from '@/utils/cn';
import type { ResumenPlanificacion } from '@/utils/planificacionResumen';

interface ResumenSemanaProps {
  semana: number;
  resumen: ResumenPlanificacion;
}

const Separador = () => <div className="hidden h-4 w-px self-center bg-gray-200 sm:block" />;

function Metrica({ etiqueta, valor, alerta = false }: { etiqueta: string; valor: number; alerta?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className="text-gray-400">{etiqueta}</span>
      <span className={cn('font-semibold', alerta ? 'text-amber-700' : 'text-gray-900')}>{valor}</span>
    </div>
  );
}

/** Pie de la planificación: la semana en curso y los totales de lo planificado */
export default function ResumenSemana({ semana, resumen }: ResumenSemanaProps) {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="self-center text-xs font-semibold uppercase tracking-wider text-gray-400">
        Semana {semana} · {semana % 2 === 0 ? 'par' : 'impar'}
      </span>
      <Separador />
      <Metrica etiqueta="Slots" valor={resumen.slots} />
      <Separador />
      <Metrica etiqueta="Rutas planificadas" valor={resumen.rutasPlanificadas} />
      <Separador />
      <Metrica etiqueta="Duplicadas" valor={resumen.rutasDuplicadas} alerta={resumen.rutasDuplicadas > 0} />
      <Separador />
      <Metrica etiqueta="Slots sin rutas" valor={resumen.slotsSinRutas} alerta={resumen.slotsSinRutas > 0} />
    </div>
  );
}
