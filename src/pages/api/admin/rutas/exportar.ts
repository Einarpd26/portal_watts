import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { exportarRutas, obtenerRuta } from '@/lib/rutas';
import { resolverContextoRutas } from '@/lib/rutasApi';
import { armarColeccionTerritorio, limpiar, nombreArchivoExportacion, partirRespaldo } from '@/utils/rutaExportacion';
import { LOTE_MAX_BYTES, LOTE_MAX_RUTAS } from '@/utils/rutaValidation';
import { todayBolivia } from '@/utils/boliviaTime';
import { logger } from '@/lib/logger';

// Respaldo del territorio en GeoJSON (CU-05, ADR-002 D6 y D10), siempre con la geometría completa y
// sin contornos de zona (se recalculan con las rutas). Una ruta (`id_ruta`) sale como un solo archivo.
// Una zona (`id_zona`) o todo el alcance salen por sucursal y en tandas que caben en un lote de
// CU-16: con `resumen=1` se lista cada archivo y con `archivo=<nombre>` se descarga uno por petición,
// así ninguna respuesta se acerca al límite de tamaño de la plataforma.
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

  const enviarArchivo = async (
    archivo: { nombre: string; contenido: string; rutas: number },
    descripcion: string,
    detalle: Record<string, string | number | null>
  ) => {
    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'EXPORTAR_TERRITORIO',
      `Se exportó ${descripcion}: ${archivo.nombre} (${archivo.rutas} rutas)`,
      req,
      { ...detalle, rutas: archivo.rutas }
    );
    res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre}"`);
    return res.status(200).send(archivo.contenido);
  };

  try {
    if (idRuta !== null) {
      const ruta = await obtenerRuta(idRuta);
      if (!ruta.ok) {
        return res.status(ruta.error === 'no_encontrada' ? 404 : 500).json({ error: 'No se pudo consultar la ruta.' });
      }
      if (!idsZona.has(ruta.data.id_zona)) {
        return res.status(403).json({ error: 'Solo puedes exportar rutas de tus zonas asignadas' });
      }
      const rutas = await exportarRutas([ruta.data.id_zona], idRuta);
      if (!rutas.ok) return res.status(500).json({ error: 'No se pudo exportar el territorio.' });
      const archivo = nombreArchivoExportacion({ tipo: 'ruta', codigo: ruta.data.codigo_ruta }, todayBolivia());
      return await enviarArchivo(
        { nombre: archivo, contenido: JSON.stringify(armarColeccionTerritorio(rutas.data), null, 2), rutas: rutas.data.length },
        `la ruta ${ruta.data.codigo_ruta}`,
        { id_ruta: idRuta }
      );
    }

    let zonasObjetivo = [...idsZona];
    let prefijoZona: string | null = null;
    let descripcion = 'el territorio';
    if (idZona !== null) {
      const zona = zonas.find((z) => z.id === idZona);
      if (!zona) return res.status(403).json({ error: 'Solo puedes exportar tus zonas asignadas' });
      zonasObjetivo = [idZona];
      prefijoZona = `zona-${limpiar(zona.codigo_zona)}`;
      descripcion = `la zona ${zona.codigo_zona}`;
    }

    const rutas = await exportarRutas(zonasObjetivo, null);
    if (!rutas.ok) return res.status(500).json({ error: 'No se pudo exportar el territorio.' });

    const sucursalDeZona = new Map(zonas.map((z) => [z.id, z.sucursal_nombre]));
    const archivos = partirRespaldo(
      rutas.data.map((r) => ({ ...r, sucursal: sucursalDeZona.get(r.id_zona) ?? '' })),
      todayBolivia(),
      { maxRutas: LOTE_MAX_RUTAS, maxBytes: LOTE_MAX_BYTES },
      (sucursal) => prefijoZona ?? `territorio-${limpiar(sucursal)}`
    );

    if (req.query.resumen === '1') {
      return res.status(200).json({
        rutas: rutas.data.length,
        archivos: archivos.map(({ nombre, sucursal, parte, rutas: cantidad, bytes }) => ({ nombre, sucursal, parte, rutas: cantidad, bytes })),
      });
    }

    const archivo = archivos.find((a) => a.nombre === req.query.archivo);
    if (!archivo) return res.status(404).json({ error: 'El archivo pedido no existe en el respaldo.' });
    return await enviarArchivo(archivo, descripcion, { id_zona: idZona, archivo: archivo.nombre });
  } catch (err: unknown) {
    logger.error('Error en /api/admin/rutas/exportar:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
