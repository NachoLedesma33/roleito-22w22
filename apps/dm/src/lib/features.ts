/**
 * Feature flags de desarrollo. Default off: sin tocar nada, el comportamiento
 * es el actual.
 *
 * `dice3d` habilita el sistema de dados 3D (ver PLAN-DADOS-3D.md). Se prende en
 * runtime con `localStorage.setItem('dice3d', '1')` y se apaga con `removeItem`.
 */
export function isDice3dEnabled(): boolean {
  try {
    return localStorage.getItem('dice3d') === '1';
  } catch {
    return false;
  }
}
