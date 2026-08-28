/**
 * `loadPromise` inside load-gsi-script.ts is real module-level state
 * (caching is the whole point of it), so each test here re-imports the
 * module fresh via `vi.resetModules()` + dynamic `import()` instead of
 * the file-level static import every other spec in this repo uses:
 * otherwise a script successfully "loaded" in one test would leak its
 * cached promise into the next, unrelated test.
 */
describe('loadGsiScript', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('resolves immediately without injecting a script tag when google.accounts.oauth2 already exists', async () => {
    vi.stubGlobal('google', { accounts: { oauth2: {} } });
    const appendSpy = vi.spyOn(document.head, 'appendChild');
    const { loadGsiScript } = await import('./load-gsi-script');

    await expect(loadGsiScript()).resolves.toBeUndefined();

    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('injects a <script> tag pointing at the real GIS URL and resolves once it loads', async () => {
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      queueMicrotask(() => (node as HTMLScriptElement).onload?.(new Event('load')));
      return node;
    });
    const { loadGsiScript } = await import('./load-gsi-script');

    await expect(loadGsiScript()).resolves.toBeUndefined();

    const injected = appendSpy.mock.calls[0][0] as HTMLScriptElement;
    expect(injected.src).toBe('https://accounts.google.com/gsi/client');
    expect(injected.async).toBe(true);
  });

  it('caches the loading promise: two calls before load only inject one script tag', async () => {
    let triggerLoad: (() => void) | undefined;
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      triggerLoad = () => (node as HTMLScriptElement).onload?.(new Event('load'));
      return node;
    });
    const { loadGsiScript } = await import('./load-gsi-script');

    const first = loadGsiScript();
    const second = loadGsiScript();
    triggerLoad?.();
    await expect(Promise.all([first, second])).resolves.toBeDefined();

    expect(appendSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects on a script load error, and a later call retries instead of staying rejected', async () => {
    let attempt = 0;
    const appendSpy = vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      attempt += 1;
      const script = node as HTMLScriptElement;
      const isFirstAttempt = attempt === 1;
      queueMicrotask(() => {
        if (isFirstAttempt) {
          script.onerror?.(new Event('error'));
        } else {
          script.onload?.(new Event('load'));
        }
      });
      return node;
    });
    const { loadGsiScript } = await import('./load-gsi-script');

    await expect(loadGsiScript()).rejects.toThrow(/Failed to load/);
    await expect(loadGsiScript()).resolves.toBeUndefined();

    expect(appendSpy).toHaveBeenCalledTimes(2);
  });
});
