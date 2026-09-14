# Estructura Organizacional, Roles y Dinámica de Trabajo

> **Portal Watts — Sistema de Gestión para la Planificación de Rutas Comerciales**  
> _Caramelos Watts S.R.L. — Canal Minorista_  
> Asignatura: **Ingeniería de Requisitos y Modelado I (INF-219)** — UAGRM

---

## 1. Introducción y Propósito

El presente documento formaliza la estructura organizativa, el reparto de responsabilidades y las normas de ingeniería de software para el equipo de desarrollo de **Portal Watts**, conformado por cinco integrantes de la carrera de Ingeniería Informática.

El modelo operativo adopta una estructura ágil orientada a especialización funcional, asegurando simultáneamente la excelencia técnica en la construcción del software ejecutable y el cumplimiento riguroso de los entregables académicos del Proceso Unificado (PUDS).

---

## 2. Matriz de Roles y Responsabilidades

| Rol Principal                        | Responsable Asignado               | Enfoque Primario             | Entregables Clave                                                                         |
| ------------------------------------ | ---------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| **Tech Lead & Product Owner**        | `[Padilla Delgadillo Einar]`       | Arquitectura, Negocio y Core | Arquitectura base, middleware, coordinación de capas y code review final.                 |
| **Backend & Infraestructura**        | `[Machaca Guarachi Marco Antonio]` | Motor de Datos y Supabase    | Migraciones SQL, Supabase CLI, semillas (`seed.sql`), Auth IAM y despliegue.              |
| **QA, Testing & Release Manager**    | `[Acosta Roca Daniel]`             | Calidad y Validación         | Pruebas automatizadas, validación de criterios de aceptación y control de versiones.      |
| **Frontend & UI/UX Developer**       | `[Tiquisara Huanca Carlos Angel]`  | Vistas y Componentes Web     | Layouts, componentes visuales, sidebars, tablas interactivas y formularios.               |
| **Frontend SIG & Documentador PUDS** | `[Mendoza Paucara Alan William]`   | Mapas y Academia             | Integración con Leaflet/PostGIS, sincronización con `Ing_Req_Mod_Angelica` y entregables. |

---

## 3. Detalle de Perfiles y Obligaciones

### 3.1. Tech Lead & Product Owner (Líder Técnico y de Negocio)

- **Responsable:** Padilla Delgadillo Einar
- **Objetivo del Rol:** Conducir la visión global del producto, traducir las reglas comerciales en especificaciones técnicas ejecutables y garantizar la coherencia arquitectónica entre todas las capas.
- **Obligaciones y Funciones:**
  1. **Dirección de Dominio:** Definir y priorizar las historias de usuario y requerimientos funcionales, asegurando que el software resuelva con fidelidad la operativa comercial de Caramelos Watts S.R.L.
  2. **Diseño Arquitectónico:** Diseñar las soluciones técnicas de alta complejidad (algoritmo de planificación semanal de Capa 3, middleware de seguridad y gestión de sesiones).
  3. **Aprobación de Integración (Code Review):** Revisar y autorizar de forma obligatoria la incorporación de cambios a la rama principal (`main`).
  4. **Desbloqueo Técnico:** Actuar como facilitador senior ante cualquier impedimento de diseño, base de datos o lógica que detenga a algún miembro del equipo.

---

### 3.2. Ingeniero de Backend e Infraestructura ("Embajador de Supabase")

- **Responsable:** Machaca Guarachi Marco Antonio
- **Objetivo del Rol:** Dominar la plataforma Supabase, asegurar la reproducibilidad de la base de datos PostgreSQL y administrar la capa de autenticación y servicios de red.
- **Obligaciones y Funciones:**
  1. **Gobernanza de Supabase CLI:** Dominar y dar soporte al equipo en el uso de comandos locales (`npx supabase start`, `db reset`, `migration new`).
  2. **Gestión de Persistencia:** Garantizar que todas las tablas, restricciones, enums e índices queden registrados en migraciones versionadas y reproducibles.
  3. **Datos de Prueba (`seed.sql`):** Mantener un dataset de prueba consistente y representativo para que los desarrolladores de frontend puedan trabajar sin bloqueos.
  4. **Seguridad IAM:** Configurar y auditar la integración con Supabase Auth (`auth.users`), manejo de tokens JWT y roles del sistema.
  5. **Despliegue y DevOps:** Gestionar las variables de entorno de producción y coordinar el despliegue del backend en los entornos definitivos.

---

### 3.3. Ingeniero de Calidad de Software, Testing y Release Management (QA)

- **Responsable:** Acosta Roca Daniel
- **Objetivo del Rol:** Salvaguardar la estabilidad funcional, la integridad de los contratos de API y la prevención de regresiones en el sistema.
- **Obligaciones y Funciones:**
  1. **Automatización de Pruebas:** Diseñar e implementar suites de pruebas automáticas (contratos de API, validaciones estáticas y flujos críticos de usuario).
  2. **Verificación de Criterios de Aceptación:** Evaluar de forma exhaustiva cada funcionalidad antes de su cierre, sometiendo las interfaces a pruebas de límites y validación de errores.
  3. **Control de Calidad en PRs:** Auditar que el código propuesto en cada rama cumpla con las convenciones de tipado estricto, no contenga código muerto y compile exitosamente.
  4. **Gobernanza de Versionado:** Velar por el cumplimiento del estándar de commits convencionales y la correcta nomenclatura de ramas en Git.

---

