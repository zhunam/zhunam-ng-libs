import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { applications } from '../../shared/applications';
import {
  authLibrary,
  calendarLibrary,
  dataGridLibrary,
  formBuilderLibrary,
  pdfGeneratorLibrary,
} from '../../shared/libraries';
import { ApplicationCard } from './components/application-card/application-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ApplicationCard],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly applications = applications;

  protected readonly dataGridLibrary = dataGridLibrary;
  protected readonly formBuilderLibrary = formBuilderLibrary;
  protected readonly authLibrary = authLibrary;
  protected readonly pdfGeneratorLibrary = pdfGeneratorLibrary;
  protected readonly calendarLibrary = calendarLibrary;
}
