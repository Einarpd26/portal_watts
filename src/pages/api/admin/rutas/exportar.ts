import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { contornosDeZonas, exportarRutas, obtenerRuta } from '@/lib/rutas';
import { resolverContextoRutas } from '@/lib/rutasApi';
import { armarColeccionTerritorio, nombreArchivoExportacion } from '@/utils/rutaExportacion';
import { todayBolivia } from '@/utils/boliviaTime';
import { logger } from '@/lib/logger';

// Respaldo del territorio en GeoJSON (CU-05, ADR-002 D6): una ruta (`id_ruta`), una zona con su
// contorno (`id_zona`) o todo el alcance del solicitante. Siempre con la geometría completa.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { caller, zonas, idsZona } = contexto;

  const entero = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null);
  const idRuta = entero(req.query.id_ruta);
  const idZona = entero(req.query.id_zona);
  if ((req.query.id_ruta !== undefined && idRuta === null) || (req.query.id_zona !== undefined && idZona === null)) {
    return res.status(400).json({ error: 'Identificador inválido' });
  }

  try {
    let zonasObjetivo = [...idsZona];
    let objetivo: Parameters<typeof nombreArchivoExportacion>[0] = { tipo: 'todo' };

    if (idRuta !== null) {
      const ruta = await obtenerRuta(idRuta);
      if (!ruta.ok) {
        return res.status(ruta.error === 'no_encontrada' ? 404 : 500).json({ error: 'No se pudo consultar la ruta.' });
      }
      if (!idsZona.has(ruta.data.id_zona)) {
        return res.status(403).json({ error: 'Solo puedes exportar rutas de tus zonas asignadas' });
      }
      zonasObjetivo = [ruta.data.id_zona];
      objetivo = { tipo: 'ruta', codigo: ruta.data.codigo_ruta };
    } else if (idZona !== null) {
      const zona = zonas.find((z) => z.id === idZona);
      if (!zona) return res.status(403).json({ error: 'Solo puedes exportar tus zonas asignadas' });
      zonasObjetivo = [idZona];
      objetivo = { tipo: 'zona', codigo: zona.codigo_zona };
    }

    // Una ruta sola se exporta sin contorno, para que el archivo se pueda volver a importar
    const [rutas, contornos] = await Promise.all([
      exportarRutas(zonasObjetivo, idRuta),
      idRuta !== null ? Promise.resolve({ ok: true as const, data: [] }) : contornosDeZonas(zonasObjetivo, true),
    ]);
    if (!rutas.ok || !contornos.ok) return res.status(500).json({ error: 'No se pudo exportar el territorio.' });

    const coleccion = armarColeccionTerritorio(
      rutas.data,
      contornos.data,
      new Map(zonas.map((z) => [z.id, { codigo_zona: z.codigo_zona, zona: z.zona }]))
    );
    const archivo = nombreArchivoExportacion(objetivo, todayBolivia());

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'EXPORTAR_TERRITORIO',
      `Se exportó ${objetivo.tipo === 'todo' ? 'el territorio' : `la ${objetivo.tipo} ${objetivo.codigo}`} (${rutas.data.length} rutas)`,
      req,
      { tipo: objetivo.tipo, id_ruta: idRuta, id_zona: idZona, rutas: rutas.data.length }
    );

    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
    return res.status(200).send(JSON.stringify(coleccion, null, 2));
  } catch (err: unknown) {
    logger.error('Error en /api/admin/rutas/exportar:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
