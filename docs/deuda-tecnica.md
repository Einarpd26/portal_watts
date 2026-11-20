# Deuda técnica

Lista de mejoras conocidas que no bloquean el avance del producto. Cada ítem dice qué falta, por qué importa y cuándo conviene resolverlo.

## DT-01. Servidor SMTP propio para el correo de Auth

- **Fecha:** 12 de octubre de 2026
- **Estado:** pendiente
- **Qué falta:** configurar un servidor SMTP real para Supabase Auth. Hoy el bloque `[auth.email.smtp]` de `supabase/config.toml` está comentado.
- **Por qué importa:** en local los correos los atrapa Inbucket (puerto 54444) y alcanza. En el proyecto remoto, sin SMTP propio Supabase usa su servidor por defecto: unos 2 correos por hora y solo a miembros del equipo. Eso limita la recuperación de contraseña y la invitación de usuarios.
- **Propuesta:** Resend (`smtp.resend.com:465`, plan gratuito de 3.000 correos al mes), con dominio verificado (SPF y DKIM). Alternativa sin dominio propio: Brevo con remitente verificado.
- **Pasos:**
  1. Descomentar `[auth.email.smtp]` en `supabase/config.toml` con `pass = "env(RESEND_API_KEY)"`.
  2. Guardar `RESEND_API_KEY` en `supabase/.env` (fuera del control de versiones).
  3. Cargar la misma configuración en el proyecto remoto (panel de Authentication o `supabase config push`).
  4. Decidir si se agrega la plantilla de invitación (`invite`), además de la de recuperación que ya existe.
  5. Probar invitando un usuario real en el remoto.
- **Decisión pendiente:** si hay un dominio propio para el remitente; de eso depende el proveedor.
- **Cuándo:** antes de poner el portal en uso real con usuarios externos.

## DT-02. Ícono PWA de 512×512

- **Estado:** pendiente
- **Qué falta:** `public/manifest.json` usa `icon-watts.png` de 192×192 como único ícono. Falta una versión de 512×512 para una pantalla de bienvenida de mejor calidad al instalar en el celular.
- **Impacto:** no bloqueante; la instalación funciona sin ella (RNF-06).
- **Referencia:** `docs/diseno/tokens-de-marca.md`.

## DT-03. Dos librerías para generar Excel

- **Fecha:** 20 de noviembre de 2026
- **Estado:** aceptada (riesgo aceptado por el plazo de la entrega del Ciclo 4)
- **Qué falta:** unificar en una sola librería. Hoy `write-excel-file` genera en el navegador el informe de importación de rutas (CU-16, `src/lib/descargarInformeExcel.ts`) y `exceljs` genera en el servidor los tres reportes del Ciclo 4 (`src/lib/reporteExcel.ts`, ADR-005 D6).
- **Por qué importa:** son dos dependencias para lo mismo. `exceljs` pesa unos 23 MB (contra 2,9 MB de `write-excel-file`) y arrastra `uuid` con una vulnerabilidad moderada: `npm audit` informa 2 avisos moderados, que son los únicos que quedan.
- **Por qué se acepta:** `uuid` se usa solo del lado servidor, al armar el archivo, y no recibe datos del usuario. El arreglo que propone `npm audit --force` baja `exceljs` a la 3.4.0, una regresión de versión mayor que no se justifica.
- **Propuesta:** migrar `reporteExcel.ts` a `write-excel-file/node`, comprobar que soporta el formato de los reportes (colores por tramo, fila resaltada de «Duplicada», anchos y fila fija de encabezado), probar los tres reportes con la pasada de API (`evidencia-api-ciclo4.py`) y abrir un archivo real en Excel. Después quitar `exceljs`.
- **Cuándo:** después de la entrega del Ciclo 4, antes del uso con usuarios reales.
