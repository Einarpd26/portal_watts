import { useCallback, useEffect, useMemo, useState } from 'react';
import { logger } from '@/lib/logger';
import { descargarInformeExcel } from '@/lib/descargarInformeExcel';
import { filtrarFilas, tamanoLegible, type FiltroEstado } from '@/utils/importacionRutas';
import type { FilaInforme, ResumenInforme } from '@/utils/rutaInforme';
import { interpretarLoteRutas, LOTE_MAX_BYTES, type RutaLoteEntrada, type RutaLoteRechazada } from '@/utils/rutaValidation';
import type { ZonaDeRuta } from '@/types';

/** Archivo elegido ya leído: el servidor vuelve a interpretarlo, esto sirve para dibujarlo y avisar pronto */
export interface ArchivoLote {
  nombre: string;
  texto: string;
  rutas: RutaLoteEntrada[];
  rechazadas: RutaLoteRechazada[];
}

export interface RespuestaLote {
  confirmado: boolean;
  resumen: ResumenInforme;
  filas: FilaInforme[];
}

export type FaseImportacion = 'inicial' | 'evaluando' | 'previa' | 'confirmando' | 'confirmada';

export interface SucursalOpcion {
  id: number;
  nombre: string;
}

export interface UseImportarRutasReturn {
  isLoading: boolean;
  sucursales: SucursalOpcion[];
  idSucursal: number | null;
  elegirSucursal: (id: number | null) => void;
  archivo: ArchivoLote | null;
  elegirArchivo: (archivo: File) => Promise<void>;
  fase: FaseImportacion;
  respuesta: RespuestaLote | null;
  error: string | null;
  /** Evalúa el archivo sin guardar nada */
  evaluar: () => Promise<void>;
  /** Guarda lo que la vista previa mostró */
  confirmar: () => Promise<void>;
  descargarInforme: () => Promise<void>;
  isDescargando: boolean;
  reiniciar: () => void;
  filtroEstado: FiltroEstado;
  setFiltroEstado: (estado: FiltroEstado) => void;
  busqueda: string;
  setBusqueda: (texto: string) => void;
  filasVisibles: FilaInforme[];
  seleccionPosicion: number | null;
  setSeleccionPosicion: (posicion: number | null) => void;
}

const MENSAJE_RED = 'Error de red al procesar el archivo.';

/**
 * Estado de la pantalla de importación por lote (CU-16): sucursal, archivo, vista previa y confirmación.
 * La vista previa no guarda nada; confirmar repite la misma petición con `confirmar=true`.
 */
