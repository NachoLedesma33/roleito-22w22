import { describe, it, expect } from 'vitest';
import { staticUrl } from './staticUrl';

describe('staticUrl', () => {
  it('convierte un path absoluto de assets en la URL del backend', () => {
    expect(staticUrl('/srv/roleito/data/assets/campaign/maps/taverna.png')).toBe(
      '/api/static/campaign/maps/taverna.png',
    );
  });

  it('normaliza separadores Windows', () => {
    expect(staticUrl('C:\\roleito\\data\\assets\\campaign\\audio\\lluvia.mp3')).toBe(
      '/api/static/campaign/audio/lluvia.mp3',
    );
  });

  it('devuelve null para paths sin el marcador /assets/', () => {
    expect(staticUrl('/tmp/imagen.png')).toBeNull();
  });

  it('devuelve null para entradas vacías o ausentes', () => {
    expect(staticUrl(null)).toBeNull();
    expect(staticUrl(undefined)).toBeNull();
    expect(staticUrl('')).toBeNull();
  });
});
