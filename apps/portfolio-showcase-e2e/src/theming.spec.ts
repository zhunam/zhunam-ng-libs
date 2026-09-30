import { test, expect, type Page } from '@playwright/test';

/**
 * Permanent version of the disposable Playwright scripts used during this
 * weekend's --zhunam-* theming blocks (data-grid, form-builder, auth/
 * form-ui), see apps/portfolio-showcase/ROADMAP.md. Runs against /data-grid
 * and /form-builder, never /crypto-dashboard: neither depends on any
 * external API (CoinGecko), so this spec never needs page.route() mocks
 * or is at risk of the CoinGecko quota already documented as exhausted.
 * /auth is used only for the nested case (3), the one real place on this
 * site where one of these components renders inside another; it also has
 * no external dependency (MockAuthService backs the demo).
 *
 * Every rule is injected live with page.addStyleTag(), never by editing
 * styles.css: this proves the real CSS cascade/specificity mechanics
 * (inheritance, :is() specificity), not a value this app's own
 * stylesheet happens to already set.
 */

// getComputedStyle().getPropertyValue() reads the custom property itself,
// resolved by the real cascade, independent of whichever internal SCSS
// rule happens to consume it. Values are deliberately unrelated,
// distinguishable rgb() triples, easy to tell apart in a failure message.
function readCustomProperty(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(
    ({ selector, property }) => {
      const el = document.querySelector(selector);
      if (!el) {
        throw new Error(`Selector not found: ${selector}`);
      }
      return getComputedStyle(el).getPropertyValue(property).trim();
    },
    { selector, property },
  );
}

test.describe('Theming: --zhunam-* CSS custom properties', () => {
  test('a --zhunam-primary set on :root reaches a real component, both as the raw custom property and as the visual style it drives', async ({
    page,
  }) => {
    await page.goto('/form-builder');
    await page.locator('lib-form-builder .fb-submit').waitFor();

    await page.addStyleTag({ content: ':root { --zhunam-primary: rgb(1, 2, 3); }' });

    const rawValue = await readCustomProperty(page, 'lib-form-builder', '--zhunam-primary');
    expect(rawValue).toBe('rgb(1, 2, 3)');

    // .fb-submit's background reads var(--zhunam-primary, ...) directly
    // (form-builder.scss), confirming the value doesn't just cascade, it
    // actually drives a real rendered style, not just the property itself.
    const submitBackground = await page.evaluate(() => {
      const button = document.querySelector('lib-form-builder .fb-submit');
      return button ? getComputedStyle(button).backgroundColor : null;
    });
    expect(submitBackground).toBe('rgb(1, 2, 3)');
  });

  test('a real external consumer\'s selector (specificity 0,1,1) beats a plain :root rule, on lib-form-builder', async ({
    page,
  }) => {
    await page.goto('/form-builder');
    await page.locator('lib-form-builder .fb-submit').waitFor();

    // Same shape a real consumer (referred to as "Baize" in this task's
    // context) uses to theme every @zhunam/* component from one place:
    // :root :is(...) targeting every published component selector.
    // Specificity (0,1,1): :root contributes (0,1,0), :is() takes its
    // most specific argument, a plain type selector (0,0,1).
    await page.addStyleTag({
      content: `
        :root { --zhunam-primary: rgb(255, 0, 0); }
        :root :is(lib-data-grid, lib-form-builder, lib-login-form, lib-register-form, lib-reset-password-form) {
          --zhunam-primary: rgb(0, 0, 255);
        }
      `,
    });

    const resolvedValue = await readCustomProperty(page, 'lib-form-builder', '--zhunam-primary');
    expect(resolvedValue).toBe('rgb(0, 0, 255)');

    const submitBackground = await page.evaluate(() => {
      const button = document.querySelector('lib-form-builder .fb-submit');
      return button ? getComputedStyle(button).backgroundColor : null;
    });
    expect(submitBackground).toBe('rgb(0, 0, 255)');
  });

  test('the same (0,1,1) selector beats a plain :root rule on lib-data-grid too', async ({ page }) => {
    await page.goto('/data-grid');
    await page.locator('lib-data-grid').waitFor();

    await page.addStyleTag({
      content: `
        :root { --zhunam-primary: rgb(255, 0, 0); }
        :root :is(lib-data-grid, lib-form-builder, lib-login-form, lib-register-form, lib-reset-password-form) {
          --zhunam-primary: rgb(0, 0, 255);
        }
      `,
    });

    const resolvedValue = await readCustomProperty(page, 'lib-data-grid', '--zhunam-primary');
    expect(resolvedValue).toBe('rgb(0, 0, 255)');
  });

  test('nested case: a rule on the outer lib-login-form inherits into the internal lib-form-builder it renders, and a more specific rule on the inner one wins', async ({
    page,
  }) => {
    // The only real place on this site where one of these selectors
    // renders inside another (auth/CLAUDE.md): LoginForm wraps
    // <lib-form-builder> internally. /auth has no external dependency
    // either (MockAuthService backs the demo), so this is still safe to
    // navigate to for this one nested-case check.
    await page.goto('/auth');
    await page.locator('lib-login-form lib-form-builder .fb-submit').waitFor();

    await page.addStyleTag({ content: 'lib-login-form { --zhunam-primary: rgb(10, 20, 30); }' });

    const outerValue = await readCustomProperty(page, 'lib-login-form', '--zhunam-primary');
    const innerValueBeforeOverride = await readCustomProperty(
      page,
      'lib-login-form lib-form-builder',
      '--zhunam-primary',
    );
    expect(outerValue).toBe('rgb(10, 20, 30)');
    // Inherited through the real DOM: Angular's ViewEncapsulation.Emulated
    // (used by both components) is attribute-based scoping, not a Shadow
    // DOM boundary, so CSS custom properties inherit through it exactly
    // like any other element in the tree.
    expect(innerValueBeforeOverride).toBe('rgb(10, 20, 30)');

    const innerSubmitBackgroundBeforeOverride = await page.evaluate(() => {
      const button = document.querySelector('lib-login-form lib-form-builder .fb-submit');
      return button ? getComputedStyle(button).backgroundColor : null;
    });
    expect(innerSubmitBackgroundBeforeOverride).toBe('rgb(10, 20, 30)');

    // A more specific rule (two type selectors, (0,0,2) vs the previous
    // rule's (0,0,1)) targeting the inner component directly.
    await page.addStyleTag({
      content: 'lib-login-form lib-form-builder { --zhunam-primary: rgb(40, 50, 60); }',
    });

    const innerValueAfterOverride = await readCustomProperty(
      page,
      'lib-login-form lib-form-builder',
      '--zhunam-primary',
    );
    const outerValueUnchanged = await readCustomProperty(page, 'lib-login-form', '--zhunam-primary');
    expect(innerValueAfterOverride).toBe('rgb(40, 50, 60)');
    // The outer element itself is never matched by the inner-only rule,
    // its own value must stay exactly what it was.
    expect(outerValueUnchanged).toBe('rgb(10, 20, 30)');

    const innerSubmitBackgroundAfterOverride = await page.evaluate(() => {
      const button = document.querySelector('lib-login-form lib-form-builder .fb-submit');
      return button ? getComputedStyle(button).backgroundColor : null;
    });
    expect(innerSubmitBackgroundAfterOverride).toBe('rgb(40, 50, 60)');
  });
});
