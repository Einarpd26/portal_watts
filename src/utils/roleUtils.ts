/**
 * Normaliza la relación `usuario_roles` a un array homogéneo,
 * resolviendo si Supabase devuelve un array, un objeto único o null/undefined.
 * Evita la duplicación de lógica (DRY) según AGENTS.md.
 */
export function normalizeRolesArray<T>(usuarioRoles: T[] | T | null | undefined): T[] {
  if (Array.isArray(usuarioRoles)) {
    return usuarioRoles;
  }
  if (usuarioRoles != null) {
    return [usuarioRoles];
  }
  return [];
}
