import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { procesarLote, type LoteSql } from '@/lib/rutasLote';
import { resolverContextoRutas } from '@/lib/rutasApi';
import { armarInforme, resumirInforme } from '@/utils/rutaInforme';
import { interpretarLoteRutas } from '@/utils/rutaValidation';
import { logger } from '@/lib/logger';

// Next exige un literal estático. El archivo (4 MB, LOTE_MAX_BYTES) viaja como cuerpo directo (text/plain),
// sin envolverlo en un JSON: escapar comillas y saltos de línea lo engordaría hasta un 10 % y Vercel rechaza
// con 413 los cuerpos de más de 4,5 MB. Con 4,2 MB de tope el cuerpo no pasa de lo que pesa el archivo.
export const config = { api: { bodyParser: { sizeLimit: '4.2mb' } } };

const MAX_NOMBRE_ARCHIVO = 200;
const primero = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Importación de rutas por lote (CU-16): POST /api/admin/rutas/lote?id_sucursal=1&confirmar=true&nombre_archivo=rutas.geojson
// con el GeoJSON como cuerpo (Content-Type: text/plain). Sin `confirmar` es una vista previa: evalúa todo y no
// guarda nada. Requiere rutas:gestionar y respeta el mismo alcance que CU-05: las zonas que quien opera no
// puede administrar se rechazan ruta por ruta, sin detener el lote.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { caller, zonas, idsZona } = contexto;

  try {
    const idSucursal = Number(primero(req.query.id_sucursal));
    if (!Number.isInteger(idSucursal) || idSucursal <= 0) return res.status(400).json({ error: 'Selecciona la sucursal.' });
    if (!zonas.some((z) => z.id_sucursal === idSucursal)) {
      return res.status(403).json({ error: 'No puedes importar rutas en esa sucursal.' });
    }
    const confirmar = primero(req.query.confirmar) === 'true';
    const nombreArchivo = (primero(req.query.nombre_archivo) ?? '').slice(0, MAX_NOMBRE_ARCHIVO);
    if (typeof req.body !== 'string') {
      return res.status(400).json({ error: 'Envía el archivo GeoJSON como cuerpo de la petición (text/plain).' });
    }

    const archivo = interpretarLoteRutas(req.body);
    if (!archivo.ok) return res.status(400).json({ error: archivo.mensaje, code: archivo.error });

    // Si el archivo no trajo ninguna ruta utilizable no hay nada que consultar a la base
    const lote: LoteSql =
      archivo.rutas.length > 0
        ? await procesarLote(idSucursal, archivo.rutas, [...idsZona], confirmar)
        : { ok: true, resultados: [] };
    if (!lote.ok) {
      if (lote.error === 'error') return res.status(500).json({ error: 'No se pudo procesar el lote.' });
      return res.status(400).json({ error: 'La sucursal indicada no existe.' });
    }

    const filas = armarInforme({
      resultados: lote.resultados,
      rechazadasDelArchivo: archivo.rechazadas,
      zonasPorIndice: new Map(archivo.rutas.map((r) => [r.indice, r.codigo_zona])),
      codigosDelArchivo: new Set(archivo.rutas.map((r) => r.codigo_ruta)),
    });
    const resumen = resumirInforme(filas);

    if (confirmar) {
      const nuevas = filas.filter((f) => f.estado === 'nueva').map((f) => f.codigo_ruta);
      const actualizadas = filas.filter((f) => f.estado === 'actualizada').map((f) => f.codigo_ruta);
      await registrarBitacoraDesdeSesion(
        caller,
        'TERRITORIO',
        'IMPORTAR_RUTAS_LOTE',
        `Importación de rutas por lote en la sucursal ID ${idSucursal}: ${resumen.por_estado.nueva} nuevas, ${resumen.por_estado.actualizada} actualizadas, ${resumen.por_estado.sin_cambios} sin cambios, ${resumen.por_estado.rechazada} rechazadas`,
        req,
        { id_sucursal: idSucursal, archivo: nombreArchivo, resumen: resumen.por_estado, rechazadas_por_tipo: resumen.por_tipo, nuevas, actualizadas }
      );
      // Cada ruta actualizada conserva su polígono anterior para poder revertir el cambio (RNF-07)
      for (const r of lote.resultados.filter((x) => x.estado === 'actualizada')) {
        await registrarBitacoraDesdeSesion(
          caller,
          'TERRITORIO',
          'EDITAR_RUTA',
          `Se actualizó la ruta ${r.codigo_ruta} (ID ${r.id}) por importación por lote: polígono reemplazado`,
          req,
          { id: r.id, codigo_ruta: r.codigo_ruta, origen: 'importacion_por_lote', geojson_anterior: r.geojson_anterior }
        );
      }
    }

    return res.status(200).json({ confirmado: confirmar, resumen, filas });
  } catch (err: unknown) {
    logger.error('Error en /api/admin/rutas/lote:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