export function useImportarRutas(): UseImportarRutasReturn {
  const [zonas, setZonas] = useState<ZonaDeRuta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [archivo, setArchivo] = useState<ArchivoLote | null>(null);
  const [fase, setFase] = useState<FaseImportacion>('inicial');
  const [respuesta, setRespuesta] = useState<RespuestaLote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDescargando, setIsDescargando] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todas');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionPosicion, setSeleccionPosicion] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const res = await fetch('/api/admin/rutas');
        if (res.ok) {
          const data = (await res.json()) as { zonas?: ZonaDeRuta[] };
          if (!cancelado) setZonas(data.zonas ?? []);
        } else if (!cancelado) {
          setError('No se pudieron cargar las sucursales.');
        }
      } catch (err: unknown) {
        logger.error('Error cargando las sucursales para importar rutas:', err);
        if (!cancelado) setError(MENSAJE_RED);
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    };
    void cargar();
    return () => {
      cancelado = true;
    };
  }, []);

  // Solo las sucursales con zonas en el alcance de quien opera
  const sucursales = useMemo<SucursalOpcion[]>(() => {
    const porId = new Map<number, string>();
    for (const z of zonas) porId.set(z.id_sucursal, z.sucursal_nombre);
    return [...porId].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [zonas]);

  // Cualquier cambio de sucursal o de archivo invalida lo evaluado
  const limpiarResultado = useCallback(() => {
    setRespuesta(null);
    setFase('inicial');
    setError(null);
    setFiltroEstado('todas');
    setBusqueda('');
    setSeleccionPosicion(null);
  }, []);

  const elegirSucursal = useCallback(
    (id: number | null) => {
      setIdSucursal(id);
      limpiarResultado();
    },
    [limpiarResultado]
  );

  const elegirArchivo = useCallback(
    async (file: File) => {
      limpiarResultado();
      setArchivo(null);
      // No se lee a memoria un archivo que el servidor va a rechazar de todas formas
      if (file.size > LOTE_MAX_BYTES) {
        setError(`El archivo pesa ${tamanoLegible(file.size)} y el máximo es ${tamanoLegible(LOTE_MAX_BYTES)}.`);
        return;
      }
      try {
        const texto = await file.text();
        const lote = interpretarLoteRutas(texto);
        if (!lote.ok) {
          setError(lote.mensaje);
          return;
        }
        setArchivo({ nombre: file.name, texto, rutas: lote.rutas, rechazadas: lote.rechazadas });
      } catch (err: unknown) {
        logger.error('Error leyendo el archivo de rutas:', err);
        setError('No se pudo leer el archivo.');
      }
    },
    [limpiarResultado]
  );

  const enviar = useCallback(
    async (confirmar: boolean) => {
      if (idSucursal === null || !archivo) return;
      setError(null);
      setFase(confirmar ? 'confirmando' : 'evaluando');
      try {
        const consulta = new URLSearchParams({
          id_sucursal: String(idSucursal),
          confirmar: String(confirmar),
          nombre_archivo: archivo.nombre,
        });
        const res = await fetch(`/api/admin/rutas/lote?${consulta.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: archivo.texto,
        });
        const data = (await res.json()) as Partial<RespuestaLote> & { error?: string };
        if (!res.ok || !data.resumen || !data.filas) {
          setError(data.error ?? 'No se pudo procesar el archivo.');
          setFase(confirmar ? 'previa' : 'inicial');
          return;
        }
        setRespuesta({ confirmado: data.confirmado === true, resumen: data.resumen, filas: data.filas });
        setFase(confirmar ? 'confirmada' : 'previa');
        setFiltroEstado('todas');
        setSeleccionPosicion(null);
      } catch (err: unknown) {
        logger.error('Error al procesar el lote de rutas:', err);
        setError(MENSAJE_RED);
        setFase(confirmar ? 'previa' : 'inicial');
      }
    },
    [idSucursal, archivo]
  );

  const evaluar = useCallback(() => enviar(false), [enviar]);
  const confirmar = useCallback(() => enviar(true), [enviar]);

  const descargarInforme = useCallback(async () => {
    if (!respuesta || !archivo) return;
    setIsDescargando(true);
    try {
      await descargarInformeExcel(respuesta.filas, respuesta.resumen, {
        sucursal: sucursales.find((s) => s.id === idSucursal)?.nombre ?? '',
        archivo: archivo.nombre,
        generado: new Date().toLocaleString('es-BO'),
        confirmado: respuesta.confirmado,
      });
    } catch (err: unknown) {
      logger.error('Error generando el informe de correcciones:', err);
      setError('No se pudo generar el archivo de Excel.');
    } finally {
      setIsDescargando(false);
    }
  }, [respuesta, archivo, sucursales, idSucursal]);

  const reiniciar = useCallback(() => {
    setArchivo(null);
    limpiarResultado();
  }, [limpiarResultado]);

  const filasVisibles = useMemo(
    () => (respuesta ? filtrarFilas(respuesta.filas, filtroEstado, busqueda) : []),
    [respuesta, filtroEstado, busqueda]
  );

  return {
    isLoading,
    sucursales,
    idSucursal,
    elegirSucursal,
    archivo,
    elegirArchivo,
    fase,
    respuesta,
    error,
    evaluar,
    confirmar,
    descargarInforme,
    isDescargando,
    reiniciar,
    filtroEstado,
    setFiltroEstado,
    busqueda,
    setBusqueda,
    filasVisibles,
    seleccionPosicion,
    setSeleccionPosicion,
  };
}
