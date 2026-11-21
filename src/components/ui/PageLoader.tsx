"use client";

import { cn } from "@/utils/cn";

/** Rueda giratoria de la marca; hereda el tamaño de `className` */
export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={cn("animate-spin text-primary-600", className)} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

interface PageLoaderProps {
  /** Tamaño del área; por defecto una franja de 16 rem. Para llenar la pantalla: `min-h-screen`; para llenar un hueco: `flex-1` */
  className?: string;
}

/** El único estado de carga del portal: rueda con «Cargando...», centrados en el área que ocupará el contenido */
export default function PageLoader({ className }: PageLoaderProps) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-3", className ?? "h-64")}>
      <Spinner />
      <p className="text-sm text-gray-500">Cargando...</p>
    </div>
  );
}
