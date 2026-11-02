/** Mensaje de error de una respuesta de la API (`{ error }`), o el indicado si no se puede leer */
export async function mensajeDeErrorApi(res: Response, porDefecto: string): Promise<string> {
  const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null;
  return cuerpo?.error ?? porDefecto;
}
