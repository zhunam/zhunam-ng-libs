import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataGrid } from '@zhunam/data-grid';
import { mockUsers, userColumns } from '../../shared/mock-users';
import { libraries } from '../../shared/libraries';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DataGrid],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly users = mockUsers;
  protected readonly columns = userColumns;
  protected readonly libraries = libraries;
}
