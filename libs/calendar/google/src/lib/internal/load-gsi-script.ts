import './google-identity-services';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let loadPromise: Promise<void> | null = null;

/**
 * Loads the real Google Identity Services script, resolving once
 * `google.accounts.oauth2` is available. Always fetched from Google's
 * own `https://accounts.google.com/gsi/client`, never bundled with this
 * library: Google's own docs are explicit that self-hosting this script
 * isn't supported and can cause integration failures.
 *
 * If `google.accounts.oauth2` is already present (e.g. the host app
 * already loads GIS itself for its own "Sign in with Google" button),
 * this resolves immediately without injecting a second `<script>` tag.
 * Otherwise the injected tag and its loading promise are cached, so
 * calling this from multiple `connect()` calls only ever loads the
 * script once. A failed load clears the cache so a later call can retry
 * instead of staying permanently rejected.
 */
export function loadGsiScript(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error(`Failed to load the Google Identity Services script from ${GSI_SCRIPT_SRC}.`));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
