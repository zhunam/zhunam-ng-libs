import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LibraryEntry } from '../libraries';

@Component({
  selector: 'app-package-info-card',
  templateUrl: './package-info-card.html',
  styleUrl: './package-info-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageInfoCard {
  library = input.required<LibraryEntry>();

  protected npmUrl(importPath: string): string {
    return `https://www.npmjs.com/package/${importPath}`;
  }

  protected githubUrl(importPath: string): string {
    const dir = importPath.replace('@zhunam/', '');
    return `https://github.com/zhunam/zhunam-ng-libs/tree/master/libs/${dir}`;
  }

  protected installCommand(importPath: string): string {
    return `npm i ${importPath}`;
  }
}
