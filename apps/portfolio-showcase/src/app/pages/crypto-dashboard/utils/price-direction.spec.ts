import { priceDirection } from './price-direction';

describe('priceDirection', () => {
  it('returns "up" for a positive change', () => {
    expect(priceDirection(4.21)).toBe('up');
  });

  it('returns "down" for a negative change', () => {
    expect(priceDirection(-2.5)).toBe('down');
  });

  it('returns "neutral" for a change of exactly 0', () => {
    expect(priceDirection(0)).toBe('neutral');
  });

  it('returns "up" for a very small non-zero positive change, no rounding to neutral', () => {
    expect(priceDirection(0.0001)).toBe('up');
  });

  it('returns "down" for a very small non-zero negative change, no rounding to neutral', () => {
    expect(priceDirection(-0.0001)).toBe('down');
  });
});
