"use client";

export type VistaMovil = 'mapa' | 'lista';

interface BotonAlternarVistaProps {
  /** Lo que se está viendo ahora: el botón ofrece pasar a lo otro */
  vista: VistaMovil;
  onAlternar: () => void;
  /** Nombre accesible de «ver la lista» (p. ej. «Ver la lista de clientes») */
  etiquetaLista: string;
}

/** Botón de la barra superior del celular que alterna entre el mapa y la lista */
export function BotonAlternarVista({ vista, onAlternar, etiquetaLista }: BotonAlternarVistaProps) {
  const enMapa = vista === 'mapa';
  return (
    <button
      type="button"
      onClick={onAlternar}
      aria-label={enMapa ? etiquetaLista : 'Ver el mapa'}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        {enMapa ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m0-8.25L6 9m3-2.25 3 2.25M3 17.25V6.75L9 3l6 3.75L21 3v10.5l-6 3.75-6-3.75Z" />
        )}
      </svg>
      {enMapa ? 'Lista' : 'Mapa'}
    </button>
  );
}
