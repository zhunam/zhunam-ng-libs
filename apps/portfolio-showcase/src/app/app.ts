import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  protected title = 'portfolio-showcase';
  protected readonly currentYear = new Date().getFullYear();

  protected readonly scrolled = signal(false);

  // Only the home route has a dark hero for the header to sit transparently
  // over — every other page keeps the header solid regardless of scroll.
  protected readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects === '/'),
    ),
    { initialValue: this.router.url === '/' },
  );

  protected readonly headerIsTransparent = computed(() => this.isHome() && !this.scrolled());

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }
}
