import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { generateTempPassword, tempPasswordExpiry } from '@/utils/tempPassword';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { puedeOtorgarAcceso } from '@/utils/grantAuthority';
import { logger } from '@/lib/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Autenticar al caller
  const caller = await requireCallerAuth(req, res, 'cuentas:gestionar');
  if (!caller) return;

  // 2. Extraer y validar campos del body
  const { id_persona, email, id_rol, alcance_tipo, id_sucursal } = req.body as {
    id_persona: number;
    email: string;
    id_rol: number;
    alcance_tipo: 'GLOBAL' | 'SUCURSAL';
    id_sucursal?: number | null;
  };

  if (!id_persona || !email || !id_rol || !alcance_tipo) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id_persona, email, id_rol, alcance_tipo' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  const supabaseAdmin = createAdminClient();

  // 3. Autoridad de otorgamiento (ADR-001 §C/§D): nadie otorga privilegios que no posee
  // ni un alcance mayor que el suyo. Se resuelve a partir de los permisos del rol solicitado,
  // antes de crear nada, para que un Fiscalizador no pueda conferir el rol GERENCIA_COMERCIAL
  // (que incluye `catalogos:gestionar`, un privilegio nacional que el Fiscalizador no tiene).
  const { data: rol, error: rolFetchError } = await supabaseAdmin
    .from('roles')
    .select('id, codigo, permisos')
    .eq('id', id_rol)
    .maybeSingle();

  if (rolFetchError || !rol) {
    return res.status(400).json({ error: 'El rol indicado no existe' });
  }

  const decision = puedeOtorgarAcceso(
    { alcance_tipo: caller.alcance_tipo, id_sucursal: caller.id_sucursal, permisos: caller.permisos },
    { alcance_tipo, id_sucursal: id_sucursal ?? null, permisos: rol.permisos ?? [] }
  );
  if (!decision.ok) {
    if (decision.motivo === 'ALCANCE_INVALIDO') {
      return res.status(400).json({
        error: 'El alcance del acceso es incoherente: GLOBAL no lleva sucursal y SUCURSAL la exige.',
      });
    }
    if (decision.motivo === 'ESCALA_PRIVILEGIOS') {
      return res.status(403).json({ error: 'No podés otorgar un rol con más privilegios que los tuyos' });
    }
    return res.status(403).json({ error: 'Solo podés crear accesos para tu sucursal' });
  }

  // 4. Verificar que la persona existe, no tiene cuenta y no está dada de baja
  const { data: persona, error: personaError } = await supabaseAdmin
    .from('personas')
    .select('id, auth_user_id, fecha_baja')
    .eq('id', id_persona)
    .single();

  if (personaError || !persona) {
    return res.status(404).json({ error: 'Colaborador no encontrado' });
  }

  if (persona.auth_user_id !== null) {
    return res.status(409).json({ error: 'Este colaborador ya tiene acceso digital' });
  }

  if (persona.fecha_baja !== null) {
    return res.status(400).json({ error: 'No se puede dar acceso a un colaborador dado de baja' });
  }

  // 5. Verificar asignación laboral activa
  const { data: asignacion, error: asignError } = await supabaseAdmin
    .from('asignaciones_laborales')
    .select('id')
    .eq('id_persona', id_persona)
    .eq('estado', 'activo')
    .limit(1)
    .single();

  if (asignError || !asignacion) {
    return res.status(400).json({ error: 'El colaborador no tiene asignación laboral activa' });
  }

  // 6. Crear usuario en auth.users con contraseña temporal generada por el sistema.
  // app_metadata marca el cambio obligatorio en el primer inicio de sesión y su vencimiento.
  const tempPassword = generateTempPassword();
  const expiresAt = tempPasswordExpiry();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { must_change_password: true, temp_password_expires_at: expiresAt },
  });

  if (authError || !authData.user) {
    const message = authError?.message ?? 'Error al crear usuario';
    if (message.toLowerCase().includes('already') || message.toLowerCase().includes('duplicate')) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }
    return res.status(400).json({ error: message });
  }

  const newAuthId = authData.user.id;

  // 7. Vincular auth_user_id en personas
  const { error: personaUpdateError } = await supabaseAdmin
    .from('personas')
    .update({ auth_user_id: newAuthId, email })
    .eq('id', id_persona);

  if (personaUpdateError) {
    // Rollback: eliminar el usuario de auth.users
    await supabaseAdmin.auth.admin.deleteUser(newAuthId);
    logger.error('Error vinculando persona, rollback ejecutado:', personaUpdateError);
    return res.status(500).json({ error: 'Error al vincular la cuenta con el colaborador' });
  }

  // 8. Insertar usuario_roles
  const { error: rolError } = await supabaseAdmin
    .from('usuario_roles')
    .insert({
      id_persona,
      id_rol,
      alcance_tipo,
      id_sucursal: id_sucursal ?? null,
    });

  if (rolError) {
    // Rollback completo: restaurar personas y eliminar auth user
    await supabaseAdmin
      .from('personas')
      .update({ auth_user_id: null })
      .eq('id', id_persona);
    await supabaseAdmin.auth.admin.deleteUser(newAuthId);
    logger.error('Error insertando rol, rollback ejecutado:', rolError);
    return res.status(500).json({ error: 'Error al asignar el rol al usuario' });
  }

  // Registrar auditoría en bitácora (UTC 0)
  await registrarBitacoraDesdeSesion(
    caller,
    'ACCESOS',
    'INVITAR_USUARIO',
    `Acceso digital creado para el colaborador ID ${id_persona} (${email})`,
    req,
    { id_persona, email, id_rol, alcance_tipo, id_sucursal: id_sucursal ?? null }
  );

  // La contraseña temporal viaja una sola vez en esta respuesta: no se guarda en claro
  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    success: true,
    message: 'Acceso creado. Compartí las credenciales temporales con el colaborador.',
    temp_password: tempPassword,
    expires_at: expiresAt,
  });
}
