import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/** Tracks the current URL as a signal, for highlighting the active Library Explorer sidebar entry. */
export function injectCurrentUrl() {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: router.url },
  );
}

export function sidebarLinkClasses(active: boolean): string {
  return active
    ? 'rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary'
    : 'rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
}
