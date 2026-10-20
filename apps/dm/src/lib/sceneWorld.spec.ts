import { describe, it, expect } from 'vitest';
import { sceneWorldSize, gridCellUnits, WORLD_HALF_SPAN } from './sceneWorld';

describe('sceneWorldSize', () => {
  it('usa WORLD_HALF_SPAN con map_scale 1', () => {
    const { mapH, mapW } = sceneWorldSize(1, 1);
    expect(mapH).toBe(WORLD_HALF_SPAN);
    expect(mapW).toBe(WORLD_HALF_SPAN);
  });

  it('escala el alto con map_scale', () => {
    expect(sceneWorldSize(2, 1).mapH).toBe(WORLD_HALF_SPAN * 2);
  });

  it('deriva el ancho del alto y del aspecto de la imagen', () => {
    const { mapH, mapW } = sceneWorldSize(2, 1.5);
    expect(mapW).toBe(mapH * 1.5);
  });

  it('trata map_scale ausente o null como escala 1', () => {
    expect(sceneWorldSize(undefined, 1).mapH).toBe(WORLD_HALF_SPAN);
    expect(sceneWorldSize(null, 1).mapH).toBe(WORLD_HALF_SPAN);
  });

  it('mantiene las coordenadas normalizadas en [0,1] con imagen rectangular', () => {
    // mapH/mapW son SEMI-dimensiones: el mundo va de -mapW/2 a +mapW/2, y la
    // normalización `x / mapW + 0.5` tiene que dar 0 y 1 en esos bordes.
    const { mapW } = sceneWorldSize(1, 16 / 9);
    expect(-mapW / 2 / mapW + 0.5).toBe(0);
    expect(mapW / 2 / mapW + 0.5).toBe(1);
  });
});

describe('gridCellUnits', () => {
  it('convierte la celda de pixeles a unidades del mundo', () => {
    // El mundo mide WORLD_HALF_SPAN unidades de alto (map_scale 1) sobre una
    // imagen de 400 px: 1 px = 0.025 unidades, asi que 50 px son 1.25.
    expect(gridCellUnits(50, 400, 1)).toBeCloseTo(1.25);
  });

  it('escala con map_scale', () => {
    expect(gridCellUnits(50, 400, 2)).toBeCloseTo(2.5);
  });

  it('devuelve 0 si no hay celda o no hay imagen', () => {
    expect(gridCellUnits(0, 400, 1)).toBe(0);
    expect(gridCellUnits(50, 0, 1)).toBe(0);
  });
});
