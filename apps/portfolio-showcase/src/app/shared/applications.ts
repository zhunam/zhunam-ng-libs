export interface ApplicationEntry {
  name: string;
  description: string;
  /** Internal routes are demos living in this repo; external URLs are standalone products deployed elsewhere. */
  link: { kind: 'internal'; route: string } | { kind: 'external'; url: string };
  /** Shown in mono under the description, same role as a library card's import path. */
  displayUrl: string;
  /**
   * `filled` is reserved for content backed by real live data (see DESIGN.md
   * > Badges); everything else uses the outline variant.
   */
  badge: { label: string; filled: boolean };
  stack: string[];
  preview:
    | { kind: 'image'; src: string; alt: string; width: number; height: number }
    | { kind: 'market-miniature' };
}

/**
 * Applications shown on home. Not part of shared/libraries.ts: that list
 * drives the Library Explorer sidebar on every demo page, and these aren't
 * installable packages. Only verifiable facts here, same rule as libraries.ts.
 */
export const applications: ApplicationEntry[] = [
  {
    name: 'Luan Patterns',
    description:
      'Turns a photo or a drawing into a printable cross-stitch pattern, with DMC-compatible threads, skein counts, and a multi-page PDF. Everything runs in the browser: no account, and images never leave the device.',
    link: { kind: 'external', url: 'https://luan-patterns.pages.dev/' },
    displayUrl: 'luan-patterns.pages.dev',
    badge: { label: 'Product', filled: false },
    stack: ['Angular 22', 'Client-side image processing', 'PDF export', 'Closed source'],
    // Served from public/, never hotlinked: the product's site sends
    // Cross-Origin-Resource-Policy: same-origin. Split view so the generated
    // pattern itself is visible, not just the source image.
    preview: {
      kind: 'image',
      src: '/applications/luan-patterns.png',
      alt: 'Side by side: a coastal sunset illustration and the cross-stitch pattern generated from it',
      width: 770,
      height: 420,
    },
  },
  {
    name: 'Crypto Market Dashboard',
    description:
      'Live crypto prices, trends, conversion, and global market stats, powered by the CoinGecko public API and built on top of the libraries below.',
    link: { kind: 'internal', route: '/crypto-dashboard' },
    displayUrl: '/crypto-dashboard',
    badge: { label: 'Live', filled: true },
    stack: ['Angular 21', '@zhunam/data-grid', '@zhunam/form-builder', '@zhunam/pdf-generator'],
    preview: { kind: 'market-miniature' },
  },
];
