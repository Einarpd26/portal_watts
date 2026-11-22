"use client";

import { useId } from "react";
import SearchSelect, { type OpcionSelector } from "./SearchSelect";
import { cn } from "@/utils/cn";

interface SelectProps {
  label: string;
  valor: string;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionSelector[];
  error?: string;
  compact?: boolean;
  /** Texto mientras no haya nada elegido (valor ''); si hay una opción con valor '', se muestra esa */
  placeholder?: string;
  /** Con muchas opciones (colaboradores, zonas, supervisores): se puede escribir para filtrar */
  buscable?: boolean;
  /** Botón «×» dentro del control para quitar la elección: solo en filtros opcionales, con el placeholder como «Todos» */
  limpiable?: boolean;
  disabled?: boolean;
}

/** Selector de formulario: rótulo arriba, mensaje de error abajo y el mismo control que el resto del portal */
export default function Select({ label, valor, onCambiar, opciones, error, compact = false, placeholder, buscable, limpiable, disabled }: SelectProps) {
  const id = useId();

  return (
    <div className={cn(compact ? "space-y-0.5" : "space-y-1.5")}>
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <SearchSelect
        etiqueta={label}
        idCampo={id}
        valor={valor}
        onCambiar={onCambiar}
        opciones={opciones}
        placeholder={placeholder}
        conError={Boolean(error)}
        buscable={buscable}
        limpiable={limpiable}
        deshabilitado={disabled}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
