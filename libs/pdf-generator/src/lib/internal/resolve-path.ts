/**
 * Path segments rejected by `resolvePath()` because reading (or, on a
 * write path, assigning) them can reach `Object.prototype` and pollute
 * every object in the runtime (CWE-1321). Templates never need to
 * reference these on purpose, so any occurrence is treated as an attack,
 * not a normal missing-data case.
 */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Matches a `{{ path }}` placeholder. The character class excludes `{`
 * and `}`, so the lazy `+?` can never backtrack across brace boundaries;
 * this pattern has no catastrophic-backtracking shape.
 */
const PLACEHOLDER_PATTERN = /\{\{([^{}]+?)\}\}/g;

/**
 * Thrown by `resolvePath()` (and, through it, `resolveTemplateString()`)
 * when a template path contains a segment that could reach
 * `Object.prototype`. Exported so a consumer rendering a template
 * sourced from a third party can catch it specifically, instead of a
 * generic `Error`.
 */
export class PdfTemplateSecurityError extends Error {
  constructor(segment: string) {
    super(
      `Blocked path segment "${segment}": it could reach Object.prototype and is never a legitimate template path.`,
    );
    this.name = 'PdfTemplateSecurityError';
  }
}

/**
 * Reads a dot-separated `path` out of `data` by walking one key at a
 * time. Never evaluates `path` as an expression, a segment is always
 * used as a literal object key, even if it looks like one (e.g.
 * `'1 + 1'` is read as the key `"1 + 1"`, not computed).
 *
 * @returns The resolved value, or `undefined` if any segment is missing
 * or an intermediate value along the way is not an object.
 * @throws {PdfTemplateSecurityError} If any segment is exactly
 * `'__proto__'`, `'constructor'`, or `'prototype'`. This check runs
 * before anything else for that segment, so it fires even if walking
 * the rest of the path would otherwise have resolved to `undefined`.
 */
export function resolvePath(path: string, data: unknown): unknown {
  let current: unknown = data;

  for (const segment of path.split('.')) {
    if (FORBIDDEN_SEGMENTS.has(segment)) {
      throw new PdfTemplateSecurityError(segment);
    }

    if (current === null || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Replaces every `{{path}}` placeholder in `template` with the value
 * `resolvePath()` finds for that path in `data`, coerced to a string.
 * A placeholder with no matching value resolves to an empty string, it
 * never leaves the literal text `undefined` behind and never throws for
 * that case alone (an unsafe path still throws, via `resolvePath()`).
 *
 * The resolved value is inserted as plain text through a single
 * `String.prototype.replace` pass; it is never fed back through this
 * function or re-scanned for placeholders of its own, so a value that
 * itself contains `{{...}}` is never re-resolved.
 */
export function resolveTemplateString(template: string, data: unknown): string {
  return template.replace(PLACEHOLDER_PATTERN, (_match, rawPath: string) => {
    const value = resolvePath(rawPath.trim(), data);
    return value === undefined || value === null ? '' : String(value);
  });
}
