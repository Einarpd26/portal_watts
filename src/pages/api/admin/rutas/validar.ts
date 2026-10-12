import type { NextApiRequest, NextApiResponse } from 'next';
import { evaluarRuta, obtenerRuta } from '@/lib/rutas';
import { codigoDeZona, geoJsonComoTexto, resolverContextoRutas } from '@/lib/rutasApi';
import { mensajeCobertura, motivoInvasion } from '@/utils/invasionZona';
import { interpretarGeoJson } from '@/utils/rutaValidation';
import { logger } from '@/lib/logger';

// Next exige un literal estático: el archivo GeoJSON (512 KB, GEOJSON_MAX_BYTES) viaja dentro del JSON
export const config = { api: { bodyParser: { sizeLimit: '700kb' } } };

// Vista previa de CU-05 (paso 3): valida el polígono y busca superposiciones sin guardar nada.
// Con la zona (la de la ruta que se edita o `id_zona` en un alta) informa además las rutas de
// otras zonas que su envolvente pasaría a cubrir (ADR-002 D7).
// Siempre responde 200 con `valida`; el motivo del rechazo y los conflictos van en el cuerpo.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { zonas, idsZona } = contexto;

  try {
    const cuerpo = (req.body ?? {}) as Record<string, unknown>;

    // Al reemplazar el polígono de una ruta, ella misma no cuenta como conflicto
    let excluirId: number | null = null;
    let idZona: number | null = typeof cuerpo.id_zona === 'number' ? cuerpo.id_zona : null;
    if (typeof cuerpo.id_ruta === 'number') {
      const ruta = await obtenerRuta(cuerpo.id_ruta);
      if (!ruta.ok) {
        return res.status(ruta.error === 'no_encontrada' ? 404 : 500).json({ error: 'No se pudo consultar la ruta.' });
      }
      if (!idsZona.has(ruta.data.id_zona)) {
        return res.status(403).json({ error: 'Solo puedes administrar rutas de tus zonas asignadas' });
      }
      excluirId = ruta.data.id;
      idZona = ruta.data.id_zona;
    }
    if (idZona !== null && !idsZona.has(idZona)) {
      return res.status(403).json({ error: 'Solo puedes administrar rutas de tus zonas asignadas' });
    }

    const geometria = interpretarGeoJson(geoJsonComoTexto(cuerpo.geojson));
    if (!geometria.ok) {
      return res.status(200).json({ valida: false, motivo: geometria.mensaje, code: geometria.error, conflictos: [] });
    }

    const evaluacion = await evaluarRuta(JSON.stringify(geometria.poligono), excluirId, idZona, idsZona);
    if (!evaluacion.ok) return res.status(500).json({ error: 'No se pudo validar la ruta.' });

    const e = evaluacion.data;
    if (!e.ok) {
      return res.status(200).json({
        valida: false,
        motivo:
          e.error === 'geometria_invalida'
            ? `El polígono no es válido${e.detalle ? `: ${e.detalle}` : ''}.`
            : 'El archivo no contiene un Polygon utilizable.',
        code: e.error,
        conflictos: [],
      });
    }
    // La superposición se informa primero: es del polígono mismo, no de su zona
    const superpone = e.conflictos.some((c) => c.tipo === 'superposicion');
    const invasiones = e.conflictos.filter((c) => c.tipo === 'invasion');
    const coberturas = e.conflictos.filter((c) => c.tipo === 'cobertura');
    const invade = !superpone && invasiones.length > 0;
    const cubierta = !superpone && !invade && coberturas.length > 0;
    return res.status(200).json({
      valida: e.conflictos.length === 0,
      motivo: superpone
        ? 'La ruta se superpone con otra ruta existente.'
        : invade && idZona !== null
          ? motivoInvasion(codigoDeZona(zonas, idZona))
          : cubierta
            ? mensajeCobertura(coberturas)
            : null,
      code: superpone ? 'superposicion' : invade ? 'invasion' : cubierta ? 'cobertura' : null,
      geojson: e.geojson,
      vertices: e.vertices,
      area_m2: e.area_m2,
      conflictos: e.conflictos,
    });
  } catch (err: unknown) {
    logger.error('Error en /api/admin/rutas/validar:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
