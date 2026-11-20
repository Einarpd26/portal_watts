import { createAdminClient } from '@/lib/supabase/server';
import { rutasEnAlcance } from '@/lib/clientes';
import { todas } from '@/lib/paginar';
import { resumirCompras } from '@/utils/comprasCliente';
import type { AlcanceClientes } from '@/utils/clientesScope';
import type { ComprasCliente } from '@/types';

export type ComprasResultado = { ok: true; data: ComprasCliente } | { ok: false; motivo: 'no_encontrado' | 'error' };

/**
 * Ticket promedio y últimas compras de un cliente (ficha de CU-12). Mira las ventas vigentes de los últimos
 * 6 meses, el mismo período de la clasificación ABC. El cliente debe estar en una ruta del alcance del
 * solicitante: si no, se responde como si no existiera.
 */
export async function comprasDeCliente(
  alcance: Exclude<AlcanceClientes, { tipo: 'denegado' }>,
  idPersona: number,
  idCliente: number
): Promise<ComprasResultado> {
  const db = createAdminClient();
  const [cliente, rutas] = await Promise.all([
    db.from('clientes').select('id_ruta').eq('id', idCliente).maybeSingle(),
    rutasEnAlcance(alcance, idPersona),
  ]);
  if (cliente.error || !rutas) return { ok: false, motivo: 'error' };
  const idRuta = cliente.data?.id_ruta;
  if (idRuta === undefined || !rutas.todas.some((r) => r.id === idRuta)) return { ok: false, motivo: 'no_encontrado' };

  const desde = new Date();
  desde.setMonth(desde.getMonth() - 6);
  const lineas = await todas((inicio, fin) =>
    db
      .from('ventas')
      .select('ntr_venta, fecha_venta, importe_total_producto')
      .eq('id_cliente', idCliente)
      .eq('estado', 'Vigente')
      .gte('fecha_venta', desde.toISOString().slice(0, 10))
      .order('id')
      .range(inicio, fin)
  );
  if (!lineas) return { ok: false, motivo: 'error' };
  return { ok: true, data: resumirCompras(lineas) };
}
