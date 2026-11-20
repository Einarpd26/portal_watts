"use client";

interface BotonPantallaCompletaProps {
  activa: boolean;
  onClick: () => void;
}

/** Botón de pantalla completa del mapa, abajo a la derecha */
export function BotonPantallaCompleta({ activa, onClick }: BotonPantallaCompletaProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={activa ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
      className="absolute bottom-8 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:text-gray-800"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {activa ? (
          <>
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </>
        ) : (
          <>
            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
            <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          </>
        )}
      </svg>
    </button>
  );
}
