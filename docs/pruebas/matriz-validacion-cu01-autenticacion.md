# Matriz de Pruebas de Validación — CU-01: Iniciar y Cerrar Sesión

> **Proyecto:** Portal Watts (Caramelos Watts S.R.L. — Canal Minorista)  
> **Caso de Uso:** CU-01: Iniciar sesión & Cierre de sesión  
> **Ciclo de Desarrollo:** Ciclo # 1 — Adm Usuario y CU Base  
> **Responsable de QA:** Daniel Acosta (QA, Testing & Release Manager)  
> **Norma/Metodología:** Proceso Unificado (PUDS) / Pruebas de Caja Negra y Seguridad de Sesión  

---

## 1. Alcance y Criterios de Aceptación

Para dar por **validado** el inicio y cierre de sesión de acuerdo con la especificación formal de casos de uso ([`especificacion-casos-de-uso.md`](file:///home/einar/Proyectos_Dev/UAGRM/Ing_Req_Mod_Angelica/02_proyecto/04_modelado/casos-de-uso/especificacion-casos-de-uso.md#L7-L30)), el sistema debe cumplir con:

1. **Validación en Cliente y Servidor:** Ningún formulario debe enviar datos vacíos ni formatos de correo inválidos.
2. **Control de Estado de Colaborador (CU-01 Flujo A2):** Cuentas con `fecha_baja` o sin asignación de perfil activa no pueden acceder ni mantener sesiones abiertas en memoria o cookies.
3. **Control de Contraseñas Temporales (CU-01 Flujo A3):** Cuentas con clave temporal deben cambiarla obligatoriamente antes de acceder a cualquier función; si venció el plazo de 72 horas, la sesión se revoca automáticamente.
4. **Cierre de Sesión Seguro (Logout):** Invalida cookies HttpOnly, limpia el estado de React en memoria y redirige con reemplazo de historial (`router.replace`) para neutralizar el botón "Atrás" del navegador.
5. **Guardia de Rutas y Navegación Protegida:** Bloqueo perimetral en middleware Edge (`src/proxy.ts`) y guardia reactivo en cliente (`AppLayout.tsx`).

---

## 2. Matriz de Casos de Prueba Funcionales

| ID | Escenario / Prueba | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
|:---:|---|---|---|---|:---:|
| **CP-01** | Inicio de sesión válido — Rol Administrativo | `gerencia@carameloswatts.com`<br/>Contraseña válida | Autenticación exitosa en Supabase, sincronización de perfil (`/api/auth/me`) y redirección directa a `/admin/usuarios`. | Usuario autenticado, cookie HttpOnly persistida y redirigido a `/admin/usuarios`. | **APROBADO** |
| **CP-02** | Inicio de sesión válido — Rol Operativo | Correo de Supervisor o Vendedor<br/>Contraseña válida | Autenticación exitosa y redirección a `/dashboard` con pantalla informativa de módulo en construcción. | Sesión activa, vista de dashboard con permisos asignados. | **APROBADO** |
| **CP-03** | Envío de formulario con campos vacíos | Email: `""`<br/>Password: `""` | Bloqueo previo al submit, borde rojo en inputs y mensajes: *"Ingresa tu correo institucional"* y *"Ingresa tu contraseña"*. | Bloqueado en cliente sin petición de red innecesaria. | **APROBADO** |
| **CP-04** | Formato de correo electrónico inválido | `gerencia`<br/>`usuario@`<br/>`sin_arroba.com` | Bloqueo en cliente con mensaje: *"Ingresa un formato de correo válido (ej. usuario@carameloswatts.com)"*. | Error mostrado en el input de correo, submit cancelado. | **APROBADO** |
| **CP-05** | Credenciales incorrectas (A1) | `usuario@carameloswatts.com`<br/>Password incorrecto | Alerta roja en la cabecera: *"Correo o contraseña incorrectos."* Botón habilitado para reintento. | Mensaje de error controlado sin revelar datos internos de base de datos. | **APROBADO** |
| **CP-06** | Usuario inactivo / dado de baja (A2) | Credenciales de persona con `fecha_baja` registrada | Denegación inmediata de acceso, destrucción de sesión Supabase (`signOut`) y alerta: *"Tu cuenta se encuentra inactiva o dada de baja"*. | Sesión revocada, usuario retenido en `/login` con explicación visual. | **APROBADO** |
| **CP-07** | Primer login con contraseña temporal (A3) | Credenciales temporales generadas en CU-02 (< 72h) | Acceso restringido y redirección obligatoria a `/cambiar-password`. Se exige mayúscula, minúscula, número y ≥ 8 caracteres. | Redirección inmediata a pantalla de cambio obligatorio. | **APROBADO** |
| **CP-08** | Contraseña temporal vencida (A3) | Credenciales temporales con > 72 horas de antigüedad | Sesión cerrada en middleware/servidor y redirección al login con aviso: *"Tu contraseña temporal expiró"*. | Redirigido a `/login?error=temp_password_expired`. | **APROBADO** |
| **CP-09** | Cierre de sesión voluntario (Logout) | Click en *"Cerrar sesión"* (Navbar escritorio o cajón móvil) | Invalidación de cookies de sesión, estado de usuario en `null`, botón pasa a *"Cerrando..."* y redirección a `/login`. | Cookies eliminadas, vista de login desplegada. | **APROBADO** |
| **CP-10** | Protección anti-retorno (Botón "Atrás" post-logout) | Usuario cierra sesión y pulsa flecha *"Atrás"* del navegador | Guardia de cliente (`AppLayout`) y proxy detectan sesión ausente y expulsan de inmediato a `/login` sin mostrar datos residuales. | Redirección automática a `/login`, sin pantallas blancas ni fuga de datos. | **APROBADO** |

---

## 3. Pruebas Unitarias Automatizadas

Las pruebas funcionales de validación de entradas, política de contraseñas y ciclo de vida de claves temporales están integradas en la suite automatizada del proyecto:

- **Archivo de pruebas:** [`tests/authValidation.test.ts`](file:///home/einar/Proyectos_Dev/UAGRM/portal_watts/tests/authValidation.test.ts)
- **Comando de ejecución:** `npm test`
- **Resultados:** 7 pruebas unitarias ejecutadas con éxito (0 fallas).
