import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  OnDestroy,
  PendingTasks,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { generatePdf } from '../../generate-pdf';
import { BlobUrlLifecycle } from '../internal/blob-url-lifecycle';
import type { PdfGenerateOptions } from '../models/pdf-generate-options';
import type { PdfTemplate } from '../models/pdf-block';
import type { PdfResult } from '../models/pdf-result';

/**
 * Injection seam over `generatePdf()`, internal only, not part of this
 * library's public API. This workspace's Angular+Vitest test runner
 * rejects `vi.mock()` on a relative import outright ("The 'vi.mock' and
 * related methods are not supported for relative imports with the
 * Angular unit-test system. Please use Angular TestBed for mocking
 * dependencies", confirmed by actually hitting that error), so
 * `pdf-preview.spec.ts` overrides this token via a TestBed provider
 * instead of mocking the module. `generate-pdf.spec.ts` itself doesn't
 * need this, it calls the real `generatePdf()`.
 */
export const GENERATE_PDF = new InjectionToken<typeof generatePdf>('GENERATE_PDF', {
  providedIn: 'root',
  factory: () => generatePdf,
});

/**
 * Generates a PDF from a `PdfTemplate` and a data object, and previews
 * it in an `<iframe>` using the browser's native PDF viewer.
 *
 * Sizes itself via CSS custom properties, re-themeable from the
 * consuming app: `--zhunam-pdf-preview-height` (default `600px`) controls
 * the host's, and therefore the iframe's, height; width always fills the
 * host's container at 100%. The component draws no border or radius of
 * its own, wrap it in whatever bounded-panel styling the consumer's own
 * design system already uses.
 *
 * Security invariant (ROADMAP.md, "Seguridad" #5): `safeUrl` is set in
 * exactly one place in this class, the success branch of the `effect()`
 * below, and only ever wraps a blob URL that `BlobUrlLifecycle.set()`
 * itself created from a `Blob` returned by `generatePdf()`. There is no
 * other assignment to `safeUrl` anywhere in this file, so
 * `bypassSecurityTrustResourceUrl()` never sees a public, externally
 * supplied URL, this isn't a promise layered on top of the code, it's
 * the only path that exists.
 *
 * `safeUrl` appends `#navpanes=0` to the blob URL, a fragment several
 * browsers' built-in PDF viewer reads to hide its own thumbnail/outline
 * side panel, so this component's iframe defaults to just the document,
 * not the viewer's chrome competing for space with it. The fragment is
 * only ever added to the string handed to `bypassSecurityTrustResourceUrl()`,
 * never to the URL `BlobUrlLifecycle` itself creates or revokes: that
 * class always works with the bare blob URL, exactly as before. There's
 * no way to opt out of `#navpanes=0` in v1; revisit if a consumer
 * actually asks for the panel back.
 *
 * `result` is the exact `PdfResult` `generatePdf()` resolved with for
 * whatever is currently visible in the iframe, the same object `safeUrl`
 * was itself derived from, not a second one. Exposed so a consumer can
 * wire its own actions, download button, "open in new tab", attach to
 * an email, without triggering a second full generation: no re-fetch of
 * an allowed remote image, no re-running the template's resolver, and a
 * guarantee that whatever gets downloaded is exactly what's on screen,
 * not a fresh render that could differ if `data()` changed since.
 */
@Component({
  selector: 'lib-pdf-preview',
  imports: [],
  templateUrl: './pdf-preview.html',
  styleUrl: './pdf-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPreview implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly generatePdfFn = inject(GENERATE_PDF);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly blobUrlLifecycle = new BlobUrlLifecycle();

  /**
   * Template describing the PDF to generate.
   */
  readonly template = input.required<PdfTemplate>();

  /**
   * Data object the template is compiled against.
   */
  readonly data = input.required<unknown>();

  /**
   * Generation options, forwarded to `generatePdf()` as-is.
   */
  readonly options = input<PdfGenerateOptions>();

  /**
   * Emitted the moment a specific generation attempt fails, once per
   * failed attempt. Never re-emitted just because the component
   * re-renders while still in the `'error'` state with nothing new to
   * report.
   */
  readonly generationError = output<Error>();

  private readonly statusSignal = signal<'idle' | 'generating' | 'ready' | 'error'>('idle');
  private readonly errorSignal = signal<Error | null>(null);
  private readonly safeUrlSignal = signal<SafeResourceUrl | null>(null);
  private readonly resultSignal = signal<PdfResult | null>(null);

  /**
   * Current generation status.
   */
  readonly status = this.statusSignal.asReadonly();

  /**
   * Error from the most recent failed generation, `null` once a
   * generation succeeds or while one is in progress.
   */
  readonly error = this.errorSignal.asReadonly();

  /**
   * Sanitized blob URL of the generated PDF, `null` until the first
   * generation succeeds.
   */
  readonly safeUrl = this.safeUrlSignal.asReadonly();

  /**
   * The `PdfResult` behind the PDF currently shown in the iframe, `null`
   * until the first generation succeeds. Lets a consumer call
   * `download()`/`open()`/`getBlob()`/`toBase64()` on the exact same
   * result already rendered, without triggering another `generatePdf()`
   * call.
   * @example
   * <lib-pdf-preview #preview [template]="template" [data]="data()" />
   * <button [disabled]="!preview.result()" (click)="preview.result()?.download('invoice.pdf')">
   *   Download
   * </button>
   */
  readonly result = this.resultSignal.asReadonly();

  constructor() {
    effect((onCleanup) => {
      // Read every input signal synchronously, before the first `await`
      // below: effect() only tracks signals read during its own
      // synchronous execution, reading them after an `await` would not
      // register as a dependency, and this effect would then stop
      // re-running when template()/data()/options() change.
      const template = this.template();
      const data = this.data();
      const options = this.options();

      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      this.statusSignal.set('generating');
      this.errorSignal.set(null);

      // This workspace has no zone.js installed at all, every app built
      // on this library runs zoneless. Without registering this promise
      // chain with Angular's own PendingTasks, nothing (Angular's app
      // stability tracking for SSR, `ComponentFixture.whenStable()` in
      // tests, an e2e harness waiting for the app to settle) has any way
      // to know this component is still doing async work; confirmed by
      // hitting this directly, `fixture.whenStable()` resolved with
      // status stuck at "generating" before this was added.
      // `PendingTasks.run()` would be more convenient here but is still
      // `@developerPreview` in this Angular version, `add()` is stable
      // (`@publicApi 20.0`, within this library's compatibility floor).
      const removePendingTask = this.pendingTasks.add();

      this.generatePdfFn(template, data, options)
        .then(async (result) => ({ result, blob: await result.getBlob() }))
        .then(({ result, blob }) => {
          if (cancelled) {
            return;
          }

          const url = this.blobUrlLifecycle.set(blob);
          this.safeUrlSignal.set(
            this.sanitizer.bypassSecurityTrustResourceUrl(`${url}#navpanes=0`),
          );
          this.resultSignal.set(result);
          this.statusSignal.set('ready');
        })
        .catch((reason: unknown) => {
          if (cancelled) {
            return;
          }

          const error = reason instanceof Error ? reason : new Error(String(reason));
          this.errorSignal.set(error);
          this.statusSignal.set('error');
          this.generationError.emit(error);
        })
        .finally(() => {
          removePendingTask();
        });
    });
  }

  ngOnDestroy(): void {
    this.blobUrlLifecycle.revoke();
  }
}
