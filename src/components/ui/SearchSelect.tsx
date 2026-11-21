"use client";

import { useMemo } from "react";
import Select, { type ClassNamesConfig, type StylesConfig } from "react-select";
import { cn } from "@/utils/cn";

export interface OpcionSelector {
  valor: string;
  texto: string;
  /** Segunda línea del menú (p. ej. el código de la ruta). No se muestra en el control cerrado. */
  subtitulo?: string;
}

interface SearchSelectProps {
  /** Nombre accesible: el selector no lleva rótulo visible, la opción vacía dice qué es */
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
  opciones: readonly OpcionSelector[];
  /** true: caja de búsqueda dentro del control (listas largas). false: selector común (pocas opciones). */
  buscable?: boolean;
  deshabilitado?: boolean;
  /** Dónde se abre el menú; 'top' para campos al pie de una hoja, para no tapar las acciones */
  ubicacionMenu?: "auto" | "top" | "bottom";
}

type Opcion = { value: string; label: string; subtitulo?: string };

// El menú se dibuja en <body>: así no lo recortan las tarjetas con overflow-hidden ni lo tapan las hojas
// inferiores. Es un valor fijo de capa, no un color ni una medida de diseño, y react-select no lo expone por clase.
const ESTILOS: StylesConfig<Opcion, false> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const CLASES: ClassNamesConfig<Opcion, false> = {
  container: () => "min-w-0 flex-1",
  control: ({ isFocused, isDisabled }) =>
    cn(
      "min-h-10 rounded-lg border bg-white text-sm transition-colors",
      isFocused ? "border-primary-600" : "border-gray-200 hover:border-gray-300",
      isDisabled ? "cursor-not-allowed bg-gray-50" : "cursor-pointer"
    ),
  valueContainer: () => "gap-1 pl-3",
  singleValue: () => "truncate text-gray-900",
  placeholder: () => "text-gray-400",
  input: () => "m-0 p-0 text-gray-900",
  indicatorsContainer: () => "pr-2",
  indicatorSeparator: () => "hidden",
  dropdownIndicator: () => "p-1 text-gray-400",
  menu: () => "mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg",
  menuList: () => "max-h-60 py-1",
  option: ({ isSelected, isFocused }) =>
    cn(
      "cursor-pointer px-3 py-2 text-sm",
      isSelected ? "bg-primary-600 text-white" : isFocused ? "bg-primary-50 text-gray-900" : "text-gray-900"
    ),
  noOptionsMessage: () => "px-3 py-2 text-sm text-gray-500",
};

/**
 * Selector de una línea y sin rótulo para las barras de filtros y las fichas. Con `buscable` se puede escribir para
 * filtrar; sin él se comporta como un selector común, pero con el mismo aspecto y teclado en todo el portal.
 */
export default function SearchSelect({
  etiqueta,
  valor,
  onCambiar,
  opciones,
  buscable = false,
  deshabilitado = false,
  ubicacionMenu = "auto",
}: SearchSelectProps) {
  const lista = useMemo<Opcion[]>(() => opciones.map((o) => ({ value: o.valor, label: o.texto, subtitulo: o.subtitulo })), [opciones]);
  const elegida = lista.find((o) => o.value === valor) ?? null;

  return (
    <Select<Opcion, false>
      unstyled
      aria-label={etiqueta}
      options={lista}
      value={elegida}
      onChange={(o) => {
        if (o) onCambiar(o.value);
      }}
      isSearchable={buscable}
      isDisabled={deshabilitado}
      menuPlacement={ubicacionMenu}
      menuPortalTarget={typeof document === "undefined" ? null : document.body}
      menuPosition="fixed"
      classNames={CLASES}
      styles={ESTILOS}
      noOptionsMessage={() => "Sin resultados"}
      formatOptionLabel={(o, { context }) =>
        context === "menu" && o.subtitulo ? (
          <div>
            <p>{o.label}</p>
            <p className="text-xs opacity-70">{o.subtitulo}</p>
          </div>
        ) : (
          o.label
        )
      }
    />
  );
}
