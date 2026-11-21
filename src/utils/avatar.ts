// Avatar con iniciales para las listas de personas. Sin dependencias de Node ni del navegador.
const COLORES_AVATAR = [
  'bg-red-100 text-red-700',
  'bg-orange-100 text-orange-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-teal-100 text-teal-700',
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-pink-100 text-pink-700',
];

/** Iniciales del primer nombre y del primer apellido («Daniel» + «Acosta Roca» → «DA»); «?» si no hay nada */
export function iniciales(nombres: string, apellidos: string): string {
  const primero = (texto: string) => texto.trim().split(/\s+/)[0]?.[0] ?? '';
  const resultado = `${primero(nombres)}${primero(apellidos)}`.toUpperCase();
  return resultado === '' ? '?' : resultado;
}

/** Color del avatar, siempre el mismo para el mismo nombre */
export function colorDeAvatar(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  return COLORES_AVATAR[Math.abs(hash) % COLORES_AVATAR.length];
}
