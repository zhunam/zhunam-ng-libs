export type PriceDirection = 'up' | 'down' | 'neutral';

/** Neutral only at exactly 0, never by rounding or an arbitrary threshold. */
export function priceDirection(change: number): PriceDirection {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}
