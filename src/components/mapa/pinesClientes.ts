// Marcadores en gota del mapa de clientes (CU-12). Se dibujan una vez en un canvas y se registran como imágenes
// del mapa: una capa de símbolos los pinta, así que escala a miles de clientes sin un elemento HTML por cliente.
// Solo para el navegador (usa canvas).
import { COLOR_CLASE, COLOR_SIN_CLASE, CLASES_ABC } from '@/utils/clientesMapa';

/** Cuántos píxeles reales tiene cada píxel lógico: nítido en pantallas de alta densidad */
const PIXEL_RATIO = 2;
const TAMANO = { normal: [26, 34], elegido: [36, 48] } as const;

/** Nombre de la imagen de un pin: «pin-A», «pin-sin», «pin-B-sel» */
export const nombreDePin = (clase: string, elegido: boolean) => `pin-${clase}${elegido ? '-sel' : ''}`;

function dibujarPin(color: string, elegido: boolean): ImageData {
  const [ancho, alto] = TAMANO[elegido ? 'elegido' : 'normal'];
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho * PIXEL_RATIO;
  lienzo.height = alto * PIXEL_RATIO;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite dibujar los marcadores del mapa');
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);

  // Gota: círculo arriba y punta abajo
  const r = ancho / 2;
  ctx.fillStyle = color;
  ctx.fill(new Path2D(`M${r} ${alto} C${r} ${alto}, 0 ${ancho * 0.7}, 0 ${r} A${r} ${r} 0 1 1 ${ancho} ${r} C${ancho} ${ancho * 0.7}, ${r} ${alto}, ${r} ${alto}Z`));
  if (elegido) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r, r, r - 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r, r, ancho * 0.22, 0, Math.PI * 2);
  ctx.fill();
  return ctx.getImageData(0, 0, lienzo.width, lienzo.height);
}

interface MapaConImagenes {
  hasImage: (nombre: string) => boolean;
  addImage: (nombre: string, imagen: ImageData, opciones: { pixelRatio: number }) => void;
}

/** Registra los pines de cada clase (y el de «sin clase»), normales y elegidos; no repite los que ya están */
export function registrarPines(mapa: MapaConImagenes) {
  const colores: [string, string][] = [...CLASES_ABC.map((c): [string, string] => [c, COLOR_CLASE[c]]), ['sin', COLOR_SIN_CLASE]];
  for (const [clase, color] of colores) {
    for (const elegido of [false, true]) {
      const nombre = nombreDePin(clase, elegido);
      if (!mapa.hasImage(nombre)) mapa.addImage(nombre, dibujarPin(color, elegido), { pixelRatio: PIXEL_RATIO });
    }
  }
}
