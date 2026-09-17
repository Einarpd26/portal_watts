import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";

// Contrato visual: docs/diseno/tokens-de-marca.md §6 — Input
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Muestra el toggle de visibilidad (para type="password") */
  showPasswordToggle?: boolean;
  /** Variante compacta del label (text-[10px]) */
  compact?: boolean;
};

export default function Input({
  label,
  error,
  showPasswordToggle = false,
  compact = false,
  type = "text",
  className = "",
  ...rest
}: InputProps) {
  const inputId = useId();
  const [visible, setVisible] = useState(false);
  const resolvedType = showPasswordToggle && visible ? "text" : type;

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`block mb-1 font-semibold uppercase tracking-[0.08em] text-gray-500 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          className={[
            "w-full rounded-input border-[1.5px] px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none transition-[border-color,box-shadow] duration-150",
            error
              ? "border-error-500 focus:border-error-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.15)]"
              : "border-gray-200 focus:border-primary-600 focus:shadow-[0_0_0_3px_rgba(220,38,38,.15)]",
            showPasswordToggle && "pr-10",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />

        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {visible ? (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 2.9M6.6 6.6A13.6 13.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" strokeLinecap="round" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-error-500">{error}</p>}
    </div>
  );
}