/**
 * Feature flags de desarrollo. Default off: sin tocar nada, el comportamiento
 * es el actual.
 *
 * `dice3d` viene PRENDIDO por default (ver PLAN-DADOS-3D.md); el flag actua
 * como kill-switch por si la mesa 3D rompe. Se apaga con
 * `localStorage.setItem('dice3d', '0')` y se vuelve a prender con
 * `removeItem('dice3d')` (o cualquier valor distinto de '0').
 */
export function isDice3dEnabled(): boolean {
  try {
    return localStorage.getItem('dice3d') !== '0';
  } catch {
    return true;
  }
}
