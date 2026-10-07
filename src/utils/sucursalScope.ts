// Alcance territorial (ADR-001 §E, CU-02 A2): un solicitante con alcance SUCURSAL solo
// administra a las personas de su propia sede; GLOBAL no tiene restricción.
export interface AlcanceSolicitante {
  alcance_tipo: string;
  id_sucursal: number | null;
}

/**
 * ¿Puede el solicitante administrar a una persona cuyos roles pertenecen a estas sucursales?
 * Un alcance SUCURSAL sin sucursal asignada no puede acotarse, así que se deniega.
 */
export function enAlcanceDeSucursal(
  solicitante: AlcanceSolicitante,
  sucursalesDeLaPersona: Array<number | null>
): boolean {
  if (solicitante.alcance_tipo !== 'SUCURSAL') return true;
  if (solicitante.id_sucursal === null) return false;
  return sucursalesDeLaPersona.some((id) => id === solicitante.id_sucursal);
}
