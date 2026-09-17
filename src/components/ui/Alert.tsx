import type { ReactNode } from "react";

// Contrato visual: docs/diseno/tokens-de-marca.md §6 — Alert
type AlertState = "success" | "error" | "info" | "warning";

const STATE_CLASSES: Record<AlertState, string> = {
  success: "bg-success-50 border-success-200 text-success-800",
  error: "bg-error-50 border-error-200 text-error-800",
  info: "bg-primary-50 border-primary-200 text-primary-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
};

type AlertProps = {
  state?: AlertState;
  title?: string;
  children: ReactNode;
  onClose?: () => void;
};

export default function Alert({
  state = "info",
  title,
  children,
  onClose,
}: AlertProps) {
  return (
    <div
      role={state === "error" ? "alert" : "status"}
      className={`w-full rounded-xl border-[1.5px] p-4 ${STATE_CLASSES[state]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          {title && <p className="font-semibold">{title}</p>}
          <p className="text-sm">{children}</p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar aviso"
            className="shrink-0 -m-1 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}