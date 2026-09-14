# Acta de Reunión N° 01 — Planificación de Sprint (Capa 1)

> **Proyecto:** Portal Watts (Caramelos Watts S.R.L. — Canal Minorista)  
> **Fecha:** Domingo, 13 de Septiembre de 2026  
> **Horario:** 19:00 a 19:30 (30 minutos)  
> **Modalidad:** Virtual (Videollamada)  
> **Objetivo del Sprint:** Despliegue de la Capa 1 (Autenticación, RBAC y Estructura Organizacional)

---

## 1. Asistencia y Convocatoria

| Integrante                         | Rol en el Proyecto               | Estado de Asistencia |
| ---------------------------------- | -------------------------------- | :------------------: |
| **Padilla Delgadillo Einar**       | Tech Lead & Product Owner        |      Convocado       |
| **Machaca Guarachi Marco Antonio** | Backend & Infraestructura        |      Convocado       |
| **Acosta Roca Daniel**             | QA, Testing & Release Manager    |      Convocado       |
| **Tiquisara Huanca Carlos Angel**  | Frontend & UI/UX Developer       |      Convocado       |
| **Mendoza Paucara Alan William**   | Frontend SIG & Documentador PUDS |      Convocado       |

---

## 2. Agenda de la Sesión (30 minutos)

1. **Demostración en Vivo y Herramientas (10 min):**
   - El Tech Lead presenta el estado de la base de datos local corriendo con Supabase CLI.
   - Ejecución de `npx supabase db reset` para mostrar la creación de las 6 tablas y los datos semilla en Supabase Studio (`http://127.0.0.1:54323`).
   - **Capacitación rápida de entorno:** Enseñar al equipo a usar la previsualización nativa de Markdown en Visual Studio Code (`Ctrl+Shift+V` o `Ctrl+K V` en vista dividida) para que puedan leer cómodamente las actas, las especificaciones PUDS y las guías de tipos.
2. **Definición de Meta del Sprint (5 min):**
   - Presentación de la meta semanal: Contar con inicio de sesión funcional (CU-01), permisos por sucursal y estructura base de navegación.
3. **Asignación de Tareas por Rol (10 min):**
   - Revisión detallada de las fichas de trabajo individual para la semana.
4. **Acuerdos Operativos y Cierre (5 min):**
   - Recordatorio del canal de comunicación y confirmación de la sesión de control presencial del miércoles a las 07:00 en la universidad.

---

## 3. Asignación Individual de Tareas para la Semana

### 3.1. Marco Antonio Machaca — Backend & Infraestructura

- **Misión de la semana:** Clonar el entorno local en su computadora, validar el flujo de usuarios en Supabase Auth y asistir al equipo como Embajador de Supabase.
- **Tareas Técnicas Concretas:**
  1. Ejecutar `git pull` en su estación de trabajo y verificar la puesta en marcha local mediante `npx supabase start` y `npx supabase db reset`.
  2. Investigar y probar el método administrativo de creación de usuarios en Supabase (`supabase.auth.admin.createUser`) para el caso de uso CU-02.
  3. Comprobar la vinculación entre la cuenta generada en `auth.users` y el registro correspondiente en la tabla `personas` mediante el campo `auth_user_id`.
  4. **Mentoría y Soporte Técnico al Equipo:** Asistir a los compañeros de grupo en la instalación y configuración de Supabase CLI en sus respectivas máquinas, coordinando breves reuniones individuales (1 a 1) para enseñarles los comandos básicos (`start`, `status`, `db reset`) y resolver cualquier duda de Docker o puertos.
- **Criterio de Éxito (Definition of Done):**
  - Un usuario de prueba en `personas` cuenta con credenciales activas en `auth.users` y permite autenticación válida; todos los integrantes del equipo tienen Supabase CLI corriendo en sus computadoras con la asistencia de Marco.

---

### 3.2. Carlos Angel Tiquisara — Frontend & UI/UX Developer

- **Misión de la semana:** Maquetar la interfaz de inicio de sesión (CU-01) y la estructura base de navegación.
- **Tareas Técnicas Concretas:**
  1. Construir el componente de navegación superior (`src/components/layout/Navbar.tsx`) con logotipo de Watts y tipografía corporativa.
  2. Maquetar la página de Login en `src/pages/login.tsx` utilizando Tailwind CSS:
     - Formulario con campos de correo electrónico y contraseña.
     - Botón de envío con estado de carga visual (_spinner / deshabilitado_).
     - Contenedor de alertas para visualización de errores de autenticación.
  3. Garantizar diseño _mobile-first_ plenamente utilizable en teléfonos inteligentes.