### 3.4. Desarrollador Frontend & UI/UX (Componentes y Páginas de Negocio)

- **Responsable:** Tiquisara Huanca Carlos Angel
- **Objetivo del Rol:** Transformar los casos de uso transaccionales en interfaces web intuitivas, rápidas y visualmente atractivas con Next.js y Tailwind CSS.
- **Obligaciones y Funciones:**
  1. **Construcción de Componentes Base:** Desarrollar los bloques atómicos reutilizables del sistema (botones, modales, campos de formulario, badges de estado) en `src/components/ui/`.
  2. **Vistas de Negocio:** Construir las páginas operativas correspondientes a la gestión de cuentas, personal, catálogos y tablas de asignación.
  3. **Diseño Responsive:** Garantizar que cada pantalla sea plenamente operable tanto en monitores de escritorio (oficina) como en teléfonos móviles (campo).
  4. **Integración con Servicios:** Consumir las funciones del SDK de Supabase respetando los contratos tipados de TypeScript establecidos en el proyecto.

---

### 3.5. Desarrollador Frontend SIG (Mapas) & Coordinador de Documentación PUDS

- **Responsable:** Mendoza Paucara Alan William
- **Objetivo del Rol:** Liderar la visualización cartográfica territorial del software y custodiar la integridad académica de los entregables PUDS.
- **Obligaciones y Funciones:**
  1. **Especialización Geoespacial (SIG):** Desarrollar la integración con Leaflet/OpenStreetMap para el renderizado de polígonos territoriales (rutas) y pines geolocalizados (clientes ABC).
  2. **Sincronización de Requisitos:** Asegurar la trazabilidad permanente entre el código fuente de `portal_watts` y la especificación funcional en `Ing_Req_Mod_Angelica`.
  3. **Entregables Académicos:** Redactar y actualizar las especificaciones de casos de uso (CU-01 a CU-13), diagramas de secuencia, clases y actas de validación exigidas por la cátedra universitaria.
  4. **Documentación Técnica Interna:** Mantener actualizados los diagramas y notas de arquitectura ubicados en `portal_watts/docs/`.

---

## 4. Normas de Trabajo y Dinámica de Ingeniería

### 4.1. Estrategia de Ramas en Git

El equipo opera bajo un flujo de trabajo basado en ramas temáticas (_Feature Branch Workflow_):

- **`main` (Producción / Integración Continua):** Rama protegida. Todo código presente en `main` debe compilar sin advertencias ni errores y tener las migraciones sincronizadas.
- **`feat/<capa>-<modulo>`:** Ramas individuales para nuevas funcionalidades (ejemplo: `feat/capa1-ddl-migracion`, `feat/capa1-login-ui`).
- **`fix/<incidencia>`:** Ramas destinadas a la corrección de errores identificados en pruebas.

> **Regla de oro:** Ningún integrante del equipo tiene permitido realizar `push` directo a la rama `main`. Toda integración requiere un Pull Request aprobado por el Tech Lead.

---

### 4.2. Definición de Terminado (_Definition of Done - DoD_)

Una tarea, pantalla o migración se considera oficialmente finalizada únicamente cuando:

1. El código compila limpiamente mediante `npm run build`.
2. Las pruebas automáticas de la funcionalidad ejecutan con éxito (`npm run test`).
3. La migración SQL (si aplica) se ejecuta sin fallos tras un `npx supabase db reset`.
4. El responsable de QA ha validado manualmente los criterios de aceptación.
5. El Tech Lead ha revisado y aprobado el Pull Request correspondiente.

---

### 4.3. Calendario de Reuniones y Ceremonias de Sincronización

A fin de mantener la agilidad y evitar asincronías o bloqueos prolongados, el equipo establece un régimen fijo de dos reuniones periódicas semanales de corta duración (**15 a 30 minutos**):

1. **Sesión de Planificación y Cierre Semanal (Domingos — 19:00 a 19:30, Modalidad Virtual):**
   - **Formato:** Videollamada virtual.
   - **Objetivo:** Evaluar el avance del sprint que finaliza, constatar la integración en `main`, revisar el estado de los entregables y definir las asignaciones de trabajo prioritarias para la semana entrante.
2. **Sesión de Control y Desbloqueo Técnico (Miércoles — 07:00 a 07:30, Modalidad Presencial):**
   - **Formato:** Presencial (en predios universitarios).
   - **Objetivo:** Seguimiento del progreso a mitad de semana, revisión conjunta de dudas técnicas, demostraciones preliminares y resolución inmediata de cualquier bloqueo arquitectónico o de base de datos con el Tech Lead.

#### Dinámica de las Sesiones (Formato Standup)

Para asegurar el estricto cumplimiento de la ventana de tiempo (máximo 30 minutos), cada integrante interviene de forma puntual respondiendo a tres ejes directos:

1. _¿Qué tareas y avances completó desde la sesión previa?_
2. _¿Qué componentes, pantallas o migraciones abordará en el siguiente intervalo?_
3. _¿Qué impedimentos técnicos, dudas de negocio o dependencias de otros roles frenan su progreso?_

#### Hitos de Cierre de Capa (Milestone Demo)

Al concluir cada una de las 4 capas de desarrollo del sistema, se programa una sesión especial de validación integral donde el equipo ejecuta un recorrido completo (_end-to-end_) para comprobar que los entregables funcionales y los documentos de requisitos se encuentran plenamente alineados antes de avanzar al siguiente nivel.
