import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CryptoCoin } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';

type ChangeDirection = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-price-ticker',
  imports: [CurrencyPipe, DecimalPipe],
  templateUrl: './price-ticker.html',
  styleUrl: './price-ticker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceTicker {
  coin = input.required<CryptoCoin>();

  // Maps the shared up/down/neutral helper to this component's own
  // positive/negative/neutral vocabulary, which its template and tests
  // already depend on (see utils/price-direction.ts for the shared logic).
  changeDirection = computed<ChangeDirection>(() => {
    switch (priceDirection(this.coin().changePercentage24h)) {
      case 'up':
        return 'positive';
      case 'down':
        return 'negative';
      default:
        return 'neutral';
    }
  });

  private readonly flashingSignal = signal(false);
  readonly flashing = this.flashingSignal.asReadonly();

  constructor() {
    // effect(), not computed(): the flash is a transient side effect (a CSS
    // class toggled on, then reset via (animationend) in the template), not
    // a value derived from state. Skips its first run so a ticker doesn't
    // flash the moment it renders for the first time.
    let isFirstRun = true;
    effect(() => {
      this.coin();
      if (isFirstRun) {
        isFirstRun = false;
        return;
      }
      this.flashingSignal.set(true);
    });
  }

  onFlashAnimationEnd(): void {
    this.flashingSignal.set(false);
  }
}
