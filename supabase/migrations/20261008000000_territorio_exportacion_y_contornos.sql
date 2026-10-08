-- ==============================================================================
-- Migración: Territorio — exportación de rutas y contorno derivado de las zonas
-- Decisiones: ADR-002 D6 (el contorno de una zona es la unión de sus rutas; no se guarda
-- ni se edita) y respaldo con la geometría completa, sin la simplificación del mapa.
-- Como el resto del esquema public, solo el servidor las invoca con la llave de servicio.
-- ==============================================================================

-- 1. EXPORTAR: rutas con su polígono COMPLETO (el listado del mapa lo simplifica a ~1 m y no
-- serviría como respaldo fiel). `p_id_ruta` acota a una sola ruta.
CREATE OR REPLACE FUNCTION public.rutas_exportar(p_ids_zona bigint[], p_id_ruta bigint DEFAULT NULL)
RETURNS TABLE (
    id bigint,
    codigo_ruta text,
    ruta text,
    descripcion_ruta text,
    id_zona bigint,
    codigo_zona text,
    zona text,
    geojson jsonb
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
    SELECT r.id, r.codigo_ruta, r.ruta, r.descripcion_ruta, r.id_zona, z.codigo_zona, z.zona,
           ST_AsGeoJSON(r.localizacion)::jsonb
      FROM public.rutas r
      JOIN public.zonas z ON z.id = r.id_zona
     WHERE r.id_zona = ANY (p_ids_zona)
       AND (p_id_ruta IS NULL OR r.id = p_id_ruta)
     ORDER BY z.codigo_zona, r.codigo_ruta;
$$;

-- 2. CONTORNO DE ZONA (D6): unión de los polígonos de sus rutas. Puede ser un MultiPolygon si
-- las rutas no son contiguas. Una zona sin rutas no tiene contorno. `p_tolerancia` > 0 lo
-- simplifica para el mapa; 0 lo devuelve completo para la exportación.
CREATE OR REPLACE FUNCTION public.zonas_contorno(p_ids_zona bigint[], p_tolerancia double precision DEFAULT 0)
RETURNS TABLE (id_zona bigint, geojson jsonb)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
    SELECT u.id_zona,
           ST_AsGeoJSON(
               CASE WHEN p_tolerancia > 0 THEN ST_SimplifyPreserveTopology(u.geom, p_tolerancia) ELSE u.geom END
           )::jsonb
      FROM (
            SELECT r.id_zona, ST_UnaryUnion(ST_Collect(r.localizacion)) AS geom
              FROM public.rutas r
             WHERE r.id_zona = ANY (p_ids_zona)
             GROUP BY r.id_zona
           ) u
     ORDER BY u.id_zona;
$$;

-- PostgreSQL concede EXECUTE a PUBLIC a toda función nueva (convención del proyecto: revocar por función)
REVOKE EXECUTE ON FUNCTION public.rutas_exportar(bigint[], bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zonas_contorno(bigint[], double precision) FROM PUBLIC, anon, authenticated;
