"use client";

interface CampoBusquedaProps {
  valor: string;
  onCambiar: (valor: string) => void;
  placeholder: string;
  /** Nombre accesible: el campo no lleva rótulo visible */
  etiqueta: string;
}

/** Campo de búsqueda de una línea, sin rótulo, con lupa y botón para borrar; para las listas de las pantallas con mapa */
export default function CampoBusqueda({ valor, onCambiar, placeholder, etiqueta }: CampoBusquedaProps) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        type="text"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta}
        className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-8 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-600 focus:bg-white"
      />
      {valor && (
        <button type="button" onClick={() => onCambiar('')} aria-label="Borrar la búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600">
          <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
