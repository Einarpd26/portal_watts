// Contenido de cada reporte de Excel (ADR-005 D6): columnas y filas a partir de los mismos datos y filtros de las
// pantallas. Sin dependencias de Node ni del navegador: el archivo lo arma src/lib/reporteExcel.ts.
import { DIAS_ORDEN, DIA_LABELS } from './diasSemana.ts';
import { FRECUENCIA_LABELS } from './frecuencias.ts';
import { CLASES_ABC, DESCRIPCION_CLASE, filtrarClientes, type FiltrosClientes } from './clientesMapa.ts';
import { ETIQUETA_TRAMO, filtrarCobertura, momentoDeCalculo, nombreDelMes, ordenarCobertura, resumirCobertura, tramoDe, type FiltrosCobertura, type OrdenCobertura } from './coberturaRutas.ts';
import { filtrarConsulta, type FiltrosConsulta } from './consultaPlanificacion.ts';
import { rutasDuplicadasEnSemana } from './planificacionDuplicados.ts';
import { TITULO_REPORTE } from './reportes.ts';
import type { ClaseAbc, CoberturaListado, ConsultaPlanificacion, MapaClientes } from '@/types';

export interface ColumnaReporte {
  encabezado: string;
  /** Ancho en caracteres */
  ancho: number;
  /** Formato de número de Excel («0.0», «#,##0.00», «dd/mm/yyyy»); sin él, la celda es texto */
  formato?: string;
  alineacion?: 'left' | 'center' | 'right';
}

export type Celda = string | number | Date | null;

export interface ReporteExcel {
  hoja: string;
  titulo: string;
  /** Líneas bajo el título: alcance, fecha del dato, filtros aplicados */
  notas: string[];
  columnas: ColumnaReporte[];
  filas: Celda[][];
  /** Color de relleno (ARGB, «FFFEE2E2») de una celda concreta, p. ej. el tramo de la cobertura */
  relleno?: (fila: number, columna: number, valor: Celda) => string | undefined;
}

const ROJO = 'FFFEE2E2';
const AMBAR = 'FFFEF3C7';
const VERDE = 'FFDCFCE7';
const GRIS = 'FFE5E7EB';

/** «Zona: ZN · Supervisor: Acosta»; sin filtros activos, «Sin filtros» */
const textoDeFiltros = (activos: Array<[string, string | null]>): string => {
  const puestos = activos.flatMap(([nombre, valor]) => (valor === null ? [] : [`${nombre}: ${valor}`]));
  return puestos.length > 0 ? `Filtros: ${puestos.join(' · ')}` : 'Sin filtros';
};

const fechaDeExcel = (fecha: string | null): Date | null => (fecha ? new Date(`${fecha}T12:00:00Z`) : null);

// --- Cobertura (CU-13) ---------------------------------------------------------------------------------------

const RELLENO_TRAMO = { baja: ROJO, media: AMBAR, alta: VERDE } as const;

export function reporteCobertura(cobertura: CoberturaListado, filtros: FiltrosCobertura, orden: OrdenCobertura): ReporteExcel {
  const rutas = ordenarCobertura(filtrarCobertura(cobertura.rutas, filtros), orden);
  const resumen = resumirCobertura(rutas);
  const zona = filtros.idZona === null ? null : (cobertura.rutas.find((r) => r.id_zona === filtros.idZona)?.codigo_zona ?? String(filtros.idZona));
  const supervisor = filtros.idSupervisor === null ? null : (cobertura.rutas.find((r) => r.id_supervisor === filtros.idSupervisor)?.supervisor_nombre ?? String(filtros.idSupervisor));
  const ruta = filtros.idRuta === null ? null : (cobertura.rutas.find((r) => r.id === filtros.idRuta)?.codigo_ruta ?? String(filtros.idRuta));

  return {
    hoja: 'Cobertura',
    titulo: `${TITULO_REPORTE.cobertura} — ${nombreDelMes(cobertura.mes) ?? 'mes en curso'}`,
    notas: [
      `Último recálculo: ${momentoDeCalculo(cobertura.calculado_en) ?? 'sin calcular'}. Las ventas del día se incorporan en el siguiente recálculo nocturno.`,
      `Cobertura general: ${resumen.porcentaje} % (${resumen.clientesAtendidos} de ${resumen.clientesHabilitados} clientes habilitados) en ${resumen.rutas} rutas.`,
      textoDeFiltros([['Zona', zona], ['Supervisor', supervisor], ['Ruta', ruta]]),
    ],
    columnas: [
      { encabezado: 'Ruta', ancho: 12 },
      { encabezado: 'Nombre de la ruta', ancho: 28 },
      { encabezado: 'Zona', ancho: 10 },
      { encabezado: 'Supervisor', ancho: 30 },
      { encabezado: 'Clientes habilitados', ancho: 14, formato: '0', alineacion: 'right' },
      { encabezado: 'Clientes atendidos', ancho: 14, formato: '0', alineacion: 'right' },
      { encabezado: 'Cobertura (%)', ancho: 14, formato: '0.0', alineacion: 'right' },
      { encabezado: 'Tramo', ancho: 16 },
    ],
    filas: rutas.map((r) => [
      r.codigo_ruta,
      r.ruta,
      r.codigo_zona,
      r.supervisor_nombre ?? 'Sin supervisor',
      r.clientes_habilitados,
      r.clientes_atendidos,
      r.porcentaje,
      ETIQUETA_TRAMO[tramoDe(r.porcentaje)],
    ]),
    relleno: (fila, columna) => (columna === 6 || columna === 7 ? RELLENO_TRAMO[tramoDe(rutas[fila].porcentaje)] : undefined),
  };
}

