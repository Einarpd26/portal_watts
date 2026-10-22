import type { FilaInforme, ResumenInforme } from '@/utils/rutaInforme';
import { hojasDelInforme, nombreDelArchivo, type MetaInforme } from '@/utils/rutaInformeExcel';

/**
 * Genera el informe de correcciones (CU-16 A6) como archivo de Excel y lo descarga. Se arma en el
 * navegador a partir del resultado real de la importación: volver a evaluar en el servidor daría otro
 * informe (después de confirmar, las rutas importadas figurarían "sin cambios"). La biblioteca se carga
 * recién al pedir el informe, para no pesar en el resto de la pantalla.
 */
export async function descargarInformeExcel(filas: FilaInforme[], resumen: ResumenInforme, meta: MetaInforme): Promise<void> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  await writeExcelFile(hojasDelInforme(filas, resumen, meta)).toFile(nombreDelArchivo(new Date()));
}
