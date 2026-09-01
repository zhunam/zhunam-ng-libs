import { NgModule } from '@angular/core';
import { CalendarBoard } from './calendar-board';

/**
 * NgModule wrapper for `CalendarBoard`, for projects with a classic
 * NgModule architecture. Standalone `CalendarBoard` is the recommended
 * way to consume this component; this wrapper exists for parity with
 * this workspace's other libraries.
 */
@NgModule({
  imports: [CalendarBoard],
  exports: [CalendarBoard],
})
export class CalendarBoardModule {}