// --- Planificación (CU-10) -----------------------------------------------------------------------------------

export function reportePlanificacion(consulta: ConsultaPlanificacion, filtros: FiltrosConsulta): ReporteExcel {
  const { rutas, visitas } = filtrarConsulta(consulta.rutas, consulta.slots, consulta.visitas, filtros);
  const duplicadas = rutasDuplicadasEnSemana(visitas);
  const slotDe = new Map(consulta.slots.map((s) => [s.id, s]));
  const rutaDe = new Map(rutas.map((r) => [r.id, r]));
  const conVisitas = new Set(visitas.map((v) => v.id_ruta));

  // Con un día elegido solo salen las visitas de ese día; las rutas sin ninguna visita se listan aparte, sin día
  const delReporte = visitas.filter((v) => filtros.dia === null || v.dia === filtros.dia);
  const filas: Array<{ clave: string; celdas: Array<string | number | null> }> = [];
  for (const v of delReporte) {
    const ruta = rutaDe.get(v.id_ruta);
    if (!ruta) continue;
    const slot = slotDe.get(v.id_slot);
    filas.push({
      clave: `${ruta.codigo_zona}|${ruta.codigo_ruta}|${DIAS_ORDEN.indexOf(v.dia)}`,
      celdas: [
        ruta.sucursal_nombre,
        ruta.codigo_zona,
        ruta.codigo_ruta,
        ruta.ruta,
        ruta.supervisor_nombre ?? 'Sin supervisor',
        slot?.vendedor_nombre ?? 'Slot sin vendedor',
        DIA_LABELS[v.dia],
        FRECUENCIA_LABELS[v.frecuencia],
        duplicadas.has(v.id_ruta) ? 'Sí' : 'No',
      ],
    });
  }
  for (const ruta of rutas) {
    if (conVisitas.has(ruta.id)) continue;
    filas.push({
      clave: `${ruta.codigo_zona}|${ruta.codigo_ruta}|9`,
      celdas: [ruta.sucursal_nombre, ruta.codigo_zona, ruta.codigo_ruta, ruta.ruta, ruta.supervisor_nombre ?? 'Sin supervisor', 'Sin planificar', null, null, 'No'],
    });
  }
  filas.sort((a, b) => a.clave.localeCompare(b.clave));

  const sinPlanificar = rutas.filter((r) => !conVisitas.has(r.id)).length;
  const buscar = <T,>(id: number | null, f: (r: (typeof consulta.rutas)[number]) => boolean, mostrar: (r: (typeof consulta.rutas)[number]) => T) =>
    id === null ? null : (() => { const r = consulta.rutas.find(f); return r ? String(mostrar(r)) : String(id); })();
  const vendedor = filtros.idVendedor === null ? null : (consulta.slots.find((s) => s.id_vendedor === filtros.idVendedor)?.vendedor_nombre ?? String(filtros.idVendedor));

  return {
    hoja: 'Planificación',
    titulo: TITULO_REPORTE.planificacion,
    notas: [
      filtros.dia === null
        ? `${rutas.length} rutas: ${delReporte.length} visitas planificadas, ${sinPlanificar} sin planificar y ${[...duplicadas].filter((id) => rutaDe.has(id)).length} duplicadas (RN-04).`
        : `${delReporte.length} visitas el ${DIA_LABELS[filtros.dia].toLowerCase()}. Las ${sinPlanificar} rutas listadas como «Sin planificar» no tienen ninguna visita en la semana.`,
      textoDeFiltros([
        ['Sucursal', buscar(filtros.idSucursal, (r) => r.id_sucursal === filtros.idSucursal, (r) => r.sucursal_nombre)],
        ['Zona', buscar(filtros.idZona, (r) => r.id_zona === filtros.idZona, (r) => r.codigo_zona)],
        ['Supervisor', buscar(filtros.idSupervisor, (r) => r.id_supervisor === filtros.idSupervisor, (r) => r.supervisor_nombre ?? '')],
        ['Vendedor', vendedor],
        ['Ruta', buscar(filtros.idRuta, (r) => r.id === filtros.idRuta, (r) => r.codigo_ruta)],
        ['Día', filtros.dia === null ? null : DIA_LABELS[filtros.dia]],
      ]),
    ],
    columnas: [
      { encabezado: 'Sucursal', ancho: 18 },
      { encabezado: 'Zona', ancho: 10 },
      { encabezado: 'Ruta', ancho: 12 },
      { encabezado: 'Nombre de la ruta', ancho: 28 },
      { encabezado: 'Supervisor', ancho: 30 },
      { encabezado: 'Vendedor', ancho: 30 },
      { encabezado: 'Día', ancho: 12 },
      { encabezado: 'Frecuencia', ancho: 14 },
      { encabezado: 'Duplicada', ancho: 11, alineacion: 'center' },
    ],
    filas: filas.map((f) => f.celdas),
    relleno: (fila, columna, valor) => {
      if (columna === 8 && valor === 'Sí') return AMBAR;
      if (columna === 5 && valor === 'Sin planificar') return GRIS;
      return undefined;
    },
  };
}

