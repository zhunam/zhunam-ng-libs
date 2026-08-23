/**
 * Owns exactly one active blob URL at a time. Implements the "Blob URLs
 * se revocan en ngOnDestroy y en cada regeneración" rule from
 * `libs/pdf-generator/ROADMAP.md`'s security section (#5): `set()`
 * always revokes whatever URL was active before creating the new one
 * (regeneration), and `revoke()` covers the destroy case, so a caller
 * (the preview component, once it exists) never has to get both right
 * by hand.
 */
export class BlobUrlLifecycle {
  private activeUrl: string | undefined;

  /**
   * Revokes the previously active blob URL, if any, then creates and
   * returns a new one for `blob`.
   */
  set(blob: Blob): string {
    this.revoke();
    this.activeUrl = URL.createObjectURL(blob);
    return this.activeUrl;
  }

  /**
   * Revokes the currently active blob URL and clears it. Safe to call
   * with nothing active (before the first `set()`, or after an earlier
   * `revoke()`), does nothing in that case instead of throwing.
   */
  revoke(): void {
    if (this.activeUrl !== undefined) {
      URL.revokeObjectURL(this.activeUrl);
      this.activeUrl = undefined;
    }
  }
}
