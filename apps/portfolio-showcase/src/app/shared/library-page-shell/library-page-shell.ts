import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { libraries } from '../libraries';
import { injectCurrentUrl, sidebarLinkClasses } from '../library-sidebar';

@Component({
  selector: 'app-library-page-shell',
  imports: [RouterLink],
  templateUrl: './library-page-shell.html',
  styleUrl: './library-page-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryPageShell {
  protected readonly libraries = libraries;
  protected readonly currentUrl = injectCurrentUrl();
  protected readonly sidebarLinkClasses = sidebarLinkClasses;
}
