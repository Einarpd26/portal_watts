import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { GEOJSON_MAX_BYTES, interpretarGeoJson, validarRuta, type RutaErrors } from '@/utils/rutaValidation';
import { verticesDeRutas, type Posicion } from '@/utils/ajusteVertices';
import type { ConflictoRuta, ContornoZona, PoligonoRuta, RutaExportable, RutaItem, ZonaDeRuta } from '@/types';

export interface RutaForm {
  id_zona: number | null;
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string;
}

const FORM_VACIO: RutaForm = { id_zona: null, codigo_ruta: '', ruta: '', descripcion_ruta: '' };

/** Resultado de validar el polígono propuesto, importado o dibujado (vista previa de CU-05) */
export interface Evaluacion {
  valida: boolean;
  motivo: string | null;
  geojson: PoligonoRuta | null;
  vertices: number | null;
  area_m2: number | null;
  conflictos: ConflictoRuta[];
}

/** Dibujo en curso: `clave` reinicia la capa de dibujo; `poligonoInicial` es la ruta a editar */
export interface Dibujo {
  clave: number;
  poligonoInicial: PoligonoRuta | null;
}

export type ObjetivoExportacion = { tipo: 'ruta'; id: number } | { tipo: 'zona'; id: number } | { tipo: 'todo' };

type Toast = { type: 'success' | 'error'; message: string };
type Editor = { ruta: RutaItem | null };

interface RespuestaValidar {
  valida: boolean;
  motivo?: string | null;
  geojson?: PoligonoRuta;
  vertices?: number;
  area_m2?: number;
  conflictos?: ConflictoRuta[];
}

const sinPreview = (motivo: string): Evaluacion => ({
  valida: false,
  motivo,
  geojson: null,
  vertices: null,
  area_m2: null,
  conflictos: [],
});

export interface UseGestionRutasReturn {
  zonas: ZonaDeRuta[];
  rutas: RutaItem[];
  rutasVisibles: RutaItem[];
  contornos: ContornoZona[];
  isLoading: boolean;
  isEvaluando: boolean;
  isSubmitting: boolean;
  isExportando: boolean;
  filtroZona: number | null;
  setFiltroZona: (id: number | null) => void;
  seleccionId: number | null;
  setSeleccionId: (id: number | null) => void;
  // Editor (alta y edición; el polígono se importa o se dibuja)
  editor: Editor | null;
  form: RutaForm;
  setForm: (form: RutaForm) => void;
  formErrors: RutaErrors;
  archivoNombre: string | null;
  evaluacion: Evaluacion | null;
  puedeGuardar: boolean;
  openCrear: () => void;
  openEditar: (ruta: RutaItem) => void;
  closeEditor: () => void;
  elegirArchivo: (archivo: File) => Promise<void>;
  quitarArchivo: () => void;
  // Dibujo en el mapa (ADR-002 D6)
  dibujo: Dibujo | null;
  verticesVecinos: Posicion[];
  iniciarDibujo: () => Promise<void>;
  reiniciarDibujo: () => void;
  detenerDibujo: () => void;
  alCambiarDibujo: (poligono: PoligonoRuta) => void;
  // Respaldo
  exportar: (objetivo: ObjetivoExportacion) => Promise<void>;
  submit: () => Promise<void>;
  toast: Toast | null;
  clearToast: () => void;
}

