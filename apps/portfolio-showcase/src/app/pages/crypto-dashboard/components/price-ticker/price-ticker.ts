import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { CryptoCoin } from '../../models/coin';

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

  changeDirection = computed<ChangeDirection>(() => {
    const change = this.coin().changePercentage24h;
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
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
