import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { crearZona, listarSucursales, listarSupervisores, listarZonas } from '@/lib/zonas';
import { alcanceDeListado, enAlcanceDeSucursal } from '@/utils/sucursalScope';
import { validarZona } from '@/utils/zonaValidation';
import { logger } from '@/lib/logger';

// Zonas comerciales (CU-04): listado y alta. Requiere territorio:gestionar y respeta el alcance por sucursal.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'territorio:gestionar');
  if (!caller) return;

  const alcance = alcanceDeListado(caller);
  if (alcance.tipo === 'denegado') {
    return res.status(403).json({ error: 'Sin sucursal asignada' });
  }
  const idSucursalAlcance = alcance.tipo === 'sucursal' ? alcance.id_sucursal : null;

  try {
    if (req.method === 'GET') {
      const [zonas, supervisores, sucursales] = await Promise.all([
        listarZonas(idSucursalAlcance),
        listarSupervisores(idSucursalAlcance),
        listarSucursales(idSucursalAlcance),
      ]);
      if (!zonas.ok || !supervisores.ok || !sucursales.ok) {
        return res.status(500).json({ error: 'No se pudo obtener el territorio.' });
      }
      return res.status(200).json({
        zonas: zonas.data,
        supervisores: supervisores.data,
        sucursales: sucursales.data,
      });
    }

    const cuerpo = (req.body ?? {}) as Record<string, unknown>;
    const texto = (v: unknown) => (typeof v === 'string' ? v : '');
    // Con alcance de sucursal, la zona nace en la propia sede si no se indica otra
    const idSucursal =
      typeof cuerpo.id_sucursal === 'number' ? cuerpo.id_sucursal : idSucursalAlcance;

    const validacion = validarZona(
      {
        codigo_zona: texto(cuerpo.codigo_zona),
        zona: texto(cuerpo.zona),
        descripcion_zona: texto(cuerpo.descripcion_zona),
        canal_venta: texto(cuerpo.canal_venta),
        id_sucursal: idSucursal,
      },
      { exigirSucursal: true }
    );
    if (!validacion.isValid) {
      return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
    }

    const { id_sucursal, ...campos } = validacion.data;
    if (id_sucursal === null || !enAlcanceDeSucursal(caller, [id_sucursal])) {
      return res.status(403).json({ error: 'Solo puedes crear zonas en tu sucursal' });
    }

    const resultado = await crearZona({ ...campos, id_sucursal });
    if (!resultado.ok) {
      if (resultado.error === 'duplicado') {
        return res.status(409).json({ error: 'Ya existe una zona con ese código en la sucursal.' });
      }
      if (resultado.error === 'sucursal_invalida') {
        return res.status(400).json({ error: 'La sucursal indicada no existe.' });
      }
      return res.status(500).json({ error: 'No se pudo crear la zona.' });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'CREAR_ZONA',
      `Se creó la zona ${resultado.data.codigo_zona} "${resultado.data.zona}" (ID ${resultado.data.id})`,
      req,
      { id: resultado.data.id, codigo_zona: resultado.data.codigo_zona, id_sucursal }
    );

    return res.status(201).json({ zona: resultado.data });
  } catch (err: unknown) {
    logger.error('Error en /api/admin/zonas:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