export function useGestionRutas(): UseGestionRutasReturn {
  const [zonas, setZonas] = useState<ZonaDeRuta[]>([]);
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [contornos, setContornos] = useState<ContornoZona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluando, setIsEvaluando] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportando, setIsExportando] = useState(false);
  const [filtroZona, setFiltroZona] = useState<number | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setFormState] = useState<RutaForm>(FORM_VACIO);
  const [formErrors, setFormErrors] = useState<RutaErrors>({});
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [textoGeoJson, setTextoGeoJson] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  const [dibujo, setDibujo] = useState<Dibujo | null>(null);
  // Descarta la respuesta de una validación vieja si ya hay un polígono más nuevo
  const evaluacionActual = useRef(0);
  const claveDibujo = useRef(0);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rutas');
      if (res.ok) {
        const data = (await res.json()) as { zonas?: ZonaDeRuta[]; rutas?: RutaItem[]; contornos?: ContornoZona[] };
        setZonas(data.zonas ?? []);
        setRutas(data.rutas ?? []);
        setContornos(data.contornos ?? []);
      } else {
        showToast('error', 'No se pudieron cargar las rutas.');
      }
    } catch (err: unknown) {
      logger.error('Error cargando las rutas:', err);
      showToast('error', 'Error de red al cargar las rutas.');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // Carga inicial: el estado se actualiza al resolver el fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const rutasVisibles = useMemo(
    () => (filtroZona === null ? rutas : rutas.filter((r) => r.id_zona === filtroZona)),
    [rutas, filtroZona]
  );
  const contornosVisibles = useMemo(
    () => (filtroZona === null ? contornos : contornos.filter((c) => c.id_zona === filtroZona)),
    [contornos, filtroZona]
  );

  // El dibujo se pega a los vértices de las demás rutas del alcance (no a los de la que se edita)
  const idEditando = editor?.ruta?.id ?? null;
  const verticesVecinos = useMemo(
    () => verticesDeRutas(rutas.filter((r) => r.id !== idEditando).map((r) => r.geojson)),
    [rutas, idEditando]
  );

  const leerError = useCallback(async (res: Response, alternativo: string) => {
    try {
      const body = (await res.json()) as { error?: string; errors?: RutaErrors; conflictos?: ConflictoRuta[] };
      if (body.errors) setFormErrors(body.errors);
      if (body.conflictos) {
        // A1: el mapa resalta las rutas en conflicto
        setEvaluacion({ ...sinPreview(body.error ?? alternativo), conflictos: body.conflictos });
      }
      return body.error ?? alternativo;
    } catch (parseErr: unknown) {
      // Un cuerpo por encima del límite de la API llega como texto plano, no como JSON
      logger.error('Respuesta de rutas sin JSON válido:', parseErr);
      return res.status === 413 ? 'El archivo es demasiado grande.' : alternativo;
    }
  }, []);

  const limpiarPoligono = useCallback(() => {
    evaluacionActual.current += 1;
    setArchivoNombre(null);
    setTextoGeoJson(null);
    setEvaluacion(null);
    setIsEvaluando(false);
  }, []);

  /** Valida el polígono propuesto (archivo leído o dibujo serializado) contra el servidor */
  const evaluarTexto = useCallback(
    async (texto: string) => {
      const turno = ++evaluacionActual.current;
      setTextoGeoJson(null);

      const local = interpretarGeoJson(texto);
      if (!local.ok) {
        setEvaluacion(sinPreview(local.mensaje));
        return;
      }

      setTextoGeoJson(texto);
      setIsEvaluando(true);
      try {
        const res = await fetch('/api/admin/rutas/validar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geojson: texto, id_ruta: editor?.ruta?.id }),
        });
        if (turno !== evaluacionActual.current) return;
        if (!res.ok) {
          setEvaluacion(sinPreview(await leerError(res, 'No se pudo validar el polígono.')));
          return;
        }
        const r = (await res.json()) as RespuestaValidar;
        setEvaluacion({
          valida: r.valida,
          motivo: r.motivo ?? null,
          geojson: r.geojson ?? null,
          vertices: r.vertices ?? null,
          area_m2: r.area_m2 ?? null,
          conflictos: r.conflictos ?? [],
        });
      } catch (err: unknown) {
        logger.error('Error validando el polígono de la ruta:', err);
        if (turno === evaluacionActual.current) setEvaluacion(sinPreview('Error de red al validar el polígono.'));
      } finally {
        if (turno === evaluacionActual.current) setIsEvaluando(false);
      }
    },
    [editor, leerError]
  );

  const setForm = useCallback((next: RutaForm) => {
    setFormState(next);
    setFormErrors({});
  }, []);

  const openCrear = useCallback(() => {
    // El aviso habla de la acción anterior; si se cerrara solo durante la edición, la página
    // saltaría hacia arriba mientras se arrastra un vértice en el mapa
    clearToast();
    limpiarPoligono();
    setDibujo(null);
    // Con una sola zona disponible no hay nada que elegir
    const unica = filtroZona ?? (zonas.length === 1 ? zonas[0].id : null);
    setFormState({ ...FORM_VACIO, id_zona: unica });
    setFormErrors({});
    setSeleccionId(null);
    setEditor({ ruta: null });
  }, [clearToast, limpiarPoligono, filtroZona, zonas]);

  const openEditar = useCallback(
    (ruta: RutaItem) => {
      clearToast();
      limpiarPoligono();
      setDibujo(null);
      setFormState({
        id_zona: ruta.id_zona,
        codigo_ruta: ruta.codigo_ruta,
        ruta: ruta.ruta,
        descripcion_ruta: ruta.descripcion_ruta ?? '',
      });
      setFormErrors({});
      setSeleccionId(ruta.id);
      setEditor({ ruta });
    },
    [clearToast, limpiarPoligono]
  );

  const closeEditor = useCallback(() => {
    limpiarPoligono();
    setDibujo(null);
    setEditor(null);
  }, [limpiarPoligono]);

  const elegirArchivo = useCallback(
    async (archivo: File) => {
      // Importar reemplaza al dibujo: un solo origen del polígono a la vez
      setDibujo(null);
      evaluacionActual.current += 1;
      setArchivoNombre(archivo.name);
      setEvaluacion(null);
      // El tamaño se revisa antes de leer el archivo completo en memoria
      if (archivo.size > GEOJSON_MAX_BYTES) {
        setTextoGeoJson(null);
        setEvaluacion(sinPreview(`El archivo supera el tamaño máximo de ${GEOJSON_MAX_BYTES / 1024} KB.`));
        return;
      }
      await evaluarTexto(await archivo.text());
    },
    [evaluarTexto]
  );

  // ---- Dibujo en el mapa
  const iniciarDibujo = useCallback(async () => {
    limpiarPoligono();
    let poligonoInicial: PoligonoRuta | null = null;
    const editando = editor?.ruta;
    if (editando) {
      // Se edita sobre la geometría completa, no sobre la simplificada del listado
      try {
        const res = await fetch(`/api/admin/rutas/${editando.id}`);
        if (!res.ok) {
          showToast('error', await leerError(res, 'No se pudo cargar el polígono de la ruta.'));
          return;
        }
        poligonoInicial = ((await res.json()) as { ruta: RutaExportable }).ruta.geojson;
      } catch (err: unknown) {
        logger.error('Error cargando el polígono de la ruta:', err);
        showToast('error', 'Error de red al cargar el polígono.');
        return;
      }
    }
    claveDibujo.current += 1;
    setDibujo({ clave: claveDibujo.current, poligonoInicial });
  }, [editor, limpiarPoligono, leerError, showToast]);

  const reiniciarDibujo = useCallback(() => {
    limpiarPoligono();
    claveDibujo.current += 1;
    setDibujo({ clave: claveDibujo.current, poligonoInicial: null });
  }, [limpiarPoligono]);

  const detenerDibujo = useCallback(() => {
    limpiarPoligono();
    setDibujo(null);
  }, [limpiarPoligono]);

  const alCambiarDibujo = useCallback(
    (poligono: PoligonoRuta) => {
      evaluarTexto(JSON.stringify(poligono)).catch((err: unknown) => {
        logger.error('Error no controlado al validar el dibujo:', err);
      });
    },
    [evaluarTexto]
  );

  // ---- Respaldo en GeoJSON
  const exportar = useCallback(
    async (objetivo: ObjetivoExportacion) => {
      const consulta =
        objetivo.tipo === 'ruta' ? `?id_ruta=${objetivo.id}` : objetivo.tipo === 'zona' ? `?id_zona=${objetivo.id}` : '';
      setIsExportando(true);
      try {
        const res = await fetch(`/api/admin/rutas/exportar${consulta}`);
        if (!res.ok) {
          showToast('error', await leerError(res, 'No se pudo exportar.'));
          return;
        }
        const nombre =
          /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'territorio.geojson';
        const url = URL.createObjectURL(await res.blob());
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        URL.revokeObjectURL(url);
        showToast('success', `Se descargó ${nombre}.`);
      } catch (err: unknown) {
        logger.error('Error exportando el territorio:', err);
        showToast('error', 'Error de red al exportar.');
      } finally {
        setIsExportando(false);
      }
    },
    [leerError, showToast]
  );

  // Alta: exige un polígono válido. Edición: si no se tocó el polígono, se conserva el actual.
  const puedeGuardar =
    editor !== null &&
    !isEvaluando &&
    (editor.ruta ? evaluacion === null || evaluacion.valida : evaluacion?.valida === true);

  const submit = useCallback(async () => {
    if (!editor) return;
    const editando = editor.ruta;
    const validacion = validarRuta(form, { exigirZona: !editando });
    if (!validacion.isValid) {
      setFormErrors(validacion.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(editando ? `/api/admin/rutas/${editando.id}` : '/api/admin/rutas', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validacion.data, geojson: textoGeoJson ?? undefined }),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: number };
        closeEditor();
        setSeleccionId(id);
        showToast('success', editando ? 'Se actualizó la ruta.' : 'Se creó la ruta.');
        await load();
      } else {
        showToast('error', await leerError(res, 'No se pudo guardar la ruta.'));
      }
    } catch (err: unknown) {
      logger.error('Error guardando la ruta:', err);
      showToast('error', 'Error de red al guardar.');
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, form, textoGeoJson, closeEditor, showToast, load, leerError]);

  return {
    zonas, rutas, rutasVisibles, contornos: contornosVisibles, isLoading, isEvaluando, isSubmitting, isExportando,
    filtroZona, setFiltroZona, seleccionId, setSeleccionId,
    editor, form, setForm, formErrors, archivoNombre, evaluacion, puedeGuardar,
    openCrear, openEditar, closeEditor, elegirArchivo, quitarArchivo: limpiarPoligono,
    dibujo, verticesVecinos, iniciarDibujo, reiniciarDibujo, detenerDibujo, alCambiarDibujo,
    exportar, submit, toast, clearToast,
  };
}
