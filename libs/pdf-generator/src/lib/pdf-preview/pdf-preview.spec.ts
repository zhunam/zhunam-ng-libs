import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { pdfText } from '../factories/block-factories';
import type { PdfTemplate } from '../models/pdf-block';
import type { PdfResult } from '../models/pdf-result';
import { GENERATE_PDF, PdfPreview } from './pdf-preview';

// This workspace's Angular+Vitest test runner rejects vi.mock() on a
// relative import ("Please use Angular TestBed for mocking
// dependencies", confirmed by actually hitting that error), so
// generatePdf() is overridden here via the GENERATE_PDF injection
// token (an internal-only seam in pdf-preview.ts) and a TestBed
// provider, not vi.mock().
const mockedGeneratePdf = vi.fn();

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakePdfResult(blob: Blob): PdfResult {
  return {
    download: vi.fn(),
    open: vi.fn(),
    getBlob: vi.fn().mockResolvedValue(blob),
    toBase64: vi.fn().mockResolvedValue(''),
  };
}

const TEMPLATE: PdfTemplate = { body: [] };

describe('PdfPreview', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let nextUrl: number;

  beforeEach(() => {
    nextUrl = 0;
    createObjectURL = vi.fn(() => `blob:mock-url-${nextUrl++}`);
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    mockedGeneratePdf.mockReset();

    TestBed.configureTestingModule({
      providers: [{ provide: GENERATE_PDF, useValue: mockedGeneratePdf }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createFixture(data: unknown = {}): ComponentFixture<PdfPreview> {
    const fixture = TestBed.createComponent(PdfPreview);
    fixture.componentRef.setInput('template', TEMPLATE);
    fixture.componentRef.setInput('data', data);
    return fixture;
  }

  it('starts generating on its own: status is "generating" before the first generation resolves, not left "idle"', () => {
    const { promise } = deferred<PdfResult>();
    mockedGeneratePdf.mockReturnValue(promise);

    const fixture = createFixture();
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('generating');
  });

  it('reflects a successful generation: status "ready", safeUrl set, error null', async () => {
    const blob = new Blob(['pdf bytes'], { type: 'application/pdf' });
    mockedGeneratePdf.mockResolvedValue(fakePdfResult(blob));

    const fixture = createFixture();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.status()).toBe('ready');
    expect(fixture.componentInstance.safeUrl()).not.toBeNull();
    expect(fixture.componentInstance.error()).toBeNull();
  });

  it('calls bypassSecurityTrustResourceUrl with the URL BlobUrlLifecycle.set() produced plus "#navpanes=0", nothing else appended', async () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const sanitizeSpy = vi.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');
    const blob = new Blob(['pdf bytes'], { type: 'application/pdf' });
    mockedGeneratePdf.mockResolvedValue(fakePdfResult(blob));

    const fixture = createFixture();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const producedUrl = createObjectURL.mock.results[0]?.value;
    expect(sanitizeSpy).toHaveBeenCalledExactlyOnceWith(`${producedUrl}#navpanes=0`);
  });

  it('reflects a failed generation: status "error", the real Error, and generationError emitted once with it', async () => {
    const failure = new Error('generation blew up');
    mockedGeneratePdf.mockRejectedValue(failure);
    const onError = vi.fn();

    const fixture = createFixture();
    fixture.componentInstance.generationError.subscribe(onError);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.status()).toBe('error');
    expect(fixture.componentInstance.error()).toBe(failure);
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  });

  it('starts a new generation when template()/data() changes', async () => {
    mockedGeneratePdf.mockResolvedValue(fakePdfResult(new Blob(['a'])));

    const fixture = createFixture({ initial: true });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockedGeneratePdf).toHaveBeenCalledTimes(1);
    expect(mockedGeneratePdf).toHaveBeenLastCalledWith(TEMPLATE, { initial: true }, undefined);

    fixture.componentRef.setInput('data', { initial: false });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockedGeneratePdf).toHaveBeenCalledTimes(2);
    expect(mockedGeneratePdf).toHaveBeenLastCalledWith(TEMPLATE, { initial: false }, undefined);
  });

  it('race condition: the second (newer) generation wins even when the first (older) one resolves later', async () => {
    const first = deferred<PdfResult>();
    const second = deferred<PdfResult>();
    mockedGeneratePdf.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const fixture = createFixture({ v: 1 });
    fixture.detectChanges();

    fixture.componentRef.setInput('data', { v: 2 });
    fixture.detectChanges();

    // Both generations are still genuinely in flight at this point (each
    // registered its own PendingTasks entry), so `whenStable()` would
    // hang until both settle, resolving only one and awaiting in between
    // deadlocks the test. Resolve the second one first, then the first
    // one, matching "the first call resolves after the second", and
    // await stability only once both have.
    second.resolve(fakePdfResult(new Blob(['b'], { type: 'application/pdf' })));
    first.resolve(fakePdfResult(new Blob(['a'], { type: 'application/pdf' })));
    await fixture.whenStable();

    // Only one blob URL was ever created: the cancelled first run's
    // success branch never executed at all, it isn't a matter of the
    // second's result merely overwriting the first's afterwards.
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.status()).toBe('ready');
    expect(fixture.componentInstance.safeUrl()).not.toBeNull();
  });

  it('calls BlobUrlLifecycle.revoke() (via the real URL.revokeObjectURL) on ngOnDestroy, with the bare URL, never the "#navpanes=0" one handed to the sanitizer', async () => {
    const blob = new Blob(['pdf bytes'], { type: 'application/pdf' });
    mockedGeneratePdf.mockResolvedValue(fakePdfResult(blob));

    const fixture = createFixture();
    fixture.detectChanges();
    await fixture.whenStable();

    const producedUrl = createObjectURL.mock.results[0]?.value;
    expect(revokeObjectURL).not.toHaveBeenCalled();

    fixture.destroy();

    // Not `${producedUrl}#navpanes=0`: BlobUrlLifecycle only ever sees the
    // bare URL it created itself, the fragment is added later, purely for
    // display, and never fed back into it.
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith(producedUrl);
  });

  describe('with the real default GENERATE_PDF provider (no TestBed override)', () => {
    beforeEach(() => {
      // Drops the GENERATE_PDF override the outer beforeEach configured
      // above, so PdfPreview resolves it through its actual providedIn:
      // 'root' factory (the real generatePdf()), the same as a consuming
      // app would with zero extra setup. The URL stub from the outer
      // beforeEach stays active, still needed regardless (jsdom doesn't
      // implement createObjectURL/revokeObjectURL at all).
      TestBed.resetTestingModule();
    });

    it('generates a real PDF (no mocking, same style as generate-pdf.spec.ts) the same way a consuming app would install and use this with no extra configuration', async () => {
      const template: PdfTemplate = { body: [pdfText('Hello {{name}}')] };
      const fixture = TestBed.createComponent(PdfPreview);
      fixture.componentRef.setInput('template', template);
      fixture.componentRef.setInput('data', { name: 'Ada' });

      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.status()).toBe('ready');
      expect(fixture.componentInstance.safeUrl()).not.toBeNull();
      expect(fixture.componentInstance.error()).toBeNull();
    });
  });
});
