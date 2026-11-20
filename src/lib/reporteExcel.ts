import ExcelJS from 'exceljs';
import type { ReporteExcel } from '@/utils/reportesFilas';

const COLOR_ENCABEZADO = 'FF111827'; // gray-900
const COLOR_TITULO = 'FFB91C1C'; // red-700

/**
 * Libro de Excel de un reporte: título, notas, encabezado fijo con filtro automático y las filas. Devuelve los
 * bytes del archivo .xlsx para enviarlos tal cual.
 */
export async function construirLibro(reporte: ReporteExcel): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Portal Watts';
  libro.created = new Date();
  const hoja = libro.addWorksheet(reporte.hoja.slice(0, 31));
  const ultima = reporte.columnas.length;

  hoja.columns = reporte.columnas.map((c) => ({ width: c.ancho }));

  const titulo = hoja.addRow([reporte.titulo]);
  hoja.mergeCells(titulo.number, 1, titulo.number, ultima);
  titulo.getCell(1).font = { bold: true, size: 14, color: { argb: COLOR_TITULO } };
  titulo.height = 22;

  for (const nota of reporte.notas) {
    const fila = hoja.addRow([nota]);
    hoja.mergeCells(fila.number, 1, fila.number, ultima);
    fila.getCell(1).font = { size: 10, color: { argb: 'FF4B5563' } };
  }
  hoja.addRow([]);

  const encabezado = hoja.addRow(reporte.columnas.map((c) => c.encabezado));
  encabezado.eachCell((celda) => {
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  encabezado.height = 22;

  reporte.filas.forEach((valores, i) => {
    const fila = hoja.addRow(valores);
    reporte.columnas.forEach((columna, j) => {
      const celda = fila.getCell(j + 1);
      if (columna.formato) celda.numFmt = columna.formato;
      if (columna.alineacion) celda.alignment = { horizontal: columna.alineacion };
      const color = reporte.relleno?.(i, j, valores[j]);
      if (color) celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });
  });

  hoja.views = [{ state: 'frozen', ySplit: encabezado.number }];
  hoja.autoFilter = { from: { row: encabezado.number, column: 1 }, to: { row: encabezado.number, column: ultima } };

  return Buffer.from(await libro.xlsx.writeBuffer());
}
