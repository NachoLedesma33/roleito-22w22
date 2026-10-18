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

/**
 * Brillo máximo y promedio de una región, con un margen.
 *
 * Para preguntar "¿hay ALGO asomando por encima de la niebla?" sin saber
 * dónde está clavado ese algo: el token no cae en una coordenada fija porque
 * depende del ancho de la ventana y de los paneles que la cubren. Y para el
 * fondo conviene el **promedio**, no un punto: un fondo a damero tiene celdas
 * claras y oscuras, así que un punto suelto mide una u otra según dónde caiga.
 *
 * Una sola llamada a `readPixels` de toda la región: 300 readPixels de a uno
 * por pixel es lentísimo y además lee un frame distinto en cada una.
 */
export async function brightnessInRegion(
  page: Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<{ max: number; avg: number }> {
  return page.evaluate(
    ([ax, ay, bx, by]) =>
      new Promise((resolve) => {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (!canvas) {
          resolve({ max: 0, avg: 0 });
          return;
        }
        const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as
          | WebGL2RenderingContext
          | WebGLRenderingContext
          | null;
        if (!gl) {
          resolve({ max: 0, avg: 0 });
          return;
        }
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const px0 = Math.floor(gl.drawingBufferWidth * (ax as number));
            const py0 = Math.floor(gl.drawingBufferHeight * (ay as number));
            const w = Math.max(1, Math.floor(gl.drawingBufferWidth * ((bx as number) - (ax as number))));
            const h = Math.max(1, Math.floor(gl.drawingBufferHeight * ((by as number) - (ay as number))));
            const buf = new Uint8Array(w * h * 4);
            gl.readPixels(px0, py0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            let max = 0;
            let sum = 0;
            let n = 0;
            for (let i = 0; i < buf.length; i += 4) {
              if (buf[i + 3] === 0) continue;
              const b = (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
              if (b > max) max = b;
              sum += b;
              n++;
            }
            resolve({ max: Math.round(max), avg: n ? Math.round(sum / n) : 0 });
          }),
        );
      }),
    [x0, y0, x1, y1] as [number, number, number, number],
  );
}

export async function maxBrightnessInRegion(
  page: Page,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Promise<number> {
  return (await brightnessInRegion(page, x0, y0, x1, y1)).max;
}