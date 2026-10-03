import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient, createServerClientForReqRes } from '@/lib/supabase/server';
import { validatePassword } from '@/utils/passwordPolicy';
import { getPasswordChangeState, TEMP_PASSWORD_EXPIRED } from '@/utils/passwordChange';
import { registrarBitacora } from '@/lib/bitacora';

// CU-01 A3 — Cambio obligatorio de la contraseña temporal en el primer inicio de sesión
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createServerClientForReqRes(req, res);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return res.status(401).json({ error: 'No autenticado' });

  const state = getPasswordChangeState(user.app_metadata);
  if (state === 'expired') {
    return res.status(403).json({ error: 'La contraseña temporal expiró', code: TEMP_PASSWORD_EXPIRED });
  }
  if (state === 'none') {
    return res.status(400).json({ error: 'No tenés un cambio de contraseña pendiente' });
  }

  const { password } = req.body as { password?: string };
  if (!password) return res.status(400).json({ error: 'La contraseña es requerida' });

  const validation = validatePassword(password);
  if (!validation.valid) {
    return res.status(400).json({ error: `Contraseña inválida: ${validation.errors.join(', ')}` });
  }

  // La nueva contraseña no puede ser la temporal: si iniciar sesión con ella funciona, es la misma
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: sameError } = await probe.auth.signInWithPassword({ email: user.email ?? '', password });
  if (!sameError) {
    return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la temporal' });
  }

  // Cambia la contraseña y baja la marca en una sola operación (service role)
  const { error: updateError } = await createAdminClient().auth.admin.updateUserById(user.id, {
    password,
    app_metadata: { must_change_password: false, temp_password_expires_at: null },
  });

  if (updateError) {
    console.error('Error cambiando contraseña:', updateError);
    return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }

  // Registrar auditoría en bitácora (UTC 0)
  const { data: persona } = await supabase
    .from('personas')
    .select('id, email, usuario_roles(roles(codigo))')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const rolesArray = Array.isArray(persona?.usuario_roles)
    ? persona?.usuario_roles
    : persona?.usuario_roles ? [persona.usuario_roles] : [];
  const userRol = rolesArray[0]?.roles?.codigo ?? null;

  await registrarBitacora(
    {
      id_persona: persona?.id ?? null,
      auth_user_id: user.id,
      usuario_email: persona?.email || user.email || 'desconocido@carameloswatts.com',
      usuario_rol: userRol,
      modulo: 'AUTENTICACION',
      accion: 'CAMBIO_PASSWORD',
      descripcion: 'Actualización obligatoria de contraseña temporal completada exitosamente',
    },
    req
  );

  return res.status(200).json({ success: true });
}
