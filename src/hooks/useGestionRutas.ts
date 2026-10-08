import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/lib/logger';
import { GEOJSON_MAX_BYTES, interpretarGeoJson, validarRuta, type RutaErrors } from '@/utils/rutaValidation';
import type { ConflictoRuta, PoligonoRuta, RutaItem, ZonaDeRuta } from '@/types';

export interface RutaForm {
  id_zona: number | null;
  codigo_ruta: string;
  ruta: string;
  descripcion_ruta: string;
}

const FORM_VACIO: RutaForm = { id_zona: null, codigo_ruta: '', ruta: '', descripcion_ruta: '' };

/** Resultado de validar el archivo importado (vista previa de CU-05) */
export interface Evaluacion {
  valida: boolean;
  motivo: string | null;
  geojson: PoligonoRuta | null;
  vertices: number | null;
  area_m2: number | null;
  conflictos: ConflictoRuta[];
}

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

export interface UseGestionRutasReturn {
  zonas: ZonaDeRuta[];
  rutas: RutaItem[];
  rutasVisibles: RutaItem[];
  isLoading: boolean;
  isEvaluando: boolean;
  isSubmitting: boolean;
  filtroZona: number | null;
  setFiltroZona: (id: number | null) => void;
  seleccionId: number | null;
  setSeleccionId: (id: number | null) => void;
  // Editor (alta por importación y edición)
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
  submit: () => Promise<void>;
  toast: Toast | null;
  clearToast: () => void;
}

export function useGestionRutas(): UseGestionRutasReturn {
  const [zonas, setZonas] = useState<ZonaDeRuta[]>([]);
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluando, setIsEvaluando] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filtroZona, setFiltroZona] = useState<number | null>(null);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [form, setFormState] = useState<RutaForm>(FORM_VACIO);
  const [formErrors, setFormErrors] = useState<RutaErrors>({});
  const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
  const [textoGeoJson, setTextoGeoJson] = useState<string | null>(null);
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null);
  // Descarta la respuesta de una validación vieja si el usuario ya eligió otro archivo
  const evaluacionActual = useRef(0);

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
        const data = (await res.json()) as { zonas?: ZonaDeRuta[]; rutas?: RutaItem[] };
        setZonas(data.zonas ?? []);
        setRutas(data.rutas ?? []);
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

  const leerError = useCallback(async (res: Response, alternativo: string) => {
    try {
      const body = (await res.json()) as { error?: string; errors?: RutaErrors; conflictos?: ConflictoRuta[] };
      if (body.errors) setFormErrors(body.errors);
      if (body.conflictos) {
        // A1: el mapa resalta las rutas en conflicto
        setEvaluacion({
          valida: false,
          motivo: body.error ?? alternativo,
          geojson: null,
          vertices: null,
          area_m2: null,
          conflictos: body.conflictos,
        });
      }
      return body.error ?? alternativo;
    } catch (parseErr: unknown) {
      // Un cuerpo por encima del límite de la API llega como texto plano, no como JSON
      logger.error('Respuesta de rutas sin JSON válido:', parseErr);
      return res.status === 413 ? 'El archivo es demasiado grande.' : alternativo;
    }
  }, []);

  const limpiarArchivo = useCallback(() => {
    evaluacionActual.current += 1;
    setArchivoNombre(null);
    setTextoGeoJson(null);
    setEvaluacion(null);
    setIsEvaluando(false);
  }, []);

  const setForm = useCallback((next: RutaForm) => {
    setFormState(next);
    setFormErrors({});
  }, []);

  const openCrear = useCallback(() => {
    limpiarArchivo();
    // Con una sola zona disponible no hay nada que elegir
    const unica = filtroZona ?? (zonas.length === 1 ? zonas[0].id : null);
    setFormState({ ...FORM_VACIO, id_zona: unica });
    setFormErrors({});
    setSeleccionId(null);
    setEditor({ ruta: null });
  }, [limpiarArchivo, filtroZona, zonas]);

  const openEditar = useCallback(
    (ruta: RutaItem) => {
      limpiarArchivo();
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
    [limpiarArchivo]
  );

  const closeEditor = useCallback(() => {
    limpiarArchivo();
    setEditor(null);
  }, [limpiarArchivo]);

  const elegirArchivo = useCallback(
    async (archivo: File) => {
      const turno = ++evaluacionActual.current;
      setArchivoNombre(archivo.name);
      setTextoGeoJson(null);
      setEvaluacion(null);

      const sinPreview = (motivo: string): Evaluacion => ({
        valida: false,
        motivo,
        geojson: null,
        vertices: null,
        area_m2: null,
        conflictos: [],
      });

      // El tamaño se revisa antes de leer el archivo completo en memoria
      if (archivo.size > GEOJSON_MAX_BYTES) {
        setEvaluacion(sinPreview(`El archivo supera el tamaño máximo de ${GEOJSON_MAX_BYTES / 1024} KB.`));
        return;
      }
      const texto = await archivo.text();
      if (turno !== evaluacionActual.current) return;

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
          setEvaluacion(sinPreview(await leerError(res, 'No se pudo validar el archivo.')));
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
        logger.error('Error validando el GeoJSON de la ruta:', err);
        if (turno === evaluacionActual.current) setEvaluacion(sinPreview('Error de red al validar el archivo.'));
      } finally {
        if (turno === evaluacionActual.current) setIsEvaluando(false);
      }
    },
    [editor, leerError]
  );

  // Alta: exige un polígono válido. Edición: el archivo es opcional (si no hay, se conserva el actual).
  const puedeGuardar = editor !== null && !isEvaluando && (editor.ruta ? evaluacion === null || evaluacion.valida : evaluacion?.valida === true);

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
    zonas, rutas, rutasVisibles, isLoading, isEvaluando, isSubmitting,
    filtroZona, setFiltroZona, seleccionId, setSeleccionId,
    editor, form, setForm, formErrors, archivoNombre, evaluacion, puedeGuardar,
    openCrear, openEditar, closeEditor, elegirArchivo, quitarArchivo: limpiarArchivo, submit,
    toast, clearToast,
  };
}
