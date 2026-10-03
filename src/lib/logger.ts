/**
 * Logger estructurado para el sistema Portal Watts.
 * Cumple con la directriz de AGENTS.md (prefer structured logger over console.*).
 */
export const logger = {
  error: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      if (context !== undefined) {
        console.error(`[ERROR] ${message}`, context);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  },
  warn: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      if (context !== undefined) {
        console.warn(`[WARN] ${message}`, context);
      } else {
        console.warn(`[WARN] ${message}`);
      }
    }
  },
  info: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      if (context !== undefined) {
        console.info(`[INFO] ${message}`, context);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  },
};
