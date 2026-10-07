-- ==============================================================================
-- Migración: Territorio (Módulo 2) — zonas, supervisor de zona y rutas con PostGIS
-- Proyecto: Portal Watts (Caramelos Watts S.R.L.)
-- Decisiones: ADR-002 (GeoJSON Polygon, no superposición por interiores, mapas)
-- Casos de uso: CU-04 (zonas), CU-05 (rutas), CU-06 (traslado), CU-07 (supervisor de zona)
-- ==============================================================================

-- 1. POSTGIS (en el esquema `extensions`, como exige Supabase)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. ZONAS: agrupadores administrativos de rutas, sin polígono propio
CREATE TABLE IF NOT EXISTS public.zonas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_zona text NOT NULL,
    zona text NOT NULL,
    descripcion_zona text,
    canal_venta text,
    id_sucursal bigint NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_zona_sucursal UNIQUE (codigo_zona, id_sucursal)
);

COMMENT ON TABLE public.zonas IS 'Zonas comerciales: agrupadores administrativos de rutas dentro de una sucursal (CU-04).';

CREATE INDEX IF NOT EXISTS zonas_id_sucursal_idx ON public.zonas (id_sucursal);

CREATE TRIGGER trg_zonas_updated_at
    BEFORE UPDATE ON public.zonas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. SUPERVISOR_ZONAS: un solo supervisor por zona; un supervisor puede tener varias zonas (CU-07)
CREATE TABLE IF NOT EXISTS public.supervisor_zonas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_supervisor bigint NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
    id_zona bigint NOT NULL REFERENCES public.zonas(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_supervisor_zona UNIQUE (id_zona)
);

COMMENT ON TABLE public.supervisor_zonas IS 'Supervisor responsable de cada zona (RN-02: el supervisor de una ruta se deriva de su zona).';

CREATE INDEX IF NOT EXISTS supervisor_zonas_id_supervisor_idx ON public.supervisor_zonas (id_supervisor);

-- 4. RUTAS: polígono geográfico asociado a una única zona (CU-05)
CREATE TABLE IF NOT EXISTS public.rutas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo_ruta text NOT NULL,
    ruta text NOT NULL,
    descripcion_ruta text,
    localizacion extensions.geometry(Polygon, 4326) NOT NULL,
    id_zona bigint NOT NULL REFERENCES public.zonas(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_ruta_zona UNIQUE (codigo_ruta, id_zona),
    CONSTRAINT rutas_localizacion_valida CHECK (extensions.st_isvalid(localizacion))
);

COMMENT ON TABLE public.rutas IS 'Rutas comerciales delimitadas por un polígono WGS84 (SRID 4326, [longitud, latitud]); una ruta pertenece a una sola zona.';
COMMENT ON COLUMN public.rutas.localizacion IS 'Polígono de la ruta. Los interiores de dos rutas no pueden intersectarse (RN-01, ADR-002); las rutas contiguas que solo comparten borde son válidas.';

CREATE INDEX IF NOT EXISTS rutas_localizacion_gist_idx ON public.rutas USING gist (localizacion);
CREATE INDEX IF NOT EXISTS rutas_id_zona_idx ON public.rutas (id_zona);

CREATE TRIGGER trg_rutas_updated_at
    BEFORE UPDATE ON public.rutas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 5. NO SUPERPOSICIÓN (RN-01, ADR-002 D2): último resguardo en la base de datos.
-- Se rechaza una ruta cuyo INTERIOR se intersecte con el de otra (ST_Relate 'T********').
-- ST_Overlaps no basta: no detecta contención ni geometrías idénticas.
-- El bloqueo consultivo serializa altas y ediciones concurrentes para que dos rutas
-- simultáneas no se crucen entre sí.
CREATE OR REPLACE FUNCTION public.trg_fn_validar_solapamiento_ruta()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('public.rutas.localizacion'));

    IF EXISTS (
        SELECT 1
        FROM public.rutas r
        WHERE r.id <> NEW.id
          AND r.localizacion && NEW.localizacion
          AND ST_Relate(r.localizacion, NEW.localizacion, 'T********')
    ) THEN
        RAISE EXCEPTION 'La ruta % se superpone con otra ruta existente (RN-01)', NEW.codigo_ruta
            USING ERRCODE = '23P01';
    END IF;

    RETURN NEW;
END;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC a toda función nueva; ese permiso global no se quita con
-- ALTER DEFAULT PRIVILEGES por esquema, así que se revoca en cada función (convención del proyecto).
REVOKE EXECUTE ON FUNCTION public.trg_fn_validar_solapamiento_ruta() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_rutas_validar_solapamiento
    BEFORE INSERT OR UPDATE OF localizacion ON public.rutas
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_validar_solapamiento_ruta();
