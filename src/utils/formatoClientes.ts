// Formato de las cifras del mapa de clientes. Sin dependencias de Node ni del navegador.

/** 12345.5 → «Bs 12.346» (boliviano, sin decimales: son montos de ventas acumuladas) */
export const formatearMonto = (monto: number): string => `Bs ${Math.round(monto).toLocaleString('es-BO')}`;

/** 0.8234 → «82 %» */
export const formatearPorcentaje = (fraccion: number): string => `${Math.round(fraccion * 100)} %`;

/** «2026-11-17» → «17/11/2026»; sin fecha: null. Se arma a mano para no depender de la zona horaria */
export function formatearFecha(fecha: string | null): string | null {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}