// --- Clientes (CU-12) ----------------------------------------------------------------------------------------

const RELLENO_CLASE: Record<ClaseAbc, string> = { A: VERDE, B: AMBAR, C: ROJO, I: GRIS };
const ordenDeClase = (clase: ClaseAbc | null) => (clase === null ? CLASES_ABC.length : CLASES_ABC.indexOf(clase));

export function reporteClientes(mapa: MapaClientes, filtros: FiltrosClientes): ReporteExcel {
  const rutaDe = new Map(mapa.rutas.map((r) => [r.id, r]));
  const clientes = filtrarClientes(mapa.clientes, filtros).sort(
    (a, b) =>
      (rutaDe.get(a.id_ruta)?.codigo_ruta ?? '').localeCompare(rutaDe.get(b.id_ruta)?.codigo_ruta ?? '') ||
      ordenDeClase(a.clasificacion) - ordenDeClase(b.clasificacion) ||
      b.total_ventas - a.total_ventas
  );
  const porClase = Object.fromEntries(CLASES_ABC.map((c) => [c, clientes.filter((x) => x.clasificacion === c).length])) as Record<ClaseAbc, number>;
  const clasesPedidas = CLASES_ABC.filter((c) => filtros.clases.has(c));
  const ruta = filtros.idRuta === null ? null : (rutaDe.get(filtros.idRuta)?.codigo_ruta ?? String(filtros.idRuta));

  return {
    hoja: 'Clientes',
    titulo: TITULO_REPORTE.clientes,
    notas: [
      `${clientes.length} clientes: A ${porClase.A}, B ${porClase.B}, C ${porClase.C}, inactivos ${porClase.I}. Ventas vigentes de los últimos 6 meses.`,
      `A: ${DESCRIPCION_CLASE.A.toLowerCase()} · B: ${DESCRIPCION_CLASE.B.toLowerCase()} · C: ${DESCRIPCION_CLASE.C.toLowerCase()} · I: ${DESCRIPCION_CLASE.I.toLowerCase()}.`,
      textoDeFiltros([
        ['Ruta', ruta],
        ['Clases', clasesPedidas.length === CLASES_ABC.length && filtros.sinClase ? null : `${clasesPedidas.join(', ') || 'ninguna'}${filtros.sinClase ? ' y no habilitados' : ''}`],
        ['Búsqueda', filtros.texto.trim() || null],
      ]),
    ],
    columnas: [
      { encabezado: 'Código', ancho: 12 },
      { encabezado: 'Cliente', ancho: 30 },
      { encabezado: 'Nombre comercial', ancho: 26 },
      { encabezado: 'Ruta', ancho: 10 },
      { encabezado: 'Clase', ancho: 9, alineacion: 'center' },
      { encabezado: 'Ventas 6 meses (Bs)', ancho: 18, formato: '#,##0.00', alineacion: 'right' },
      { encabezado: '% acumulado de la ruta', ancho: 16, formato: '0.0', alineacion: 'right' },
      { encabezado: 'Última compra', ancho: 14, formato: 'dd/mm/yyyy', alineacion: 'center' },
      { encabezado: 'Rubro', ancho: 18 },
      { encabezado: 'Dirección', ancho: 30 },
      { encabezado: 'Referencia', ancho: 22 },
      { encabezado: 'Teléfono', ancho: 14 },
    ],
    filas: clientes.map((c) => [
      c.codigo_cliente,
      c.nombre_completo,
      c.nombre_comercial,
      rutaDe.get(c.id_ruta)?.codigo_ruta ?? '',
      c.clasificacion ?? 'No habilitado',
      c.total_ventas,
      Math.round(c.porcentaje_acumulado * 1000) / 10,
      fechaDeExcel(c.ultima_compra),
      c.rubro,
      c.direccion,
      c.referencia,
      c.telefono,
    ]),
    relleno: (fila, columna) => {
      if (columna !== 4) return undefined;
      const clase = clientes[fila].clasificacion;
      return clase ? RELLENO_CLASE[clase] : GRIS;
    },
  };
}
