import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Stylized miniature of /crypto-dashboard for its home card. Fixed sample
 * data on purpose: a decorative graphic suggesting the real dashboard's
 * shape, not a second working instance of it (no fetch, no iframe, never
 * updates). See DESIGN.md > Applications > "Preview".
 */
@Component({
  selector: 'app-market-preview',
  imports: [],
  templateUrl: './market-preview.html',
  styleUrl: './market-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketPreview {
  protected readonly priceStrip = [
    { symbol: 'BTC', price: '$77,289' },
    { symbol: 'ETH', price: '$2,507' },
    { symbol: 'SOL', price: '$101.9' },
  ];

  protected readonly miniList = [
    { name: 'Bitcoin', price: '$77,289' },
    { name: 'Ethereum', price: '$2,507' },
  ];
}
