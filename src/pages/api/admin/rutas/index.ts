import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { contornosDeZonas, guardarRuta, listarRutas } from '@/lib/rutas';
import { codigoDeZona, geoJsonComoTexto, resolverContextoRutas, responderFalloGuardado } from '@/lib/rutasApi';
import { interpretarGeoJson, validarRuta } from '@/utils/rutaValidation';
import { logger } from '@/lib/logger';

// Next exige un literal estático: el archivo GeoJSON (512 KB, GEOJSON_MAX_BYTES) viaja dentro del JSON
export const config = { api: { bodyParser: { sizeLimit: '700kb' } } };

// Rutas comerciales (CU-05): listado y alta. Requiere rutas:gestionar; el Supervisor solo opera en sus zonas.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { caller, zonas, idsZona } = contexto;

  try {
    if (req.method === 'GET') {
      const [rutas, contornos] = await Promise.all([listarRutas([...idsZona]), contornosDeZonas([...idsZona], false)]);
      if (!rutas.ok || !contornos.ok) return res.status(500).json({ error: 'No se pudieron obtener las rutas.' });
      return res.status(200).json({ zonas, rutas: rutas.data, contornos: contornos.data });
    }

    const cuerpo = (req.body ?? {}) as Record<string, unknown>;
    const texto = (v: unknown) => (typeof v === 'string' ? v : '');
    const validacion = validarRuta(
      {
        codigo_ruta: texto(cuerpo.codigo_ruta),
        ruta: texto(cuerpo.ruta),
        descripcion_ruta: texto(cuerpo.descripcion_ruta),
        id_zona: typeof cuerpo.id_zona === 'number' ? cuerpo.id_zona : null,
      },
      { exigirZona: true }
    );
    if (!validacion.isValid) {
      return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
    }
    const idZona = validacion.data.id_zona as number;
    if (!idsZona.has(idZona)) {
      return res.status(403).json({ error: 'Solo puedes crear rutas en tus zonas asignadas' });
    }

    const geometria = interpretarGeoJson(geoJsonComoTexto(cuerpo.geojson));
    if (!geometria.ok) {
      return res.status(400).json({ error: geometria.mensaje, code: geometria.error });
    }

    const guardado = await guardarRuta(
      null,
      { ...validacion.data, id_zona: idZona },
      JSON.stringify(geometria.poligono),
      idsZona
    );
    if (!guardado.ok) return responderFalloGuardado(res, guardado, codigoDeZona(zonas, idZona));

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'CREAR_RUTA',
      `Se creó la ruta ${validacion.data.codigo_ruta} "${validacion.data.ruta}" (ID ${guardado.id}) en la zona ID ${idZona}`,
      req,
      { id: guardado.id, codigo_ruta: validacion.data.codigo_ruta, id_zona: idZona }
    );
    return res.status(201).json({ id: guardado.id });
  } catch (err: unknown) {
    logger.error('Error en /api/admin/rutas:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
