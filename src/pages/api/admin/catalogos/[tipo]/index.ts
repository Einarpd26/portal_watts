import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { obtenerCatalogo } from '@/lib/catalogos';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { esCatalogoTipo, validarCatalogo } from '@/utils/catalogoValidation';
import { logger } from '@/lib/logger';

// Catálogos maestros (sucursales y cargos): listado y alta. Solo Gerencia Comercial.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'catalogos:gestionar');
  if (!caller) return;

  const { tipo } = req.query;
  if (!esCatalogoTipo(tipo)) {
    return res.status(404).json({ error: 'Catálogo no encontrado' });
  }
  const catalogo = obtenerCatalogo(tipo);

  try {
    if (req.method === 'GET') {
      const resultado = await catalogo.listar();
      if (!resultado.ok) {
        return res.status(500).json({ error: `No se pudo obtener el listado de ${tipo}.` });
      }
      return res.status(200).json({ items: resultado.data });
    }

    const { nombre, descripcion } = (req.body ?? {}) as { nombre?: unknown; descripcion?: unknown };
    if (typeof nombre !== 'string' || (descripcion !== undefined && typeof descripcion !== 'string')) {
      return res.status(400).json({ error: 'Nombre y descripción deben ser texto.' });
    }

    const validacion = validarCatalogo(tipo, nombre, descripcion ?? '');
    if (!validacion.isValid) {
      return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
    }

    const resultado = await catalogo.crear(validacion.data);
    if (!resultado.ok) {
      if (resultado.error === 'duplicado') {
        return res.status(409).json({ error: `Ya existe una ${catalogo.etiqueta} con ese nombre.` });
      }
      return res.status(500).json({ error: `No se pudo crear la ${catalogo.etiqueta}.` });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'SISTEMA',
      catalogo.acciones.crear,
      `Se creó la ${catalogo.etiqueta} "${resultado.data.nombre}" (ID ${resultado.data.id})`,
      req,
      { id: resultado.data.id, nombre: resultado.data.nombre, descripcion: resultado.data.descripcion }
    );

    return res.status(201).json({ item: resultado.data });
  } catch (err: unknown) {
    logger.error(`Error en catálogo ${tipo}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
