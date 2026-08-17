import { NgModule } from '@angular/core';
import { DataGrid } from './data-grid';

/**
 * NgModule wrapper for `DataGrid`, for consumers still on a classic
 * NgModule architecture. `DataGrid` is a standalone component; importing
 * it directly (`imports: [DataGrid]`) is still the recommended way to
 * consume this library. Use this module only if your app doesn't use
 * standalone components yet.
 *
 * @example
 * @NgModule({
 *   imports: [DataGridModule],
 * })
 * export class UsersPageModule {}
 */
@NgModule({
  imports: [DataGrid],
  exports: [DataGrid],
})
export class DataGridModule {}
