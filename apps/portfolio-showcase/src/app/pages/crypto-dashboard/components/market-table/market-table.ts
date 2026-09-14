import { ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ColumnConfig, DataGrid } from '@zhunam/data-grid';
import { CryptoCoin } from '../../models/coin';
import { priceDirection } from '../../utils/price-direction';
import { CoinSpinner } from '../coin-spinner/coin-spinner';

@Component({
  selector: 'app-market-table',
  imports: [DataGrid, CoinSpinner, DecimalPipe],
  templateUrl: './market-table.html',
  styleUrl: './market-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketTable implements OnInit {
  coins = input.required<CryptoCoin[]>();
  error = input<string | null>(null);

  retry = output<void>();

  @ViewChild('imageCell', { static: true })
  private imageCellTemplate!: TemplateRef<{ $implicit: CryptoCoin }>;

  @ViewChild('changeCell', { static: true })
  private changeCellTemplate!: TemplateRef<{ $implicit: CryptoCoin }>;

  // Assigned in ngOnInit, not a computed(): the static ViewChild template
  // refs it depends on are only guaranteed resolved by then, and the
  // column config itself isn't derived from any signal.
  columns: ColumnConfig<CryptoCoin>[] = [];

  ngOnInit(): void {
    this.columns = [
      { key: 'image', label: '', cellTemplate: this.imageCellTemplate },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'symbol', label: 'Symbol' },
      { key: 'rank', label: 'Rank', sortable: true },
      { key: 'currentPrice', label: 'Price', sortable: true },
      {
        key: 'changePercentage24h',
        label: '24h Change',
        sortable: true,
        cellTemplate: this.changeCellTemplate,
        cellClass: (coin) => this.changeClassFor(coin),
      },
    ];
  }

  onRetryClick(): void {
    this.retry.emit();
  }

  private changeClassFor(coin: CryptoCoin): string {
    switch (priceDirection(coin.changePercentage24h)) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  }
}
