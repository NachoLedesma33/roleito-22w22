import { Page } from '@playwright/test';

/**
 * Genera un mapa "blueprint" en PNG sin binarios en el repo.
 *
 * `tests/assets/` no se versiona (ver su README), así que un fixture de mapa no
 * puede ir commiteado. El navegador ya está en la prueba: se dibuja con canvas
 * y se vuelve a base64. Menos moving parts que un encoder de PNG en Node.
 */
export async function blueprintMapPng(
  page: Page,
  opts: { width?: number; height?: number } = {},
): Promise<Buffer> {
  const width = opts.width ?? 600;
  const height = opts.height ?? 400;
  const dataUrl = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      // Tres verticales y dos horizontales: un plano con rooms claros.
      for (const x of [0.15, 0.5, 0.85]) {
        ctx.beginPath();
        ctx.moveTo(Math.round(width * x), Math.round(height * 0.1));
        ctx.lineTo(Math.round(width * x), Math.round(height * 0.9));
        ctx.stroke();
      }
      for (const y of [0.3, 0.7]) {
        ctx.beginPath();
        ctx.moveTo(Math.round(width * 0.1), Math.round(height * y));
        ctx.lineTo(Math.round(width * 0.9), Math.round(height * y));
        ctx.stroke();
      }
      return canvas.toDataURL('image/png');
    },
    { width, height },
  );
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}