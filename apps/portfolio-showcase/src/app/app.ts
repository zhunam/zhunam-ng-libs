import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DataGrid } from '@zhunam/data-grid';
import { NxWelcome } from './nx-welcome';
import { mockUsers, userColumns, User } from './mock-users';

@Component({
  imports: [NxWelcome, RouterModule, DataGrid],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'portfolio-showcase';
  protected readonly mockUsers = mockUsers;
  protected readonly userColumns = userColumns;

  // Temporary: just to verify `rowClick` visually, replaced once there's a real demo page (task 11).
  protected onUserRowClick(user: User): void {
    console.log('[portfolio-showcase] rowClick:', user);
  }
}
