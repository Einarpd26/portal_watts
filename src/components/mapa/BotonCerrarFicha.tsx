"use client";

interface BotonCerrarFichaProps {
  onClick: () => void;
}

/** La «X» que cierra la ficha de un cliente o de una ruta */
export function BotonCerrarFicha({ onClick }: BotonCerrarFichaProps) {
  return (
    <button type="button" onClick={onClick} aria-label="Cerrar la ficha" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
