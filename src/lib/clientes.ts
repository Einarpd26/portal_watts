import { createAdminClient } from '@/lib/supabase/server';
import { contornosDeZonas, listarRutas } from '@/lib/rutas';
import { todas } from '@/lib/paginar';
import { primero } from '@/utils/postgrest';
import type { AlcanceClientes } from '@/utils/clientesScope';
import type { ClaseAbc, ClienteMapa, MapaClientes } from '@/types';

export type ClientesResultado = { ok: true; data: MapaClientes } | { ok: false };

export interface RutaDeAlcance {
  id: number;
  id_zona: number;
}

const unicas = (rutas: RutaDeAlcance[]) => [...new Map(rutas.map((r) => [r.id, r])).values()];


async function rutasDeSucursales(idsSucursal: number[]): Promise<RutaDeAlcance[] | null> {
  const { data, error } = await createAdminClient()
    .from('rutas')
    .select('id, id_zona, zonas!inner ( id_sucursal )')
    .in('zonas.id_sucursal', idsSucursal);
  return error ? null : (data ?? []).map((r) => ({ id: r.id, id_zona: r.id_zona }));
}

async function rutasDeTodas(): Promise<RutaDeAlcance[] | null> {
  const filas = await todas((desde, hasta) => createAdminClient().from('rutas').select('id, id_zona').order('id').range(desde, hasta));
  return filas && filas.map((r) => ({ id: r.id, id_zona: r.id_zona }));
}

async function rutasDeSupervisor(idSupervisor: number): Promise<RutaDeAlcance[] | null> {
  const { data, error } = await createAdminClient().from('supervisor_zonas').select('id_zona').eq('id_supervisor', idSupervisor);
  if (error) return null;
  const idsZona = (data ?? []).map((z) => z.id_zona);
  if (idsZona.length === 0) return [];
  const rutas = await createAdminClient().from('rutas').select('id, id_zona').in('id_zona', idsZona);
  return rutas.error ? null : (rutas.data ?? []);
}

/** Rutas en las que el vendedor es titular: las de la planificación de su slot (ADR-005 D4) */
async function rutasDeVendedor(idVendedor: number): Promise<RutaDeAlcance[] | null> {
  const { data, error } = await createAdminClient()
    .from('planificacion_rutas')
    .select('rutas!inner ( id, id_zona ), vendedor_slots!inner ( id_vendedor )')
    .eq('vendedor_slots.id_vendedor', idVendedor);
  if (error) return null;
  return (data ?? []).flatMap((v) => {
    const ruta = primero(v.rutas);
    return ruta ? [{ id: ruta.id, id_zona: ruta.id_zona }] : [];
  });
}

/**
 * Rutas que el alcance permite ver. `enZonaCompleta` son las de quien ve zonas enteras (todo, sucursal o
 * supervisión): solo de ellas se dibuja el contorno de zona. Las rutas de un vendedor se ven solas.
 */
export async function rutasEnAlcance(
  alcance: Exclude<AlcanceClientes, { tipo: 'denegado' }>,
  idPersona: number
): Promise<{ todas: RutaDeAlcance[]; enZonaCompleta: RutaDeAlcance[] } | null> {
  if (alcance.tipo === 'global') {
    const rutas = await rutasDeTodas();
    return rutas && { todas: rutas, enZonaCompleta: rutas };
  }
  const [sucursales, supervisor, vendedor] = await Promise.all([
    alcance.sucursales.length > 0 ? rutasDeSucursales(alcance.sucursales) : [],
    alcance.comoSupervisor ? rutasDeSupervisor(idPersona) : [],
    alcance.comoVendedor ? rutasDeVendedor(idPersona) : [],
  ]);
  if (!sucursales || !supervisor || !vendedor) return null;
  const enZonaCompleta = unicas([...sucursales, ...supervisor]);
  return { todas: unicas([...enZonaCompleta, ...vendedor]), enZonaCompleta };
}

/** Clientes de las rutas indicadas con su clase del Pareto por ruta (vista clientes_abc, ADR-005 D2) */
async function clientesDeRutas(idsRuta: number[]): Promise<ClienteMapa[] | null> {
  if (idsRuta.length === 0) return [];
  const db = createAdminClient();
  const [clientes, clases] = await Promise.all([
    todas((desde, hasta) =>
      db
        .from('clientes')
        .select('id, codigo_cliente, nombre_completo, nombre_comercial, direccion, referencia, rubro, telefono, latitud, longitud, id_ruta')
        .in('id_ruta', idsRuta)
        .order('id')
        .range(desde, hasta)
    ),
    todas((desde, hasta) =>
      db
        .from('clientes_abc')
        .select('id_cliente, total_ventas, porcentaje_acumulado, ultima_compra, clasificacion')
        .in('id_ruta', idsRuta)
        .order('id_cliente')
        .range(desde, hasta)
    ),
  ]);
  if (!clientes || !clases) return null;

  const claseDe = new Map(clases.map((c) => [c.id_cliente, c]));
  return clientes.map((c) => {
    const abc = claseDe.get(c.id);
    return {
      ...c,
      clasificacion: (abc?.clasificacion as ClaseAbc | null | undefined) ?? null,
      total_ventas: abc?.total_ventas ?? 0,
      porcentaje_acumulado: abc?.porcentaje_acumulado ?? 0,
      ultima_compra: abc?.ultima_compra ?? null,
    };
  });
}

/** Mapa de clientes del solicitante (CU-12): rutas, contornos y clientes que su alcance permite ver */
export async function mapaDeClientes(
  alcance: Exclude<AlcanceClientes, { tipo: 'denegado' }>,
  idPersona: number
): Promise<ClientesResultado> {
  const rutas = await rutasEnAlcance(alcance, idPersona);
  if (!rutas) return { ok: false };

  const idsRuta = new Set(rutas.todas.map((r) => r.id));
  const idsZona = [...new Set(rutas.todas.map((r) => r.id_zona))];
  const idsZonaContorno = [...new Set(rutas.enZonaCompleta.map((r) => r.id_zona))];

  const [poligonos, contornos, clientes] = await Promise.all([
    listarRutas(idsZona),
    contornosDeZonas(idsZonaContorno, false),
    clientesDeRutas([...idsRuta]),
  ]);
  if (!poligonos.ok || !contornos.ok || !clientes) return { ok: false };

  // listarRutas devuelve las zonas completas: se conservan solo las rutas del alcance
  return { ok: true, data: { rutas: poligonos.data.filter((r) => idsRuta.has(r.id)), contornos: contornos.data, clientes } };
}
