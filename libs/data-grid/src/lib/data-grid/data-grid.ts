import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ColumnConfig } from '../models/column-config';

@Component({
  selector: 'lib-data-grid',
  imports: [],
  templateUrl: './data-grid.html',
  styleUrl: './data-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGrid<T> {
  /**
   * Data to render in the table.
   * @default []
   */
  data = input<T[]>([]);

  /**
   * Configuration of the columns to render, in display order.
   */
  columns = input.required<ColumnConfig<T>[]>();
}
