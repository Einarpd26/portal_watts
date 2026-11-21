"use client";

import { cn } from "@/utils/cn";
import { colorDeAvatar, iniciales } from "@/utils/avatar";
import type { PersonaConAsignacion } from "@/types";

interface FilaPersonaProps {
  persona: PersonaConAsignacion;
  onEditar: (persona: PersonaConAsignacion) => void;
}

/** Fila de la lista de personal: avatar, nombre con su etiqueta de cuenta y una línea de detalle; el clic abre la edición */
export default function FilaPersona({ persona: p, onEditar }: FilaPersonaProps) {
  const detalle = [p.asignacion?.sucursal_nombre, p.asignacion?.cargo_nombre, p.telefono].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onEditar(p)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-bold",
          colorDeAvatar(`${p.nombres} ${p.apellidos}`)
        )}
        aria-hidden="true"
      >
        {iniciales(p.nombres, p.apellidos)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {p.apellidos}, {p.nombres}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              p.auth_user_id ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
            )}
          >
            {p.auth_user_id ? "Cuenta vinculada" : "Sin cuenta"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          <span className="font-mono">CI {p.ci}</span>
          {detalle && ` · ${detalle}`}
        </p>
      </div>

      <svg className="h-4 w-4 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
}
