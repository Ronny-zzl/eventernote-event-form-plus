import { describe, expect, it } from 'vitest';
import { uploadSize } from '../src/features/imageRules';

describe('uploadSize', () => {
  it('长边超过 700 时不放大', () => {
    expect(uploadSize(701, 701)).toBeNull();
    expect(uploadSize(800, 300)).toBeNull();
    expect(uploadSize(300, 800)).toBeNull();
  });

  it('长边不超过 700 时放大到 701', () => {
    expect(uploadSize(700, 700)).toEqual({ width: 701, height: 701 });
    expect(uploadSize(300, 300)).toEqual({ width: 701, height: 701 });
    expect(uploadSize(454, 700)).toEqual({ width: 455, height: 701 });
    expect(uploadSize(700, 499)).toEqual({ width: 701, height: 500 });
    expect(uploadSize(700, 1)).toEqual({ width: 701, height: 1 });
  });
});
