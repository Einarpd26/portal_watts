import { createAdminClient } from '@/lib/supabase/server';
import { contornosDeZonas, listarRutas } from '@/lib/rutas';
import { rutasEnAlcance } from '@/lib/clientes';
import { todas } from '@/lib/paginar';
import { primero } from '@/utils/postgrest';
import type { AlcanceClientes } from '@/utils/clientesScope';
import type { DiaKey } from '@/utils/diasSemana';
import type { ConsultaPlanificacion, Frecuencia, RutaConsulta, SlotConsulta, VisitaPlanificada } from '@/types';

export type ConsultaResultado = { ok: true; data: ConsultaPlanificacion } | { ok: false };

type Persona = { nombres: string; apellidos: string } | null;
const nombreCompleto = (p: Persona) => (p ? `${p.apellidos}, ${p.nombres}` : null);

/**
 * Planificación vigente de las rutas del alcance (CU-10): rutas con su zona, sucursal y supervisor, los slots
 * que las visitan con su vendedor y todas las visitas. Incluye los slots de supervisores que ya no tienen la zona:
 * la planificación se conserva hasta el reemplazo (ADR-003 D6) y quien consulta debe poder verla.
 */
export async function consultaDePlanificacion(
  alcance: Exclude<AlcanceClientes, { tipo: 'denegado' }>,
  idPersona: number
): Promise<ConsultaResultado> {
  const enAlcance = await rutasEnAlcance(alcance, idPersona);
  if (!enAlcance) return { ok: false };
  const idsRuta = enAlcance.todas.map((r) => r.id);
  const idsZona = [...new Set(enAlcance.todas.map((r) => r.id_zona))];
  if (idsRuta.length === 0) return { ok: true, data: { rutas: [], contornos: [], slots: [], visitas: [] } };

  const db = createAdminClient();
  const [poligonos, contornos, zonasRes, supervisoresRes, filas] = await Promise.all([
    listarRutas(idsZona),
    contornosDeZonas([...new Set(enAlcance.enZonaCompleta.map((r) => r.id_zona))], false),
    db.from('zonas').select('id, codigo_zona, id_sucursal, sucursales ( nombre_sucursal )').in('id', idsZona),
    db
      .from('supervisor_zonas')
      .select('id_zona, id_supervisor, personas!supervisor_zonas_id_supervisor_fkey ( nombres, apellidos )')
      .in('id_zona', idsZona),
    todas((desde, hasta) =>
      db
        .from('planificacion_rutas')
        .select(
          'id, id_vendedor_slot, id_ruta, dia_semana, frecuencia, rutas!inner ( codigo_ruta, ruta ), ' +
            'vendedor_slots!inner ( id, nombre, orden, id_supervisor, id_vendedor )'
        )
        .in('id_ruta', idsRuta)
        .order('id')
        .range(desde, hasta)
    ),
  ]);
  if (!poligonos.ok || !contornos.ok || zonasRes.error || supervisoresRes.error || !filas) return { ok: false };

  // Nombres de los vendedores y de los supervisores de los slots (que pueden no ser los actuales de la zona)
  const slotsCrudos = new Map<number, { id: number; nombre: string | null; orden: number; id_supervisor: number; id_vendedor: number | null }>();
  for (const f of filas as unknown as Array<{ vendedor_slots: unknown }>) {
    const slot = primero(f.vendedor_slots as never) as { id: number; nombre: string | null; orden: number; id_supervisor: number; id_vendedor: number | null } | null;
    if (slot) slotsCrudos.set(slot.id, slot);
  }
  const idsPersona = [...new Set([...slotsCrudos.values()].flatMap((s) => [s.id_supervisor, ...(s.id_vendedor === null ? [] : [s.id_vendedor])]))];
  const personas = idsPersona.length > 0 ? await db.from('personas').select('id, nombres, apellidos').in('id', idsPersona) : { data: [], error: null };
  if (personas.error) return { ok: false };
  const nombreDe = new Map((personas.data ?? []).map((p) => [p.id, `${p.apellidos}, ${p.nombres}`]));

  const zonaDe = new Map(
    (zonasRes.data ?? []).map((z) => [z.id, { codigo: z.codigo_zona, idSucursal: z.id_sucursal, sucursal: primero(z.sucursales)?.nombre_sucursal ?? '' }])
  );
  const supervisorDe = new Map(
    (supervisoresRes.data ?? []).map((s) => [s.id_zona, { id: s.id_supervisor, nombre: nombreCompleto(primero(s.personas)) }])
  );

  const idsEnAlcance = new Set(idsRuta);
  const rutas: RutaConsulta[] = poligonos.data
    .filter((r) => idsEnAlcance.has(r.id))
    .map((r) => {
      const zona = zonaDe.get(r.id_zona);
      const supervisor = supervisorDe.get(r.id_zona);
      return {
        ...r,
        codigo_zona: zona?.codigo ?? '',
        id_sucursal: zona?.idSucursal ?? 0,
        sucursal_nombre: zona?.sucursal ?? '',
        id_supervisor: supervisor?.id ?? null,
        supervisor_nombre: supervisor?.nombre ?? null,
      };
    });

  const slots: SlotConsulta[] = [...slotsCrudos.values()]
    .map((s) => ({
      id: s.id,
      nombre: s.nombre,
      orden: s.orden,
      id_vendedor: s.id_vendedor,
      vendedor_nombre: s.id_vendedor === null ? null : (nombreDe.get(s.id_vendedor) ?? null),
      id_supervisor: s.id_supervisor,
      supervisor_nombre: nombreDe.get(s.id_supervisor) ?? null,
    }))
    .sort((a, b) => a.id_supervisor - b.id_supervisor || a.orden - b.orden);

  const visitas: VisitaPlanificada[] = (filas as unknown as Array<{
    id: number;
    id_vendedor_slot: number;
    id_ruta: number;
    dia_semana: string;
    frecuencia: string;
    rutas: { codigo_ruta: string; ruta: string } | { codigo_ruta: string; ruta: string }[];
  }>).flatMap((f) => {
    const ruta = primero(f.rutas);
    return ruta
      ? [{ id: f.id, id_slot: f.id_vendedor_slot, id_ruta: f.id_ruta, codigo_ruta: ruta.codigo_ruta, ruta: ruta.ruta, dia: f.dia_semana as DiaKey, frecuencia: f.frecuencia as Frecuencia }]
      : [];
  });

  return { ok: true, data: { rutas, contornos: contornos.data, slots, visitas } };
}
