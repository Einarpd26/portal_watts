import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { exportarRutas, guardarRuta, obtenerRuta } from '@/lib/rutas';
import { codigoDeZona, geoJsonComoTexto, resolverContextoRutas, responderFalloGuardado } from '@/lib/rutasApi';
import { interpretarGeoJson, validarRuta } from '@/utils/rutaValidation';
import { logger } from '@/lib/logger';

// Next exige un literal estático: el archivo GeoJSON (512 KB, GEOJSON_MAX_BYTES) viaja dentro del JSON
export const config = { api: { bodyParser: { sizeLimit: '700kb' } } };

// Rutas comerciales (CU-05): consulta con el polígono completo (para editarlo en el mapa sin perder
// el detalle que el listado simplifica), edición de datos y reemplazo opcional del polígono. La
// ruta no cambia de zona aquí: el traslado es CU-06.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { caller, zonas, idsZona } = contexto;

  const id = Number(typeof req.query.id === 'string' ? req.query.id : '');
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de ruta inválido' });
  }

  try {
    const ruta = await obtenerRuta(id);
    if (!ruta.ok) {
      return res
        .status(ruta.error === 'no_encontrada' ? 404 : 500)
        .json({ error: ruta.error === 'no_encontrada' ? 'La ruta no existe.' : 'No se pudo consultar la ruta.' });
    }
    if (!idsZona.has(ruta.data.id_zona)) {
      return res.status(403).json({ error: 'Solo puedes administrar rutas de tus zonas asignadas' });
    }

    if (req.method === 'GET') {
      const completa = await exportarRutas([ruta.data.id_zona], id);
      if (!completa.ok || completa.data.length === 0) {
        return res.status(500).json({ error: 'No se pudo consultar la ruta.' });
      }
      return res.status(200).json({ ruta: completa.data[0] });
    }

    const cuerpo = (req.body ?? {}) as Record<string, unknown>;
    if (typeof cuerpo.id_zona === 'number' && cuerpo.id_zona !== ruta.data.id_zona) {
      return res.status(400).json({ error: 'Para cambiar la zona de una ruta usa el traslado de rutas.' });
    }
    const texto = (v: unknown) => (typeof v === 'string' ? v : '');
    const validacion = validarRuta(
      {
        codigo_ruta: texto(cuerpo.codigo_ruta),
        ruta: texto(cuerpo.ruta),
        descripcion_ruta: texto(cuerpo.descripcion_ruta),
        id_zona: ruta.data.id_zona,
      },
      { exigirZona: false }
    );
    if (!validacion.isValid) {
      return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
    }

    // Sin geojson se conserva el polígono actual (edición solo de datos)
    let poligono: string | null = null;
    if (cuerpo.geojson !== undefined && cuerpo.geojson !== null) {
      const geometria = interpretarGeoJson(geoJsonComoTexto(cuerpo.geojson));
      if (!geometria.ok) return res.status(400).json({ error: geometria.mensaje, code: geometria.error });
      poligono = JSON.stringify(geometria.poligono);
    }

    const guardado = await guardarRuta(id, { ...validacion.data, id_zona: ruta.data.id_zona }, poligono, idsZona);
    if (!guardado.ok) return responderFalloGuardado(res, guardado, codigoDeZona(zonas, ruta.data.id_zona), validacion.data.codigo_ruta);

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'EDITAR_RUTA',
      `Se editó la ruta ID ${id}: ${validacion.data.codigo_ruta} "${validacion.data.ruta}"${poligono ? ' (polígono reemplazado)' : ''}`,
      req,
      { id, codigo_ruta: validacion.data.codigo_ruta, id_zona: ruta.data.id_zona, poligono_reemplazado: poligono !== null }
    );
    return res.status(200).json({ id });
  } catch (err: unknown) {
    logger.error(`Error en /api/admin/rutas/${id}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
