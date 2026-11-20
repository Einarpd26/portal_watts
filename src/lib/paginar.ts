/** Filas por consulta: PostgREST corta en 1000 (supabase/config.toml), así que se pide por páginas */
const PAGINA = 1000;

/** Todas las filas de una consulta, pidiéndolas por páginas; null si alguna página falla */
export async function todas<T>(pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[] | null> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pagina(desde, desde + PAGINA - 1);
    if (error) return null;
    filas.push(...(data ?? []));
    if ((data ?? []).length < PAGINA) return filas;
  }
}
