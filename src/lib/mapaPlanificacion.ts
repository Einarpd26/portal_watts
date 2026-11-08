import { createAdminClient } from '@/lib/supabase/server';
import { contornosDeZonas, listarRutas } from '@/lib/rutas';
import { primero } from '@/utils/postgrest';
import type { MapaPlanificacion } from '@/types';

export type MapaResultado = { ok: true; data: MapaPlanificacion } | { ok: false };

/** Rutas y contornos de las zonas indicadas, con la geometría simplificada para el mapa (ADR-004 D4) */
async function mapaDeZonas(idsZona: number[]): Promise<MapaResultado> {
  const [rutas, contornos] = await Promise.all([listarRutas(idsZona), contornosDeZonas(idsZona, false)]);
  if (!rutas.ok || !contornos.ok) return { ok: false };
  return { ok: true, data: { rutas: rutas.data, contornos: contornos.data } };
}

/** Zonas que el supervisor supervisa hoy, o null si la consulta falla */
async function idsZonaSupervisadas(idSupervisor: number): Promise<number[] | null> {
  const { data, error } = await createAdminClient().from('supervisor_zonas').select('id_zona').eq('id_supervisor', idSupervisor);
  return error ? null : (data ?? []).map((z) => z.id_zona);
}

/** Zonas de las rutas que el supervisor tiene planificadas en sus slots, o null si la consulta falla */
async function idsZonaPlanificadas(idSupervisor: number): Promise<number[] | null> {
  const { data, error } = await createAdminClient()
    .from('planificacion_rutas')
    .select('rutas!inner ( id_zona ), vendedor_slots!inner ( id_supervisor )')
    .eq('vendedor_slots.id_supervisor', idSupervisor);
  if (error) return null;
  return (data ?? []).flatMap((v) => {
    const ruta = primero(v.rutas);
    return ruta ? [ruta.id_zona] : [];
  });
}

/** Mapa del supervisor para planificar: solo las zonas que supervisa hoy (RN-05) */
export async function mapaDeSupervisor(idSupervisor: number): Promise<MapaResultado> {
  const idsZona = await idsZonaSupervisadas(idSupervisor);
  return idsZona ? mapaDeZonas(idsZona) : { ok: false };
}

/**
 * Mapa para consultar la planificación de un supervisor en solo lectura (ADR-004 D5). Además de sus zonas
 * actuales incluye las de las rutas que tiene planificadas: un supervisor retirado no tiene zonas y su
 * planificación debe poder revisarse igual (ADR-003 D10).
 */
export async function mapaDeConsulta(idSupervisor: number): Promise<MapaResultado> {
  const [supervisadas, planificadas] = await Promise.all([idsZonaSupervisadas(idSupervisor), idsZonaPlanificadas(idSupervisor)]);
  if (!supervisadas || !planificadas) return { ok: false };
  return mapaDeZonas([...new Set([...supervisadas, ...planificadas])]);
}
