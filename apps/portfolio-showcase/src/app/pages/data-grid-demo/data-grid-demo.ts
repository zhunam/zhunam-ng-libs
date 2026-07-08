import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DataGrid } from '@zhunam/data-grid';
import { mockUsers, userColumns, User } from './mock-users';

@Component({
  selector: 'app-data-grid-demo',
  imports: [DataGrid],
  templateUrl: './data-grid-demo.html',
  styleUrl: './data-grid-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridDemo {
  protected readonly users = mockUsers;
  protected readonly columns = userColumns;
  protected readonly selectedUser = signal<User | null>(null);

  protected onUserRowClick(user: User): void {
    this.selectedUser.set(user);
  }
}
