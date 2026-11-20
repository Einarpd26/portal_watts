import type { ComprasCliente } from '@/types';

/** Una fila de la tabla ventas: una línea (producto) dentro de una venta */
export interface LineaDeVenta {
  ntr_venta: number;
  fecha_venta: string;
  importe_total_producto: number | null;
}

/** Cuántas compras recientes se muestran en la ficha del cliente */
export const ULTIMAS_COMPRAS = 5;

/**
 * Agrupa las líneas vigentes por venta: el total y la cantidad de productos de cada compra. El ticket promedio
 * es lo que el cliente gasta por compra en el período de las líneas recibidas, y las últimas compras van de la
 * más reciente a la más antigua (ADR-005).
 */
export function resumirCompras(lineas: LineaDeVenta[], limite = ULTIMAS_COMPRAS): ComprasCliente {
  const porVenta = new Map<number, { fecha_venta: string; total: number; productos: number }>();
  for (const l of lineas) {
    const venta = porVenta.get(l.ntr_venta) ?? { fecha_venta: l.fecha_venta, total: 0, productos: 0 };
    venta.total += Number(l.importe_total_producto ?? 0);
    venta.productos += 1;
    porVenta.set(l.ntr_venta, venta);
  }

  const compras = [...porVenta.entries()]
    .map(([ntr_venta, v]) => ({ ntr_venta, fecha_venta: v.fecha_venta, total: Math.round(v.total * 100) / 100, productos: v.productos }))
    .sort((a, b) => b.fecha_venta.localeCompare(a.fecha_venta) || b.ntr_venta - a.ntr_venta);

  const suma = compras.reduce((acumulado, c) => acumulado + c.total, 0);
  return {
    ticket_promedio: compras.length > 0 ? Math.round((suma / compras.length) * 100) / 100 : null,
    compras: compras.slice(0, limite),
  };
}
