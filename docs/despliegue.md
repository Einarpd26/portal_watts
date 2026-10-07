# Despliegue: correo (SMTP) y configuración de Auth en Supabase Cloud

## Por qué importa

En local, `supabase start` levanta un servidor de correo de prueba (Mailpit, `[inbucket]` en `supabase/config.toml`) que **captura** los correos sin enviarlos. En Supabase Cloud no existe: los correos salen por SMTP real.

El servicio de correo por defecto de Supabase es solo para pruebas (según su documentación: 2 correos por hora, sin garantías). Con eso la recuperación de contraseña deja de funcionar con unos pocos usuarios, así que **producción necesita un proveedor SMTP propio**. Con SMTP propio configurado, Supabase aplica inicialmente un límite de 30 correos por hora, ajustable. Confirmá las cifras vigentes en la documentación de Supabase antes de planificar.

## Antes de empezar (no se automatiza)

1. Cuenta en un proveedor de correo transaccional (Resend, SendGrid, Postmark, AWS SES, etc.).
2. Verificar tu dominio en el proveedor (registros DNS SPF y DKIM) para que los correos no caigan en spam.
3. Generar las credenciales SMTP (host, puerto, usuario, contraseña o API key).
4. Crear un token en Supabase (`https://supabase.com/dashboard/account/tokens`) y exportarlo como `SUPABASE_ACCESS_TOKEN`.

## Pasos con `supabase config push`

1. Enlazar el proyecto: `npx supabase link --project-ref <ref>`.
2. Descomentar y completar el bloque SMTP de `supabase/config.toml`. Las credenciales van por variable de entorno, nunca en el repo:

   ```toml
   [auth.email.smtp]
   enabled = true
   host = "smtp.tu-proveedor.com"
   port = 587
   user = "tu-usuario"
   pass = "env(SMTP_PASSWORD)"
   admin_email = "no-reply@tu-dominio.com"
   sender_name = "Portal Watts"
   ```

3. Ajustar `[auth.rate_limit] email_sent`: hoy vale `2` y **solo aplica cuando el bloque SMTP está activo**. Si se publica así, el sistema enviaría 2 correos por hora. Subirlo a un valor acorde al número de usuarios.
4. Exportar el secreto y publicar: `SMTP_PASSWORD=... npx supabase config push`. La CLI envía la configuración de Auth, incluidos SMTP y los templates (`content_path`, como `supabase/templates/recovery.html`). Revisá lo que informa que va a cambiar antes de aceptar.
5. En CI/CD, guardar `SUPABASE_ACCESS_TOKEN` y `SMTP_PASSWORD` como secretos del pipeline y ejecutar el mismo comando.

Alternativa por script: `PATCH https://api.supabase.com/v1/projects/<ref>/config/auth` con `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass`, `smtp_admin_email`, `smtp_sender_name` y `mailer_templates_recovery_content`.

## Valores de `config.toml` que NO deben viajar tal cual a producción

`config push` publica lo declarado en el archivo. Hoy contiene valores de desarrollo:

| Clave | Valor local | En producción |
|---|---|---|
| `[auth] site_url` | `http://127.0.0.1:3000` | Dominio real de la app |
| `[auth] additional_redirect_urls` | `localhost` y `127.0.0.1` (3000 y 3001) | Solo el dominio real; el correo de recuperación redirige a `<dominio>/auth/reset-password` y, si no está permitido, Supabase manda al usuario al `site_url` |
| `[auth.rate_limit] sign_in_sign_ups` | `30` | Mantener: es la barrera contra fuerza bruta directa a Supabase Auth (ADR-001 §G, punto 6) |

Para no pisar producción con valores locales, usá un `config.toml` o bloques de override por entorno (la CLI soporta `[remotes.<nombre>]`; confirmá la sintaxis en su documentación) y un proyecto Supabase separado para pruebas y otro para producción.

## Variables de entorno de la aplicación

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `NEXT_PUBLIC_APP_URL` y `TRUSTED_PROXY_HOPS` (número de proxys de confianza delante de la app; si queda en 0 detrás de un proxy, el bloqueo de login degrada a "por cuenta"). Ver `.env.example`.

## Verificación posterior al despliegue

1. Pedir recuperación de contraseña con una cuenta real: el correo debe llegar.
2. El enlace del correo debe apuntar a `<tu dominio>/auth/reset-password`.
3. El código de 6 dígitos debe validarse y permitir definir la contraseña nueva.
4. Las migraciones se aplican con `supabase db push`; `seed.sql` es solo de desarrollo.
