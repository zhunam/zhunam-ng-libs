import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataGrid } from '@zhunam/data-grid';
import { mockUsers, userColumns, User } from '../../shared/mock-users';
import { libraries } from '../../shared/libraries';

@Component({
  selector: 'app-data-grid-demo',
  imports: [DataGrid, RouterLink],
  templateUrl: './data-grid-demo.html',
  styleUrl: './data-grid-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridDemo {
  protected readonly users = mockUsers;
  protected readonly columns = userColumns;
  protected readonly libraries = libraries;
  protected readonly selectedUser = signal<User | null>(null);

  protected readonly usageSnippet = `import { DataGrid } from '@zhunam/data-grid';

<lib-data-grid
  [data]="users"
  [columns]="columns"
  [pageSize]="3"
  (rowClick)="onUserRowClick($event)"
/>`;

  protected onUserRowClick(user: User): void {
    this.selectedUser.set(user);
  }

  protected sidebarLinkClasses(active: boolean): string {
    return active
      ? 'rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary'
      : 'rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  }
}
