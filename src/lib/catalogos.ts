import { createAdminClient } from '@/lib/supabase/server';
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '@/lib/pgErrors';
import type { CatalogoItem } from '@/types';
import type { CatalogoTipo } from '@/utils/catalogoValidation';

export type CatalogoError = 'duplicado' | 'en_uso' | 'no_encontrado' | 'error';
export type CatalogoResultado<T> = { ok: true; data: T } | { ok: false; error: CatalogoError };

interface CatalogoInput {
  nombre: string;
  descripcion: string;
}

export interface CatalogoAdapter {
  /** Nombre en singular para mensajes y bitácora (p. ej. "sucursal") */
  etiqueta: string;
  acciones: { crear: string; editar: string; eliminar: string };
  listar(): Promise<CatalogoResultado<CatalogoItem[]>>;
  crear(input: CatalogoInput): Promise<CatalogoResultado<CatalogoItem>>;
  actualizar(id: number, input: CatalogoInput): Promise<CatalogoResultado<CatalogoItem>>;
  eliminar(id: number): Promise<CatalogoResultado<null>>;
}


function mapearError(error: { code?: string }): { ok: false; error: CatalogoError } {
  if (error.code === PG_UNIQUE_VIOLATION) return { ok: false, error: 'duplicado' };
  if (error.code === PG_FOREIGN_KEY_VIOLATION) return { ok: false, error: 'en_uso' };
  return { ok: false, error: 'error' };
}

function contarPorId(filas: Array<number | null>): Map<number, number> {
  const conteo = new Map<number, number>();
  for (const id of filas) {
    if (id !== null) conteo.set(id, (conteo.get(id) ?? 0) + 1);
  }
  return conteo;
}

const sucursalesAdapter: CatalogoAdapter = {
  etiqueta: 'sucursal',
  acciones: { crear: 'CREAR_SUCURSAL', editar: 'EDITAR_SUCURSAL', eliminar: 'ELIMINAR_SUCURSAL' },

  async listar() {
    const supabase = createAdminClient();
    const [filas, asignaciones, roles] = await Promise.all([
      supabase.from('sucursales').select('id, nombre_sucursal, descripcion, created_at').order('nombre_sucursal'),
      supabase.from('asignaciones_laborales').select('id_sucursal'),
      supabase.from('usuario_roles').select('id_sucursal'),
    ]);

    const error = filas.error ?? asignaciones.error ?? roles.error;
    if (error) return mapearError(error);

    const conteo = contarPorId([
      ...(asignaciones.data ?? []).map((a) => a.id_sucursal),
      ...(roles.data ?? []).map((r) => r.id_sucursal),
    ]);

    return {
      ok: true,
      data: (filas.data ?? []).map((f) => ({
        id: f.id,
        nombre: f.nombre_sucursal,
        descripcion: f.descripcion,
        referencias: conteo.get(f.id) ?? 0,
        created_at: f.created_at,
      })),
    };
  },

  async crear({ nombre, descripcion }) {
    const { data, error } = await createAdminClient()
      .from('sucursales')
      .insert({ nombre_sucursal: nombre, descripcion })
      .select('id, nombre_sucursal, descripcion, created_at')
      .single();
    if (error) return mapearError(error);
    return {
      ok: true,
      data: { id: data.id, nombre: data.nombre_sucursal, descripcion: data.descripcion, referencias: 0, created_at: data.created_at },
    };
  },

  async actualizar(id, { nombre, descripcion }) {
    const { data, error } = await createAdminClient()
      .from('sucursales')
      .update({ nombre_sucursal: nombre, descripcion })
      .eq('id', id)
      .select('id, nombre_sucursal, descripcion, created_at')
      .maybeSingle();
    if (error) return mapearError(error);
    if (!data) return { ok: false, error: 'no_encontrado' };
    return {
      ok: true,
      data: { id: data.id, nombre: data.nombre_sucursal, descripcion: data.descripcion, referencias: 0, created_at: data.created_at },
    };
  },

  async eliminar(id) {
    const { data, error } = await createAdminClient().from('sucursales').delete().eq('id', id).select('id');
    if (error) return mapearError(error);
    if (!data || data.length === 0) return { ok: false, error: 'no_encontrado' };
    return { ok: true, data: null };
  },
};

const cargosAdapter: CatalogoAdapter = {
  etiqueta: 'cargo',
  acciones: { crear: 'CREAR_CARGO', editar: 'EDITAR_CARGO', eliminar: 'ELIMINAR_CARGO' },

  async listar() {
    const supabase = createAdminClient();
    const [filas, asignaciones] = await Promise.all([
      supabase.from('cargos').select('id, nombre_cargo, descripcion, created_at').order('nombre_cargo'),
      supabase.from('asignaciones_laborales').select('id_cargo'),
    ]);

    const error = filas.error ?? asignaciones.error;
    if (error) return mapearError(error);

    const conteo = contarPorId((asignaciones.data ?? []).map((a) => a.id_cargo));

    return {
      ok: true,
      data: (filas.data ?? []).map((f) => ({
        id: f.id,
        nombre: f.nombre_cargo,
        descripcion: f.descripcion,
        referencias: conteo.get(f.id) ?? 0,
        created_at: f.created_at,
      })),
    };
  },

  async crear({ nombre, descripcion }) {
    const { data, error } = await createAdminClient()
      .from('cargos')
      .insert({ nombre_cargo: nombre, descripcion: descripcion || null })
      .select('id, nombre_cargo, descripcion, created_at')
      .single();
    if (error) return mapearError(error);
    return {
      ok: true,
      data: { id: data.id, nombre: data.nombre_cargo, descripcion: data.descripcion, referencias: 0, created_at: data.created_at },
    };
  },

  async actualizar(id, { nombre, descripcion }) {
    const { data, error } = await createAdminClient()
      .from('cargos')
      .update({ nombre_cargo: nombre, descripcion: descripcion || null })
      .eq('id', id)
      .select('id, nombre_cargo, descripcion, created_at')
      .maybeSingle();
    if (error) return mapearError(error);
    if (!data) return { ok: false, error: 'no_encontrado' };
    return {
      ok: true,
      data: { id: data.id, nombre: data.nombre_cargo, descripcion: data.descripcion, referencias: 0, created_at: data.created_at },
    };
  },

  async eliminar(id) {
    const { data, error } = await createAdminClient().from('cargos').delete().eq('id', id).select('id');
    if (error) return mapearError(error);
    if (!data || data.length === 0) return { ok: false, error: 'no_encontrado' };
    return { ok: true, data: null };
  },
};

export function obtenerCatalogo(tipo: CatalogoTipo): CatalogoAdapter {
  return tipo === 'sucursales' ? sucursalesAdapter : cargosAdapter;
}
