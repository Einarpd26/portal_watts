import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeClientes, alcanceDeCobertura, PERMISO_MAPA } from '@/utils/clientesScope';
import { coberturaDeAlcance } from '@/lib/cobertura';
import { consultaDePlanificacion } from '@/lib/consultaPlanificacion';
import { mapaDeClientes } from '@/lib/clientes';
import { listarSlots } from '@/lib/slots';
import { construirLibro } from '@/lib/reporteExcel';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import {
  clientesDesdeQuery,
  coberturaDesdeQuery,
  esTipoReporte,
  nombreArchivoReporte,
  planificacionDesdeQuery,
  type TipoReporte,
} from '@/utils/reportes';
import { reporteClientes, reporteCobertura, reporteGrilla, reportePlanificacion, type ReporteExcel } from '@/utils/reportesFilas';
import { todayBolivia } from '@/utils/boliviaTime';
import { logger } from '@/lib/logger';
import type { UserSession } from '@/types';

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// La grilla es la planificación propia del supervisor (CU-08, CU-09): su permiso es el de planificar, no el de consultar el mapa
const permisoDe = (tipo: TipoReporte) => (tipo === 'grilla' ? 'planificacion:asignar' : PERMISO_MAPA);

/** Arma el reporte (una hoja por elemento) con los datos del alcance del solicitante y los filtros recibidos */
async function armarReporte(tipo: TipoReporte, req: NextApiRequest, caller: UserSession): Promise<ReporteExcel[] | 'denegado' | 'error'> {
  if (tipo === 'grilla') {
    // Los slots son del supervisor: Gerencia y Fiscalizador consultan la planificación en la consulta, no en su propia grilla
    if (!caller.roles.some((r) => r.codigo === 'SUPERVISOR')) return 'denegado';
    const listado = await listarSlots(caller.id_persona);
    return listado.ok ? reporteGrilla({ ...listado.data, supervisor: `${caller.nombres} ${caller.apellidos}`, fecha: todayBolivia() }) : 'error';
  }

  if (tipo === 'clientes') {
    const alcance = alcanceDeClientes(caller);
    if (alcance.tipo === 'denegado') return 'denegado';
    const mapa = await mapaDeClientes(alcance, caller.id_persona);
    return mapa.ok ? [reporteClientes(mapa.data, clientesDesdeQuery(req.query))] : 'error';
  }

  // La cobertura y la consulta de la planificación no las ve el Vendedor (CU-13, CU-10)
  const alcance = alcanceDeCobertura(caller);
  if (alcance.tipo === 'denegado') return 'denegado';
  if (tipo === 'cobertura') {
    const cobertura = await coberturaDeAlcance(alcance, caller.id_persona);
    if (!cobertura.ok) return 'error';
    const { filtros, orden } = coberturaDesdeQuery(req.query);
    return [reporteCobertura(cobertura.data, filtros, orden)];
  }
  const consulta = await consultaDePlanificacion(alcance, caller.id_persona);
  return consulta.ok ? [reportePlanificacion(consulta.data, planificacionDesdeQuery(req.query))] : 'error';
}

// Reportes personalizados en Excel (ADR-005 D6): cobertura, planificación y clientes clasificados. El archivo sale
// con los filtros que el usuario tenía en la pantalla, aplicados de nuevo aquí sobre lo que su rol le permite ver.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tipo = req.query.tipo;
  if (!esTipoReporte(tipo)) return res.status(404).json({ error: 'Reporte no encontrado' });

  const caller = await requireCallerAuth(req, res, permisoDe(tipo));
  if (!caller) return;

  try {
    const reporte = await armarReporte(tipo, req, caller);
    if (reporte === 'denegado') return res.status(403).json({ error: 'Sin alcance para este reporte' });
    if (reporte === 'error') return res.status(500).json({ error: 'No se pudo generar el reporte.' });

    const archivo = nombreArchivoReporte(tipo, todayBolivia());
    const contenido = await construirLibro(reporte);
    await registrarBitacoraDesdeSesion(caller, 'REPORTES', 'EXPORTAR_REPORTE', `Se exportó el reporte de ${tipo}: ${archivo} (${reporte[0].filas.length} filas)`, req, {
      reporte: tipo,
      filas: reporte[0].filas.length,
    });

    res.setHeader('Content-Type', TIPO_EXCEL);
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
    return res.status(200).send(contenido);
  } catch (err: unknown) {
    logger.error('Error en GET /api/reportes:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
