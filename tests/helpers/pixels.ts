import type { Page } from '@playwright/test';

/**
 * Lee un píxel del canvas de Three del POV.
 *
 * Los tests de niebla hasta ahora miraban `data-visible-cells`, que es la
 * **máscara**, no la pantalla. Con la máscara bien calculada y la textura rota la
 * niebla no se veía nada y los tests pasaban igual: dos bugs seguidos
 * (alpha invertido y `CanvasTexture` redimensionada después de la primera subida)
 * convivieron con la suite en verde.
 *
 * No se puede usar `toDataURL` ni `drawImage` sobre el canvas de WebGL sin
 * `preserveDrawingBuffer`: el buffer se limpia al componer. Lo que funciona es
 * `readPixels` dentro de `requestAnimationFrame`, con el buffer todavía vivo.
 *
 * Las coordenadas son relativas (0..1) al viewport, con la Y de Three (origen
 * abajo): `fy` 0.5 es el medio vertical de la pantalla.
 */
export async function readViewPixel(
  page: Page,
  fx: number,
  fy: number,
): Promise<[number, number, number, number] | null> {
  return page.evaluate(
    ([x, y]) =>
      new Promise((resolve) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) {
          resolve(null);
          return;
        }
        const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
          | WebGL2RenderingContext
          | WebGLRenderingContext
          | null;
        if (!gl) {
          resolve(null);
          return;
        }
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const px = Math.floor(gl.drawingBufferWidth * (x as number));
            const py = Math.floor(gl.drawingBufferHeight * (y as number));
            const buf = new Uint8Array(4);
            gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            resolve([buf[0], buf[1], buf[2], buf[3]]);
          }),
        );
      }),
    [fx, fy] as [number, number],
  );
}

/** Brillo 0..255 de un píxel RGBA: `null` (o totalmente transparente) da 0. */
export function pixelBrightness(px: [number, number, number, number] | null): number {
  if (!px) return 0;
  if (px[3] === 0) return 0;
  return Math.round((px[0] + px[1] + px[2]) / 3);
}