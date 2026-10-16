import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationEntry } from '../../../../shared/applications';
import { MarketPreview } from '../market-preview/market-preview';

@Component({
  selector: 'app-application-card',
  imports: [NgTemplateOutlet, RouterLink, MarketPreview],
  templateUrl: './application-card.html',
  styleUrl: './application-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationCard {
  readonly application = input.required<ApplicationEntry>();
}
