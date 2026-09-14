import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type SpinnerVariant = 'loading' | 'error';

@Component({
  selector: 'app-coin-spinner',
  imports: [],
  templateUrl: './coin-spinner.html',
  styleUrl: './coin-spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoinSpinner {
  variant = input<SpinnerVariant>('loading');
  message = input<string>();

  retry = output<void>();

  readonly errorMessage = computed(() => this.message() ?? 'Could not load the data.');

  onRetryClick(): void {
    this.retry.emit();
  }
}
