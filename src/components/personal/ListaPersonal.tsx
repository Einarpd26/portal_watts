"use client";

import FilaPersona from "./FilaPersona";
import Button from "@/components/ui/Button";
import type { PersonaConAsignacion } from "@/types";

interface ListaPersonalProps {
  personas: readonly PersonaConAsignacion[];
  /** Hay búsqueda o filtros puestos: el vacío significa «sin resultados», no «todavía no hay nadie» */
  hayFiltros: boolean;
  onEditar: (persona: PersonaConAsignacion) => void;
  onCrear: () => void;
}

/** Lista de personal en filas; sin personas, un estado vacío que dice qué hacer */
export default function ListaPersonal({ personas, hayFiltros, onEditar, onCrear }: ListaPersonalProps) {
  if (personas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{hayFiltros ? "Sin resultados" : "Todavía no hay colaboradores"}</p>
          <p className="mt-0.5 text-xs text-gray-400">{hayFiltros ? "Probá ajustando la búsqueda o los filtros" : "Empezá registrando al primero"}</p>
        </div>
        {!hayFiltros && <Button onClick={onCrear}>Nueva persona</Button>}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 bg-white">
      {personas.map((p) => (
        <FilaPersona key={p.id} persona={p} onEditar={onEditar} />
      ))}
    </div>
  );
}
