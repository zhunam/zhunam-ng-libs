import { BlobUrlLifecycle } from './blob-url-lifecycle';

// jsdom (the environment @nx/angular:unit-test uses by default, no
// `browsers` configured for this project) does not implement
// URL.createObjectURL/revokeObjectURL at all, confirmed empirically:
// both are `undefined` on jsdom's URL, calling either throws
// "is not a function". vi.stubGlobal('URL', ...) replaces the whole
// global with a minimal fake exposing just the two static methods this
// class actually calls; this spec never needs real URL parsing, so a
// full URL implementation isn't necessary. Restored with
// vi.unstubAllGlobals() after each test.
describe('BlobUrlLifecycle', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let nextUrl: number;

  beforeEach(() => {
    nextUrl = 0;
    createObjectURL = vi.fn(() => `blob:mock-url-${nextUrl++}`);
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('set() returns the URL that URL.createObjectURL actually returned', () => {
    const lifecycle = new BlobUrlLifecycle();
    const blob = new Blob(['a']);

    const url = lifecycle.set(blob);

    expect(url).toBe('blob:mock-url-0');
    expect(createObjectURL).toHaveBeenCalledWith(blob);
  });

  it('a second set() revokes the first URL before creating the new one', () => {
    const lifecycle = new BlobUrlLifecycle();

    const firstUrl = lifecycle.set(new Blob(['a']));
    const secondUrl = lifecycle.set(new Blob(['b']));

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(secondUrl).not.toBe(firstUrl);
  });

  it('revoke() without a prior set() does not throw and does not call revokeObjectURL', () => {
    const lifecycle = new BlobUrlLifecycle();

    expect(() => lifecycle.revoke()).not.toThrow();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('revoke() after set() calls revokeObjectURL with the correct URL, and a second revoke() does not call it again', () => {
    const lifecycle = new BlobUrlLifecycle();
    const url = lifecycle.set(new Blob(['a']));

    lifecycle.revoke();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);

    lifecycle.revoke();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
