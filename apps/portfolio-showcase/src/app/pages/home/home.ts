import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { dataGridLibrary, formBuilderLibrary } from '../../shared/libraries';

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
}
