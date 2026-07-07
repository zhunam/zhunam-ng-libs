import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lib-data-grid',
  imports: [],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGrid {
  // Temporary hardcoded data — replaced by the `data`/`columns` inputs in task 4.
  protected readonly columns = ['Nombre', 'Email', 'Rol'];

  protected readonly rows = [
    { nombre: 'Ana Torres', email: 'ana@example.com', rol: 'Admin' },
    { nombre: 'Luis Pérez', email: 'luis@example.com', rol: 'Editor' },
    { nombre: 'Marta Ruiz', email: 'marta@example.com', rol: 'Viewer' },
  ];
}
