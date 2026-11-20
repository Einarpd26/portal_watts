import { createAdminClient } from '@/lib/supabase/server';
import { contornosDeZonas, listarRutas } from '@/lib/rutas';
import { rutasEnAlcance } from '@/lib/clientes';
import { todas } from '@/lib/paginar';
import { primero } from '@/utils/postgrest';
import type { AlcanceClientes } from '@/utils/clientesScope';
import type { CoberturaListado, RutaCobertura } from '@/types';

export type CoberturaResultado = { ok: true; data: CoberturaListado } | { ok: false };

type Persona = { nombres: string; apellidos: string } | null;
const nombreCompleto = (p: Persona) => (p ? `${p.apellidos}, ${p.nombres}` : null);

/** Código de cada zona y su supervisor actual (una zona tiene a lo sumo uno) */
async function zonasConSupervisor(idsZona: number[]) {
  const db = createAdminClient();
  const [zonas, supervisores] = await Promise.all([
    db.from('zonas').select('id, codigo_zona').in('id', idsZona),
    db.from('supervisor_zonas').select('id_zona, id_supervisor, personas!supervisor_zonas_id_supervisor_fkey ( nombres, apellidos )').in('id_zona', idsZona),
  ]);
  if (zonas.error || supervisores.error) return null;
  return {
    codigoDe: new Map((zonas.data ?? []).map((z) => [z.id, z.codigo_zona])),
    supervisorDe: new Map(
      (supervisores.data ?? []).map((s) => [s.id_zona, { id: s.id_supervisor, nombre: nombreCompleto(primero(s.personas)) }])
    ),
  };
}

/**
 * Cobertura de las rutas del alcance (CU-13, RN-08): clientes habilitados atendidos en el mes en curso, según
 * la vista materializada que se recalcula cada noche, con el momento del último recálculo.
 */
export async function coberturaDeAlcance(
  alcance: Exclude<AlcanceClientes, { tipo: 'denegado' }>,
  idPersona: number
): Promise<CoberturaResultado> {
  const enAlcance = await rutasEnAlcance(alcance, idPersona);
  if (!enAlcance) return { ok: false };
  const idsRuta = enAlcance.todas.map((r) => r.id);
  const idsZona = [...new Set(enAlcance.todas.map((r) => r.id_zona))];
  if (idsRuta.length === 0) return { ok: true, data: { rutas: [], contornos: [], mes: null, calculado_en: null } };

  const db = createAdminClient();
  const [filas, poligonos, contornos, zonas] = await Promise.all([
    todas((desde, hasta) =>
      db
        .from('cobertura_rutas')
        .select('id_ruta, clientes_habilitados, clientes_atendidos, porcentaje, mes, calculado_en')
        .in('id_ruta', idsRuta)
        .order('id_ruta')
        .range(desde, hasta)
    ),
    listarRutas(idsZona),
    contornosDeZonas([...new Set(enAlcance.enZonaCompleta.map((r) => r.id_zona))], false),
    zonasConSupervisor(idsZona),
  ]);
  if (!filas || !poligonos.ok || !contornos.ok || !zonas) return { ok: false };

  const coberturaDe = new Map(filas.map((f) => [f.id_ruta, f]));
  const rutas: RutaCobertura[] = poligonos.data.flatMap((r) => {
    const c = coberturaDe.get(r.id);
    if (!c) return [];
    const supervisor = zonas.supervisorDe.get(r.id_zona);
    return [
      {
        id: r.id,
        codigo_ruta: r.codigo_ruta,
        ruta: r.ruta,
        id_zona: r.id_zona,
        codigo_zona: zonas.codigoDe.get(r.id_zona) ?? '',
        id_supervisor: supervisor?.id ?? null,
        supervisor_nombre: supervisor?.nombre ?? null,
        clientes_habilitados: c.clientes_habilitados ?? 0,
        clientes_atendidos: c.clientes_atendidos ?? 0,
        porcentaje: Number(c.porcentaje ?? 0),
        geojson: r.geojson,
      },
    ];
  });

  // Todas las filas se calcularon en el mismo recálculo: el momento del más reciente basta
  const calculado = filas.map((f) => f.calculado_en).filter((v): v is string => !!v).sort().at(-1) ?? null;
  return { ok: true, data: { rutas, contornos: contornos.data, mes: filas[0]?.mes ?? null, calculado_en: calculado } };
}
