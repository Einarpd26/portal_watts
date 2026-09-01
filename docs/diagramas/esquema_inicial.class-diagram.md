# Diagrama de clases — esquema inicial

Derivado de `supabase/migrations/20260830051823_esquema_inicial.sql`. Fuente de verdad del diagrama: [`esquema_inicial.class-diagram.mmd`](./esquema_inicial.class-diagram.mmd) (este archivo la embebe para previsualizarla en VS Code).

```mermaid
classDiagram
    direction LR

    class sucursales {
        +bigint id  PK
        +string nombre_sucursal
        +string ciudad
        +datetime created_at
        +datetime updated_at
    }

    class usuarios {
        +uuid id  PK, FK→auth.users
        +string nombre_completo
        +string rol
        +date fecha_incorporacion
        +date fecha_baja
        +boolean activo
        +datetime created_at
        +datetime updated_at
    }

    class zonas {
        +bigint id  PK
        +string codigo_zona
        +string zona
        +string descripcion_zona
        +string canal_venta
        +datetime created_at
        +datetime updated_at
    }

    class rutas {
        +bigint id  PK
        +string codigo_ruta
        +string ruta
        +string descripcion_ruta
        +string dias_ruta
        +string localizacion
        +datetime created_at
        +datetime updated_at
    }

    class supervisor_zonas {
        +bigint id  PK
        +datetime created_at
    }

    class supervisor_vendedores {
        +bigint id  PK
        +datetime created_at
    }

    class vendedor_slots {
        +bigint id  PK
        +string nombre
        +int orden
        +datetime created_at
        +datetime updated_at
    }

    class planificacion_rutas {
        +bigint id  PK
        +date vigente_hasta
        +string frecuencia_visita
        +datetime created_at
        +datetime updated_at
    }

    class clientes {
        +bigint id  PK
        +string codigo_cliente
        +string nombre_completo
        +string direccion
        +string referencia
        +string rubro
        +string nombre_comercial
        +string nit
        +string telefono
        +decimal latitud
        +decimal longitud
        +enum habilitado
        +datetime created_at
        +datetime updated_at
    }

    class empleados {
        +bigint id  PK
        +string id_dual_point
        +string id_erp
        +string nombre
        +string usuario
        +string perfil
        +string sucursal
        +datetime create_at
        +datetime update_at
    }

    class productos {
        +bigint id  PK
        +string codigo_interno
        +string nombre
        +string um
        +string grupo
        +string subgrupo
        +enum estado_producto
        +decimal factor_conversion
        +datetime created_at
        +datetime updated_at
    }

    class ventas {
        +bigint id  PK
        +bigint ntr_pedido
        +bigint ntr_venta
        +date fecha_pedido
        +date fecha_venta
        +string cod_producto
        +decimal cant_producto
        +decimal precio_u
        +decimal importe_bruto
        +decimal descuento
        +decimal importe_total_producto
        +enum estado
        +datetime created_at
        +datetime updated_at
    }

    class auth_users {
        <<external · Supabase Auth>>
        +uuid id  PK
    }

    usuarios "0..1" --> "1" auth_users : id (cascade)

    sucursales "1" --> "0..*" usuarios : sucursal_id
    sucursales "1" --> "0..*" zonas : id_sucursal
    sucursales "1" --> "0..*" productos : id_sucursal

    zonas "1" --> "0..*" rutas : id_zona

    usuarios "1" --> "0..*" supervisor_zonas : id_supervisor (cascade)
    zonas "1" --> "0..*" supervisor_zonas : id_zona (cascade)

    usuarios "1" --> "0..*" supervisor_vendedores : id_supervisor (cascade)
    usuarios "1" --> "0..*" supervisor_vendedores : id_vendedor (cascade)

    usuarios "1" --> "0..*" vendedor_slots : id_supervisor (cascade)
    usuarios "1" --> "0..*" vendedor_slots : id_vendedor (cascade)

    vendedor_slots "1" --> "0..*" planificacion_rutas : id_vendedor_slot (cascade)
    rutas "1" --> "0..*" planificacion_rutas : id_ruta (cascade)

    rutas "1" --> "0..*" clientes : id_ruta

    empleados "1" --> "0..*" ventas : id_preventista
    empleados "1" --> "0..*" ventas : id_distribuidor
    clientes "1" --> "0..*" ventas : cod_cliente
    productos "1" --> "0..*" ventas : id_producto
```

## Notas de lectura

1. `usuarios` extiende `auth.users` de Supabase (esquema externo) — su PK es también FK con `ON DELETE CASCADE`.
2. `supervisor_zonas` y `supervisor_vendedores` son clases de asociación M:N sobre `usuarios`: qué supervisor cubre qué zona, y qué supervisor gestiona qué vendedor — ambas relaciones caen sobre la misma tabla física.
3. `ventas` referencia dos veces a `empleados` (`id_preventista`, `id_distribuidor`); por eso ambas asociaciones llevan el nombre de la FK como rol.
4. `empleados.sucursal` es texto libre, no una FK hacia `sucursales` — a diferencia de `usuarios.sucursal_id`.
5. Las asociaciones marcadas `(cascade)` son las únicas con `ON DELETE CASCADE` en el SQL; el resto de las FK no tiene regla de borrado explícita.
