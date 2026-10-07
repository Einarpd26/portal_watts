# Portal Watts

> **Sistema de Gestión para la Planificación de Rutas Comerciales**  
> *Caramelos Watts S.R.L. — Canal Minorista*

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ecf8e?logo=supabase)](https://supabase.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial_Engine-green?logo=postgresql)](https://postgis.net/)

---

## 1. Descripción del Proyecto

**Portal Watts** es una solución web responsive orientada a la planificación, delimitación territorial y seguimiento operativo de rutas de venta preventiva para el canal minorista de Caramelos Watts S.R.L.

El sistema resuelve la asignación semanal de preventistas a rutas geográficas, la prevención de solapamientos territoriales mediante validaciones geoespaciales nativas (PostGIS) y la consulta interactiva de puntos de venta geolocalizados con segmentación comercial ABC.

### Trazabilidad con Requisitos y Decisiones (ADR)
Este repositorio concentra **exclusivamente el código fuente ejecutable, componentes de UI y migraciones de base de datos**.

El análisis formal de requisitos, entrevistas, diagramas PUDS/UML y el catálogo de decisiones de arquitectura se gestionan en el repositorio hermano:
* 📂 **Repositorio de Documentación:** [`Ing_Req_Mod_Angelica`](../Ing_Req_Mod_Angelica/)
* 📋 **Catálogo de Decisiones:** [`ADR/README.md`](../Ing_Req_Mod_Angelica/ADR/README.md)
* 🔐 **Arquitectura de Seguridad:** [ADR-001: Identidad, Autenticación y RBAC](../Ing_Req_Mod_Angelica/ADR/ADR-001-identidad-autenticacion-y-rbac.md)

---

## 2. Orden de Construcción por Capas

El software se construye siguiendo dependencias estrictas por capas:

1. **Capa 1: Identidad Organizacional y Autenticación (Módulo 1 + IAM)**
   * Catálogo de sedes (`sucursales`), cargos y colaboradores (`personas`).
   * Historial de vigencia laboral (`asignaciones_laborales`).
   * Autenticación con Supabase Auth (`auth.users`) y control de acceso basado en roles (`roles`, `usuario_roles`) con alcance por sucursal.
2. **Capa 2: Estructura Territorial y Geoespacial (Módulo 2)**
   * Agrupadores administrativos (`zonas`) y polígonos territoriales (`rutas.localizacion`).
   * Validación espacial de no superposición (`ST_Overlaps`, índice `GiST`).
3. **Capa 3: Motor de Planificación Comercial (Módulo 3)**
   * Equipos de supervisión (`supervisor_vendedores`) y cupos de preventistas (`vendedor_slots`).
   * Itinerario transaccional semanal (`planificacion_rutas`).
4. **Capa 4: Vistas Operativas y Analítica Comercial (Módulo 4)**
   * Puntos de venta geolocalizados (`clientes`) y catálogo de `productos`.
   * Vista de calle móvil responsive y analítica nocturna (`cobertura_rutas`).

---

## 3. Estructura del Código

El proyecto sigue una arquitectura limpia orientada a separación de responsabilidades y patrón *Container/Presentational*:

```text
portal_watts/
├── docs/                      # Diagramas y notas de arquitectura interna
├── public/                    # Archivos estáticos y favicons
├── src/
│   ├── components/            # Componentes React
│   │   ├── layout/            # Estructura visual, navegación y sidebars por rol
│   │   ├── modules/           # Componentes específicos por módulo de negocio
│   │   └── ui/                # Componentes atómicos base (inputs, botones, modales)
│   ├── hooks/                 # Hooks personalizados (autenticación, permisos, mapas)
│   ├── lib/                   # Clientes de servicios externos y utilidades
│   │   └── supabase/          # Clientes de Supabase (browser client y server client)
│   ├── pages/                 # Páginas (Next.js Pages Router) y API Routes (/api/*)
│   ├── services/              # Capa de dominio, validaciones y acceso a datos
│   ├── styles/                # Estilos globales y Tailwind CSS
│   └── types/                 # Definiciones de TypeScript y tipos generados de la DB
└── supabase/
    ├── migrations/            # Migraciones SQL versionadas y reproducibles
    ├── seed.sql               # Datos semilla para pruebas locales
    └── config.toml            # Configuración local de Supabase CLI
```

---

## 4. Puesta en Marcha Local (Quickstart)

### Prerrequisitos
* [Node.js](https://nodejs.org/) v20.x o superior.
* [Docker Desktop](https://www.docker.com/) (necesario para ejecutar Supabase en local).
* [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

### Pasos de instalación

1. **Instalar dependencias de Node:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env.local
   ```
   *(Verificar que las credenciales coincidan con la salida de Supabase).*

3. **Iniciar los servicios locales de Supabase:**
   ```bash
   npx supabase start
   ```
   Este comando levantará los contenedores de PostgreSQL, PostGIS, Supabase Auth y el panel de administración local (Studio en `http://127.0.0.1:55323`).

4. **Aplicar migraciones y datos semilla:**
   ```bash
   npx supabase db reset
   ```

5. **Iniciar el servidor de desarrollo de Next.js:**
   ```bash
   npm run dev
   ```

6. **Abrir la aplicación:**
   Navegar a [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 5. Scripts Disponibles

* `npm run dev`: Inicia el servidor de desarrollo en modo watch.
* `npm run build`: Compila la aplicación para producción.
* `npm run start`: Inicia el servidor compilado de producción.
* `npm run lint`: Ejecuta el linter de ESLint para asegurar calidad de código.
* `npx supabase db reset`: Restaura la base de datos local y ejecuta todas las migraciones + semillas.

---

## 6. Convenciones de Desarrollo

* **Commits:** Seguir [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).
* **Seguridad:** Nunca commitear archivos `.env` con credenciales reales ni exponer la `SUPABASE_SERVICE_ROLE_KEY` en el navegador. Toda consulta restringida debe gobernarse mediante políticas de **Row Level Security (RLS)**.

---

## 7. Despliegue

La configuración de correo (SMTP), de redirects y de límites de Auth en Supabase Cloud está documentada en [`docs/despliegue.md`](docs/despliegue.md).
