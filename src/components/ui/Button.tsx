import type { ButtonHTMLAttributes, ReactNode } from "react";

// Contrato visual: docs/diseno/tokens-de-marca.md §6 — Button
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost-white";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white shadow-brand hover:bg-primary-700 hover:-translate-y-px",
  secondary: "bg-white text-gray-800 border border-gray-200 hover:bg-gray-50",
  danger: "bg-primary-50 text-primary-600 border border-primary-200 hover:bg-primary-100",
  "ghost-white": "bg-white/10 text-white border border-white/30 hover:bg-white/20",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-base w-full min-h-[3.25rem]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 font-bold rounded-btn transition-[background,transform,box-shadow] duration-150",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        (isLoading || disabled) && "opacity-50 cursor-not-allowed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
        </svg>
      )}
      {isLoading ? "Cargando..." : children}
    </button>
  );
}