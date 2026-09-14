import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  authLibrary,
  calendarLibrary,
  dataGridLibrary,
  formBuilderLibrary,
  pdfGeneratorLibrary,
} from '../../shared/libraries';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly dataGridLibrary = dataGridLibrary;
  protected readonly formBuilderLibrary = formBuilderLibrary;
  protected readonly authLibrary = authLibrary;
  protected readonly pdfGeneratorLibrary = pdfGeneratorLibrary;
  protected readonly calendarLibrary = calendarLibrary;

  // Not a LibraryEntry: this is an apps/* portfolio piece, not a
  // published library, so it doesn't belong in shared/libraries.ts
  // (that list drives every demo page's Library Explorer sidebar).
  protected readonly cryptoDashboard = {
    name: 'Crypto Market Dashboard',
    description:
      'Live crypto prices, trends, conversion, and global market stats, powered by the CoinGecko public API.',
    route: '/crypto-dashboard',
  };
}
