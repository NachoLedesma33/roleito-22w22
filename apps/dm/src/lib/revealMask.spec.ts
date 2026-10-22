import { describe, expect, it } from 'vitest';
import {
  dmSeesCharacter,
  isPointRevealed,
  packReveal,
  readRevealBit,
  revealSignature,
  type RevealLike,
} from './revealMask';

/** Arma un reveal de 4x4 con la celda (col,row) revelada. */
function revealCon(celdas: [number, number][]): RevealLike {
  const cols = 4;
  const rows = 4;
  const alpha = new Float32Array(cols * rows);
  for (const [col, row] of celdas) alpha[row * cols + col] = 1;
  return {
    player_id: 'p1',
    cols,
    rows,
    res: 1,
    map_width: 4,
    map_height: 4,
    bits: packReveal(alpha, cols, rows),
  };
}

describe('packReveal', () => {
  it('empaqueta 1 bit por celda y lo vuelve a leer', () => {
    const cols = 4;
    const rows = 4;
    const alpha = new Float32Array(cols * rows);
    alpha[0] = 1; // (0,0)
    alpha[5] = 1; // (1,1)
    alpha[15] = 1; // (3,3)
    const bits = packReveal(alpha, cols, rows);
    expect(readRevealBit(bits, 0)).toBe(true);
    expect(readRevealBit(bits, 5)).toBe(true);
    expect(readRevealBit(bits, 15)).toBe(true);
    expect(readRevealBit(bits, 1)).toBe(false);
    expect(readRevealBit(bits, 14)).toBe(false);
  });

  it('ignora las celdas con alpha 0', () => {
    const alpha = new Float32Array(4);
    // 4 celdas -> 1 byte -> "AA==" en base64
    expect(packReveal(alpha, 2, 2)).toBe('AA==');
  });
});

describe('revealSignature', () => {
  it('distingue dos mascaras distintas', () => {
    const a = new Float32Array(16);
    a[0] = 1;
    const b = new Float32Array(16);
    b[1] = 1;
    expect(revealSignature(a)).not.toBe(revealSignature(b));
  });

  it('es igual para la misma mascara', () => {
    const a = new Float32Array(16);
    a[3] = 1;
    const b = new Float32Array(16);
    b[3] = 1;
    expect(revealSignature(a)).toBe(revealSignature(b));
  });
});

describe('isPointRevealed', () => {
  it('true dentro de la celda revelada', () => {
    const r = revealCon([[1, 1]]);
    // celda (1,1): x = -2 + 1.5 = -0.5, z = -0.5
    expect(isPointRevealed([r], -0.5, -0.5)).toBe(true);
  });

  it('false en una celda no revelada', () => {
    const r = revealCon([[1, 1]]);
    expect(isPointRevealed([r], 0.5, 0.5)).toBe(false);
  });

  it('false fuera del mapa', () => {
    const r = revealCon([[1, 1]]);
    expect(isPointRevealed([r], 100, 100)).toBe(false);
  });

  it('basta con que lo revele ALGUN jugador', () => {
    const a = revealCon([[0, 0]]);
    const b = revealCon([[3, 3]]);
    // la celda (3,3) cubre x = -2 + 3.5 = 1.5, z = 1.5
    expect(isPointRevealed([a, b], 1.5, 1.5)).toBe(true);
  });
});

describe('dmSeesCharacter', () => {
  const reveal = revealCon([[1, 1]]);

  it('con el toggle prendido lo ve siempre', () => {
    expect(
      dmSeesCharacter({ reveals: [reveal], x: 0.5, z: 0.5, lit: false, seeAll: true }),
    ).toBe(true);
  });

  it('si esta iluminado lo ve siempre', () => {
    expect(
      dmSeesCharacter({ reveals: [reveal], x: 0.5, z: 0.5, lit: true, seeAll: false }),
    ).toBe(true);
  });

  it('sin reveals publicados lo ve (no se le tapa la mesa de golpe)', () => {
    expect(
      dmSeesCharacter({ reveals: [], x: 0.5, z: 0.5, lit: false, seeAll: false }),
    ).toBe(true);
  });

  it('fuera de lo revelado y sin luz, no lo ve', () => {
    expect(
      dmSeesCharacter({ reveals: [reveal], x: 0.5, z: 0.5, lit: false, seeAll: false }),
    ).toBe(false);
  });

  it('dentro de lo revelado, lo ve', () => {
    expect(
      dmSeesCharacter({ reveals: [reveal], x: -0.5, z: -0.5, lit: false, seeAll: false }),
    ).toBe(true);
  });
});
