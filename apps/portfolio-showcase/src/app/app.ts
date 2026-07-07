import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DataGrid } from '@zhunam/data-grid';
import { NxWelcome } from './nx-welcome';
import { mockUsers, userColumns } from './mock-users';

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
}
