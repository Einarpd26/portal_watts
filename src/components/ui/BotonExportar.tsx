"use client";

interface BotonExportarProps {
  /** Dirección de descarga del reporte, con los filtros activos (ver utils/reportes.ts) */
  href: string;
  etiqueta?: string;
}

/** Enlace de descarga del reporte en Excel con los filtros que el usuario tiene en pantalla (ADR-005 D6) */
export default function BotonExportar({ href, etiqueta = 'Exportar a Excel' }: BotonExportarProps) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      {etiqueta}
    </a>
  );
}
