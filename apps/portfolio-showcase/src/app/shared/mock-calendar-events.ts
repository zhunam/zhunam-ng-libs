import type { CalendarEvent } from '@zhunam/calendar';

function daysFromNow(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function dayFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Relative to whenever the demo actually loads, not fixed calendar dates:
// this way the current month always shows a populated board, and events
// ~5 weeks out land in the next month, so navigating forward actually
// reveals something new instead of an empty page.
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Standup',
    start: daysFromNow(0, 9),
    end: daysFromNow(0, 9, 15),
    recurrence: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=40',
  },
  {
    id: '2',
    title: 'Product Launch Review',
    start: daysFromNow(2, 10),
    end: daysFromNow(2, 11),
  },
  {
    id: '3',
    title: 'Client Call',
    start: daysFromNow(5, 15, 30),
    end: daysFromNow(5, 16),
  },
  {
    id: '4',
    title: 'Company Offsite',
    start: dayFromNow(12),
    end: dayFromNow(13),
    allDay: true,
  },
  {
    id: '5',
    title: 'Quarterly Planning',
    start: daysFromNow(35, 9),
    end: daysFromNow(35, 12),
  },
  {
    id: '6',
    title: 'Design Review',
    start: daysFromNow(40, 14),
    end: daysFromNow(40, 15),
  },
];