- **Criterio de Éxito (Definition of Done):**
  - Pantalla de inicio de sesión completamente responsiva, lista para enlazar con el evento `onSubmit` del cliente de autenticación.

---

### 3.3. Daniel Acosta — QA, Testing & Release Manager

- **Misión de la semana:** Establecer el arnés de pruebas automatizadas y auditar los contratos de datos de la Capa 1.
- **Tareas Técnicas Concretas:**
  1. Instalar y configurar el entorno de pruebas con Playwright (`@playwright/test`) en `package.json`.
  2. Implementar una suite de pruebas estáticas para verificar que el archivo `src/types/database.ts` exponga las 6 tablas del esquema y sus columnas clave.
  3. Redactar la matriz de casos de prueba funcional para el Login (evaluación de contraseñas vacías, correos inexistentes, credenciales inválidas y bloqueos).
- **Criterio de Éxito (Definition of Done):**
  - El comando `npm run test` ejecuta y aprueba la primera suite de verificación de integridad y contratos de la base de datos.

---

### 3.4. Alan William Mendoza — Frontend SIG & Documentador PUDS

- **Misión de la semana:** Sincronizar la documentación académica formal y preparar la prueba de concepto de mapas.
- **Tareas Técnicas Concretas:**
  1. Revisar en el repositorio `Ing_Req_Mod_Angelica` las especificaciones de CU-01 (Iniciar sesión), CU-02 (Gestionar cuentas) y CU-03 (Gestionar personal comercial), asegurando que los nombres de atributos coincidan estrictamente con la migración DDL aprobada.
  2. Crear un componente de prueba de concepto en `src/components/map/MapPreview.tsx` integrando la librería Leaflet para renderizar un mapa centrado en Santa Cruz de la Sierra.
- **Criterio de Éxito (Definition of Done):**
  - Casos de uso de Capa 1 actualizados sin discrepancias de nombres y mapa preliminar visible en pantalla sin errores de renderizado del lado del servidor (SSR).

---

### 3.5. Padilla Delgadillo Einar — Tech Lead & Product Owner

- **Misión de la semana:** Arquitectura de sesión, middleware de seguridad y acompañamiento técnico.
- **Tareas Técnicas Concretas:**
  1. Generar y mantener versionados los tipos de base de datos (`src/types/database.ts`).
  2. Implementar los clientes de Supabase (`client.ts` y `server.ts`) bajo patrón singleton.
  3. Diseñar el guardia de rutas en `src/middleware.ts` para redirección automática según rol y alcance territorial.
  4. Capacitar al equipo durante la llamada en el uso de la previsualización de Markdown en VS Code (atajo `Ctrl+Shift+V` y vista dividida `Ctrl+K V`).
  5. Atender consultas técnicas y conducir la sesión presencial de resolución de bloqueos.

---

## 4. Pautas de Comunicación y Gestión de Impedimentos

1. **Regla de los 45 minutos:** Si un integrante permanece bloqueado por un error técnico o duda de lógica por más de 45 minutos, es mandatario que comparta el problema en el canal de comunicación del equipo en lugar de detener su avance.
2. **Próxima Sesión de Control Presencial:**
   - **Fecha:** Miércoles, 16 de Septiembre de 2026.
   - **Horario:** 07:00 a 07:30 (Presencial en predios universitarios).
   - **Propósito:** Revisión conjunta de código, resolución de dudas presenciales y preparación de las integraciones previas al fin de semana.

---

## 5. Acuerdos y Notas Tomadas durante la Sesión

_(Espacio para registrar notas, acuerdos adicionales o ajustes de plazos durante el desarrollo de la reunión)._

- **Nota 1:** Reasignación acordada después de la reunión: **Carlos Angel Tiquisara** asume el rol de Frontend & UI/UX Developer e **Alan William Mendoza** asume el de Frontend SIG & Documentador PUDS (secciones 3.2 y 3.4 ajustadas en consecuencia).
- **Nota 2:** 
- **Nota 3:**
