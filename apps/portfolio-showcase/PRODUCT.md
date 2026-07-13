# Product

## Register

product

## Users

Recruiters, potential clients, and fellow developers evaluating the author's
Angular skills. They land on a specific library's demo page (often via a
direct link) to quickly see whether the component is real and production
ready — not a static screenshot, but something they can click, sort, and
paginate themselves.

## Product Purpose

`portfolio-showcase` is the live demonstration surface for the `@zhunam/*`
Angular libraries built in this monorepo. Each library gets its own demo
page showing its actual public API in action (inputs, outputs, real
interaction) — proving the library works standalone, the way a third-party
consumer would use it. Success looks like: a visitor understands what a
library does and trusts its quality within seconds of landing on its demo.

## Brand Personality

Precise, rigorous, credible. The voice of a senior engineer who doesn't cut
corners — confidence through demonstrated craft (working code, clean
interaction, accessible by default), not through marketing language.

## Anti-references

Generic AI-generated SaaS scaffolding: cream/beige/sand body backgrounds,
gradient text, tiny uppercase tracked eyebrows above every section,
numbered 01/02/03 markers used decoratively, identical icon+heading card
grids, the hero-metric template (big number + small label + gradient
accent).

## Design Principles

- Show, don't tell — every library demo must be a real, interactive
  instance of the component, not a screenshot or a text description.
- Credibility through restraint — no decoration that isn't earning its
  place; polish reads as attention to detail, not as flourish.
- Consistent shell, distinct content — the app chrome (header, navigation)
  stays quiet and identical across every demo, so each library's own UI is
  what visitors judge.
- Accessible by default — every demo meets the same bar the libraries
  themselves are built to (keyboard operability, visible focus, ARIA
  correctness), never treated as optional polish.

## Accessibility & Inclusion

WCAG AA baseline across the shell and every demo page: ≥4.5:1 text
contrast, visible `:focus-visible` on all interactive elements, keyboard
operability (not just hover/click), `prefers-reduced-motion` respected for
any motion added.
