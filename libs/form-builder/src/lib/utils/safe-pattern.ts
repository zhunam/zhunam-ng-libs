const MAX_PATTERN_LENGTH = 300;

/** Matches a group that repeats another quantifier, e.g. `(x+)+`, `(x*)*`. */
const NESTED_QUANTIFIER = /\([^()]*[+*][^()]*\)[+*]/;

/** Matches a repeated group so its alternated branches can be compared. */
const REPEATED_GROUP = /\(([^()]*)\)[+*]/g;

/**
 * Validates that a regex `pattern` string is safe enough to compile into
 * a `RegExp` for form validation.
 *
 * This is a heuristic, not a mathematical guarantee of ReDoS-safety: it
 * rejects the pattern shapes most commonly responsible for catastrophic
 * backtracking (nested quantifiers, overlapping alternation inside a
 * repeated group) and enforces a length cap, but a maliciously crafted
 * pattern could still slip through undetected. Never accept `pattern`
 * values from a fully untrusted source without your own review.
 *
 * @throws {Error} If `pattern` is longer than 300 characters, or matches
 * a known catastrophic-backtracking shape.
 */
export function assertSafePattern(pattern: string): void {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(
      `Unsafe regex pattern: exceeds the ${MAX_PATTERN_LENGTH}-character limit.`,
    );
  }

  if (NESTED_QUANTIFIER.test(pattern)) {
    throw new Error(
      'Unsafe regex pattern: nested quantifiers detected (e.g. (x+)+), a known catastrophic-backtracking shape.',
    );
  }

  if (hasOverlappingAlternation(pattern)) {
    throw new Error(
      'Unsafe regex pattern: overlapping alternation inside a repeated group detected (e.g. (a|a)+), a known catastrophic-backtracking shape.',
    );
  }
}

function hasOverlappingAlternation(pattern: string): boolean {
  const repeatedGroup = new RegExp(REPEATED_GROUP);
  let match: RegExpExecArray | null;

  while ((match = repeatedGroup.exec(pattern)) !== null) {
    const branches = match[1].split('|');
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        if (branchesOverlap(branches[i], branches[j])) {
          return true;
        }
      }
    }
  }

  return false;
}

function branchesOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.startsWith(b) || b.startsWith(a);
}
