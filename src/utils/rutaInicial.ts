// Pantalla donde cae cada rol al iniciar sesión o al ser rechazado de una página sin permiso.
// Es la única fuente de este destino: no existe un «dashboard» intermedio.
export function rutaInicialPorRol(rolCodigo: string): string {
  switch (rolCodigo) {
    case 'GERENCIA_COMERCIAL':
    case 'FISCALIZADOR':
      return '/admin/usuarios';
    case 'SUPERVISOR':
      return '/planificacion';
    case 'VENDEDOR':
      return '/mapa';
    default:
      return '/sin-acceso';
  }
}
