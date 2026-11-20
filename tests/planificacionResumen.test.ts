import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumirPlanificacion, semanaIso } from '../src/utils/planificacionResumen.ts';
import type { SlotItem, VisitaPlanificada } from '../src/types/index.ts';

const slot = (id: number): SlotItem => ({ id, nombre: null, orden: id, id_vendedor: null, vendedor_nombre: null });
const visita = (id: number, id_slot: number, id_ruta: number, dia: VisitaPlanificada['dia'] = 'LU'): VisitaPlanificada => ({
  id,
  id_slot,
  id_ruta,
  codigo_ruta: `R${id_ruta}`,
  ruta: `Ruta ${id_ruta}`,
  dia,
  frecuencia: 'semanal',
});

test('sin slots ni visitas todo es cero', () => {
  assert.deepEqual(resumirPlanificacion([], []), { slots: 0, slotsSinRutas: 0, rutasPlanificadas: 0, rutasDuplicadas: 0 });
});

test('cuenta slots sin rutas y rutas distintas', () => {
  const r = resumirPlanificacion([slot(1), slot(2), slot(3)], [visita(1, 1, 10), visita(2, 1, 11, 'MA')]);
  assert.deepEqual(r, { slots: 3, slotsSinRutas: 2, rutasPlanificadas: 2, rutasDuplicadas: 0 });
});

test('una ruta en dos slots cuenta una vez y se marca duplicada', () => {
  const r = resumirPlanificacion([slot(1), slot(2)], [visita(1, 1, 10), visita(2, 2, 10, 'MI')]);
  assert.equal(r.rutasPlanificadas, 1);
  assert.equal(r.rutasDuplicadas, 1);
});

test('semana ISO: casos de borde del cambio de año', () => {
  assert.equal(semanaIso(new Date(2026, 0, 1)), 1); // jueves: semana 1
  assert.equal(semanaIso(new Date(2027, 0, 1)), 53); // viernes: aún semana 53 de 2026
  assert.equal(semanaIso(new Date(2026, 10, 20)), 47);
});
