/**
 * Utilidad liviana para combinar clases condicionales de Tailwind CSS.
 * Cumple con la directriz de estilo del proyecto (AGENTS.md).
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
