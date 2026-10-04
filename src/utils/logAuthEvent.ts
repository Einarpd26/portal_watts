import { logger } from "@/lib/logger";

export interface LogAuthEventParams {
  accion: "CIERRE_SESION" | "RECUPERACION_PASSWORD" | "LOGIN_RECHAZADO";
  razon?: string;
  detalles?: Record<string, unknown>;
}

export interface LogAuthEventResponse {
  success?: boolean;
  error?: string;
}

/**
 * Función reutilizable para registrar eventos de autenticación y auditoría en bitácora.
 * Evita la duplicación de llamadas a fetch("/api/auth/log-event") y centraliza el manejo de errores.
 */
export async function logAuthEvent(params: LogAuthEventParams): Promise<LogAuthEventResponse | null> {
  try {
    const res = await fetch("/api/auth/log-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      return (await res.json()) as LogAuthEventResponse;
    }
    return null;
  } catch (err: unknown) {
    logger.error("Error registrando evento de autenticación en bitácora:", err);
    return null;
  }
}
