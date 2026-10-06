import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { obtenerCatalogo } from '@/lib/catalogos';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { esCatalogoTipo, validarCatalogo } from '@/utils/catalogoValidation';
import { logger } from '@/lib/logger';

// Catálogos maestros (sucursales y cargos): edición y baja. Solo Gerencia Comercial.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'catalogos:gestionar');
  if (!caller) return;

  const { tipo, id: rawId } = req.query;
  if (!esCatalogoTipo(tipo)) {
    return res.status(404).json({ error: 'Catálogo no encontrado' });
  }
  const id = Number(typeof rawId === 'string' ? rawId : '');
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  const catalogo = obtenerCatalogo(tipo);

  try {
    if (req.method === 'PUT') {
      const { nombre, descripcion } = (req.body ?? {}) as { nombre?: unknown; descripcion?: unknown };
      if (typeof nombre !== 'string' || (descripcion !== undefined && typeof descripcion !== 'string')) {
        return res.status(400).json({ error: 'Nombre y descripción deben ser texto.' });
      }

      const validacion = validarCatalogo(tipo, nombre, descripcion ?? '');
      if (!validacion.isValid) {
        return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
      }

      const resultado = await catalogo.actualizar(id, validacion.data);
      if (!resultado.ok) {
        if (resultado.error === 'duplicado') {
          return res.status(409).json({ error: `Ya existe una ${catalogo.etiqueta} con ese nombre.` });
        }
        if (resultado.error === 'no_encontrado') {
          return res.status(404).json({ error: `La ${catalogo.etiqueta} no existe.` });
        }
        return res.status(500).json({ error: `No se pudo editar la ${catalogo.etiqueta}.` });
      }

      await registrarBitacoraDesdeSesion(
        caller,
        'SISTEMA',
        catalogo.acciones.editar,
        `Se editó la ${catalogo.etiqueta} ID ${id}: "${resultado.data.nombre}"`,
        req,
        { id, nombre: resultado.data.nombre, descripcion: resultado.data.descripcion }
      );

      return res.status(200).json({ item: resultado.data });
    }

    const resultado = await catalogo.eliminar(id);
    if (!resultado.ok) {
      if (resultado.error === 'en_uso') {
        return res.status(409).json({
          error: `No se puede eliminar: la ${catalogo.etiqueta} está en uso por otros registros.`,
        });
      }
      if (resultado.error === 'no_encontrado') {
        return res.status(404).json({ error: `La ${catalogo.etiqueta} no existe.` });
      }
      return res.status(500).json({ error: `No se pudo eliminar la ${catalogo.etiqueta}.` });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'SISTEMA',
      catalogo.acciones.eliminar,
      `Se eliminó la ${catalogo.etiqueta} ID ${id}`,
      req,
      { id }
    );

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en catálogo ${tipo}/${id}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
