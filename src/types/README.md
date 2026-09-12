# Guía de Tipos de Base de Datos y Dominio

> **Módulo:** `src/types/` — Portal Watts  
> **Destinatarios:** Equipo de desarrollo (Frontend, Backend y QA)  

---

## 1. La Regla de Oro ⚠️

El archivo `database.ts` se **genera automáticamente** leyendo el esquema de PostgreSQL desde Supabase CLI.

> **NUNCA edites `database.ts` manualmente.**  
> Cualquier cambio manual se perderá la próxima vez que se actualice la base de datos.

---

## 2. ¿Cómo actualizar los tipos si cambia la base de datos?

Cada vez que se aplique una nueva migración SQL o cambie una tabla:

1. Asegúrate de tener Supabase corriendo (`npx supabase start`).
2. Ejecuta en la terminal:
   ```bash
   npm run db:types
   ```
3. El archivo `database.ts` se actualizará automáticamente con las nuevas columnas y tablas.

---

## 3. ¿Cómo usar los tipos en tu código?

Para mantener el código limpio y no lidiar con tipos complejos, **importa siempre desde `@/types`** (el archivo `index.ts` ya tiene todo preparado):

### Ejemplo A: Tipar variables o estados en componentes React
```typescript
import { useState, useEffect } from 'react';
import type { Persona, Sucursal } from '@/types';

export default function ListaPersonal() {
  const [colaboradores, setColaboradores] = useState<Persona[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<Sucursal | null>(null);

  // TypeScript te autocompletará: colaborador.nombres, colaborador.ci, etc.
}
```

### Ejemplo B: Consultas tipadas con Supabase
Al usar el cliente de Supabase, las respuestas ya vienen tipadas automáticamente:

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 'data' será de tipo Persona[] | null automáticamente
const { data, error } = await supabase
  .from('personas')
  .select('*');
```

### Ejemplo C: Insertar un nuevo registro
Para inserciones, usa los tipos que terminan en `Insert` (excluyen campos automáticos como `id` y `created_at`):

```typescript
import type { PersonaInsert } from '@/types';

const nuevaPersona: PersonaInsert = {
  ci: '4892101',
  nombres: 'Einar',
  apellidos: 'Padilla Delgadillo',
  email: 'einar@example.com'
  // TypeScript te avisará si te falta un campo obligatorio
};
```

---

## 4. Tipos disponibles para la Capa 1

* **Entidades:** `Persona`, `Sucursal`, `Cargo`, `AsignacionLaboral`, `Rol`, `UsuarioRol`.
* **Para Inserciones:** `PersonaInsert`, `SucursalInsert`, `CargoInsert`, etc.
* **Para Actualizaciones:** `PersonaUpdate`, `SucursalUpdate`, `CargoUpdate`, etc.
* **Sesión de Usuario:** `UserSession` (con permisos y alcance de sucursal).

---

## 5. Protocolo del Tech Lead: Mantenimiento del Sistema de Tipos

Como responsable de la arquitectura y gobierno del modelo de datos, el Tech Lead sigue este flujo según la naturaleza del cambio en la base de datos:

### Escenario A: Se modificó una tabla existente (ej. se añadió o modificó una columna)
1. Aplicar los cambios en local (`npx supabase db reset`).
2. Regenerar el contrato técnico:
   ```bash
   npm run db:types
   ```
3. **No se toca `index.ts`:** Los tipos amigables (`Persona`, `Sucursal`, etc.) heredan las columnas nuevas automáticamente por referencia.

### Escenario B: Se creó una TABLA NUEVA (ej. al avanzar de capa: `zonas`, `rutas`)
1. Aplicar la nueva migración en local (`npx supabase db reset`).
2. Regenerar el contrato técnico:
   ```bash
   npm run db:types
   ```
3. **Exponer la nueva entidad en `src/types/index.ts`:**
   Añadir las líneas de conveniencia para que el equipo pueda importarlas limpiamente:
   ```typescript
   export type Zona = Database['public']['Tables']['zonas']['Row'];
   export type ZonaInsert = Database['public']['Tables']['zonas']['Insert'];
   export type ZonaUpdate = Database['public']['Tables']['zonas']['Update'];
   ```
4. Guardar los cambios con un commit semántico:
   ```bash
   git add src/types/database.ts src/types/index.ts
   git commit -m "chore(types): actualizar tipos para tabla zonas"
   ```

