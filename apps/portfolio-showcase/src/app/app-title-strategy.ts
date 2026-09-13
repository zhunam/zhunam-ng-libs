import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Prefixes every route's `title` with "zhunam-dev | ", per Angular's own
 * documented custom TitleStrategy pattern (extends TitleStrategy,
 * reuses buildTitle() to resolve the deepest primary route's title).
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.title.setTitle(routeTitle ? `zhunam-dev | ${routeTitle}` : 'zhunam-dev');
  }
}
