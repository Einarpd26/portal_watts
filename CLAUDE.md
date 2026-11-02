@AGENTS.md

# Convenciones de base de datos

- **No se usan enums de dominio** (`CREATE TYPE ... AS ENUM`). Los valores acotados se modelan como `text` con una restricción `CHECK (columna IN (...))`. Aplica a las migraciones, al seed, al Informe y a los DBML del repositorio de documentación (`Ing_Req_Mod_Angelica`).
- Las claves son `bigint GENERATED ALWAYS AS IDENTITY` y las columnas de texto son `text`; los límites de longitud se validan en la aplicación o en la función de base de datos.
