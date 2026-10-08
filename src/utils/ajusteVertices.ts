// Ajuste (snapping) del dibujo a los vértices de las rutas vecinas (CU-05, ADR-002 D6).
// Solo vértices, no bordes: un punto a mitad de un borde vecino se corre al guardarse en la
// rejilla de 1e-6 grados y puede invadir la vecina; los vértices ya están en la rejilla y se
// comparten exactos. Sin dependencias de Node.
import type { PoligonoRuta } from '@/types';

export type Posicion = [number, number];
export type Proyectar = (lng: number, lat: number) => { x: number; y: number };

/** Radio, en píxeles de pantalla, dentro del cual el cursor se pega a un vértice vecino */
export const RADIO_AJUSTE_PX = 12;

/** Vértices únicos de los anillos exteriores de las rutas (el último repite al primero) */
export function verticesDeRutas(poligonos: PoligonoRuta[]): Posicion[] {
  const vistos = new Set<string>();
  const vertices: Posicion[] = [];
  for (const p of poligonos) {
    for (const [lng, lat] of (p.coordinates[0] ?? []).slice(0, -1)) {
      const clave = `${lng},${lat}`;
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      vertices.push([lng, lat]);
    }
  }
  return vertices;
}

/** Vértice vecino más cercano al cursor dentro de `radioPx`, o undefined si no hay ninguno */
export function verticeMasCercano(
  cursor: { x: number; y: number },
  vertices: Posicion[],
  proyectar: Proyectar,
  radioPx = RADIO_AJUSTE_PX
): Posicion | undefined {
  let mejor: Posicion | undefined;
  let mejorDistancia = radioPx * radioPx;
  for (const v of vertices) {
    const { x, y } = proyectar(v[0], v[1]);
    const distancia = (x - cursor.x) ** 2 + (y - cursor.y) ** 2;
    if (distancia <= mejorDistancia) {
      mejorDistancia = distancia;
      mejor = v;
    }
  }
  return mejor;
}
