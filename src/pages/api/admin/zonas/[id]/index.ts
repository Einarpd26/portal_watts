import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { actualizarZona, cambiarSucursalZona, eliminarZona, obtenerZona } from '@/lib/zonas';
import { MENSAJE_CORRECCION_SUCURSAL } from '@/utils/correccionSucursalZona';
import { enAlcanceDeSucursal, tieneAlcanceGlobal } from '@/utils/sucursalScope';
import { validarZona } from '@/utils/zonaValidation';
import { logger } from '@/lib/logger';

// Zonas comerciales (CU-04): edición y baja. La sucursal solo se corrige por error de registro
// (A4): con alcance global y con la zona sin rutas ni supervisor.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'territorio:gestionar');
  if (!caller) return;

  const id = Number(typeof req.query.id === 'string' ? req.query.id : '');
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de zona inválido' });
  }

  try {
    const zona = await obtenerZona(id);
    if (!zona.ok) {
      return res
        .status(zona.error === 'no_encontrada' ? 404 : 500)
        .json({ error: zona.error === 'no_encontrada' ? 'La zona no existe.' : 'No se pudo consultar la zona.' });
    }
    if (!enAlcanceDeSucursal(caller, [zona.data.id_sucursal])) {
      return res.status(403).json({ error: 'Solo puedes administrar zonas de tu sucursal' });
    }

    if (req.method === 'PATCH') {
      const cuerpo = (req.body ?? {}) as Record<string, unknown>;
      const idSucursalSolicitada =
        typeof cuerpo.id_sucursal === 'number' ? cuerpo.id_sucursal : zona.data.id_sucursal;
      const cambiaSucursal = idSucursalSolicitada !== zona.data.id_sucursal;
      if (cambiaSucursal && !tieneAlcanceGlobal(caller)) {
        return res.status(403).json({ error: MENSAJE_CORRECCION_SUCURSAL.sin_permiso });
      }
      if (cambiaSucursal && cuerpo.confirmar_cambio_sucursal !== true) {
        return res.status(400).json({ error: 'Confirma el cambio de sucursal para continuar.' });
      }
      const texto = (v: unknown) => (typeof v === 'string' ? v : '');
      const validacion = validarZona(
        {
          codigo_zona: texto(cuerpo.codigo_zona),
          zona: texto(cuerpo.zona),
          descripcion_zona: texto(cuerpo.descripcion_zona),
          canal_venta: texto(cuerpo.canal_venta),
          id_sucursal: idSucursalSolicitada,
        },
        { exigirSucursal: false }
      );
      if (!validacion.isValid) {
        return res.status(400).json({ error: 'Datos inválidos', errors: validacion.errors });
      }

      const { codigo_zona, zona: nombre, descripcion_zona, canal_venta } = validacion.data;
      const datos = { codigo_zona, zona: nombre, descripcion_zona, canal_venta };

      if (cambiaSucursal) {
        const cambio = await cambiarSucursalZona(id, idSucursalSolicitada, datos);
        if (!cambio.ok) {
          const rechazo = {
            con_rutas: { status: 409, error: MENSAJE_CORRECCION_SUCURSAL.con_rutas },
            con_supervisor: { status: 409, error: MENSAJE_CORRECCION_SUCURSAL.con_supervisor },
            duplicado: { status: 409, error: 'Ya existe una zona con ese código en la sucursal.' },
            sucursal_invalida: { status: 400, error: 'La sucursal indicada no existe.' },
            no_encontrada: { status: 404, error: 'La zona no existe.' },
            error: { status: 500, error: 'No se pudo corregir la sucursal de la zona.' },
          }[cambio.error];
          return res.status(rechazo.status).json({ error: rechazo.error });
        }

        await registrarBitacoraDesdeSesion(
          caller,
          'TERRITORIO',
          'EDITAR_ZONA',
          `Se corrigió la sucursal de la zona ID ${id}: ${codigo_zona} "${nombre}" (sucursal ${cambio.data.anterior} → ${idSucursalSolicitada})`,
          req,
          { id, codigo_zona, id_sucursal_anterior: cambio.data.anterior, id_sucursal: idSucursalSolicitada }
        );
        return res.status(200).json({ zona: { id, codigo_zona, zona: nombre, id_sucursal: idSucursalSolicitada } });
      }

      const resultado = await actualizarZona(id, datos);
      if (!resultado.ok) {
        if (resultado.error === 'duplicado') {
          return res.status(409).json({ error: 'Ya existe una zona con ese código en la sucursal.' });
        }
        return res.status(resultado.error === 'no_encontrada' ? 404 : 500).json({ error: 'No se pudo editar la zona.' });
      }

      await registrarBitacoraDesdeSesion(
        caller,
        'TERRITORIO',
        'EDITAR_ZONA',
        `Se editó la zona ID ${id}: ${resultado.data.codigo_zona} "${resultado.data.zona}"`,
        req,
        { id, codigo_zona: resultado.data.codigo_zona, id_sucursal: zona.data.id_sucursal }
      );
      return res.status(200).json({ zona: resultado.data });
    }

    const resultado = await eliminarZona(id);
    if (!resultado.ok) {
      if (resultado.error === 'en_uso') {
        return res.status(409).json({ error: 'No se puede eliminar: la zona tiene rutas asociadas.' });
      }
      return res.status(resultado.error === 'no_encontrada' ? 404 : 500).json({ error: 'No se pudo eliminar la zona.' });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'ELIMINAR_ZONA',
      `Se eliminó la zona ${zona.data.codigo_zona} "${zona.data.zona}" (ID ${id})`,
      req,
      { id, codigo_zona: zona.data.codigo_zona, id_sucursal: zona.data.id_sucursal }
    );
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en /api/admin/zonas/${id}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
