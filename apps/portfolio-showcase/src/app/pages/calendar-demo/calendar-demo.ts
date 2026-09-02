import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CalendarStore, type CalendarEvent } from '@zhunam/calendar';
import {
  CalendarBoard,
  type CalendarBoardReschedule,
  type CalendarBoardViewMode,
  type CalendarBoardVisibleRange,
} from '@zhunam/calendar/calendar-ui';
import { mockCalendarEvents } from '../../shared/mock-calendar-events';
import { libraries } from '../../shared/libraries';
import { injectCurrentUrl, sidebarLinkClasses } from '../../shared/library-sidebar';

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

@Component({
  selector: 'app-calendar-demo',
  imports: [RouterLink, CalendarBoard, DatePipe],
  templateUrl: './calendar-demo.html',
  styleUrl: './calendar-demo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarDemo {
  protected readonly libraries = libraries;
  protected readonly currentUrl = injectCurrentUrl();
  protected readonly sidebarLinkClasses = sidebarLinkClasses;

  private readonly calendarStore = new CalendarStore();

  protected readonly viewMode = signal<CalendarBoardViewMode>('month');
  protected readonly viewDate = signal(new Date());
  protected readonly selectedEvent = signal<CalendarEvent | null>(null);

  // Seeded with the board's own first visibleRangeChange emission in
  // mind (CalendarBoard defaults to the 'month' view too), so the board
  // never renders an empty state before that first emission lands.
  private readonly visibleRange = signal<CalendarBoardVisibleRange>({
    start: startOfMonth(new Date()),
    end: startOfNextMonth(new Date()),
  });

  // CalendarBoard doesn't expand recurrence itself (by design, see its
  // own JSDoc): eventsInRange() is what turns the mock recurring event
  // into its real occurrences for whatever range is currently visible,
  // re-run reactively every time the board navigates.
  protected readonly visibleEvents = computed(() =>
    this.calendarStore.eventsInRange(this.visibleRange().start, this.visibleRange().end)(),
  );

  protected readonly coreUsageSnippet = `import { CalendarStore, type CalendarEvent } from '@zhunam/calendar';

const store = new CalendarStore();
const event: CalendarEvent = { id: '1', title: 'Standup', start: new Date(), end: new Date() };
store.addEvent(event);

const upcoming = store.eventsInRange(new Date(), new Date(Date.now() + 7 * 86400000));`;

  protected readonly calendarUiUsageSnippet = `<lib-calendar-board
  [events]="visibleEvents()"
  [(viewMode)]="viewMode"
  [(viewDate)]="viewDate"
  (eventClick)="onEventClick($event)"
  (eventReschedule)="onEventReschedule($event)"
  (visibleRangeChange)="onVisibleRangeChange($event)"
/>`;

  protected readonly googleUsageSnippet = `import { Component } from '@angular/core';
import { GoogleCalendarConnector } from '@zhunam/calendar/google';

@Component({ selector: 'app-agenda' })
export class AgendaPage {
  private readonly connector = new GoogleCalendarConnector();

  async loadEvents() {
    await this.connector.connect(GOOGLE_CLIENT_ID);
    return this.connector.listEvents({ start: new Date(), end: nextWeek });
  }
}`;

  constructor() {
    for (const event of mockCalendarEvents) {
      this.calendarStore.addEvent(event);
    }
  }

  protected onEventClick(event: CalendarEvent): void {
    this.selectedEvent.set(event);
  }

  protected onEventReschedule(change: CalendarBoardReschedule): void {
    this.calendarStore.updateEvent(change.id, { start: change.start, end: change.end });
  }

  protected onVisibleRangeChange(range: CalendarBoardVisibleRange): void {
    this.visibleRange.set(range);
  }
}
