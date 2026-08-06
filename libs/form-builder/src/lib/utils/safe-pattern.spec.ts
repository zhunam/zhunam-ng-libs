import { assertSafePattern } from './safe-pattern';

describe('assertSafePattern', () => {
  it('does not throw for a normal, safe pattern', () => {
    expect(() => assertSafePattern('^[a-zA-Z]+\\d*$')).not.toThrow();
  });

  it('throws for a pattern longer than 300 characters', () => {
    const longPattern = 'a'.repeat(301);

    expect(() => assertSafePattern(longPattern)).toThrow();
  });

  it('throws for a nested-quantifier pattern like (a+)+', () => {
    expect(() => assertSafePattern('(a+)+')).toThrow();
  });

  // The classic catastrophic-backtracking ReDoS example, anchored at the
  // end the way it's usually cited (e.g. against input like "aaaaaaaa!").
  it('throws for the classic ReDoS pattern (a+)+$', () => {
    expect(() => assertSafePattern('(a+)+$')).toThrow();
  });

  it('throws for a nested-quantifier pattern like (a*)*', () => {
    expect(() => assertSafePattern('(a*)*')).toThrow();
  });

  it('throws for overlapping alternation inside a repeated group', () => {
    expect(() => assertSafePattern('(a|a)+')).toThrow();
  });
});
