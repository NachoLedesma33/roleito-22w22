/**
 * Convierte un `file_path` de asset (ruta absoluta en disco bajo ASSETS_DIR)
 * en la URL pública que sirve el backend (`/api/static/<rel>`).
 *
 * Contrato: devuelve `null` — nunca una URL rota — si el path no contiene
 * el marcador `/assets/`. Los paths pueden venir con separadores Windows,
 * por eso se normalizan a `/` antes de partir.
 */
export function staticUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/assets/');
  return parts.length > 1 ? `/api/static/${parts[1]}` : null;
}
