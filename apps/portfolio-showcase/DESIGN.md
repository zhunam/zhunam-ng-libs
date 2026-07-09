---
name: Zhunam Portfolio Showcase
description: The live demo surface for the @zhunam/* Angular component libraries.
colors:
  vellum: "#ffffff"
  vellum-hover: "#fafafa"
  hairline: "#e2e8f0"
  ink: "#0f172a"
  ink-muted: "#475569"
  signal-teal: "#2c5f5d"
  signal-teal-content: "#ffffff"
  signal-teal-on-dark: "#8ba7a6"
  console-bg: "#0f172a"
typography:
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  heading:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  mono-label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  selector: "0.375rem"
  field: "0.5rem"
  box: "0.75rem"
spacing:
  sm: "0.75rem"
  md: "1.5rem"
  lg: "3rem"
  section: "6rem"
components:
  card-bounded:
    backgroundColor: "{colors.vellum}"
    textColor: "{colors.ink}"
    rounded: "{rounded.box}"
    padding: "1.5rem"
  badge-signal:
    backgroundColor: "{colors.signal-teal}"
    textColor: "{colors.signal-teal-content}"
    rounded: "9999px"
    padding: "0.125rem 0.625rem"
  badge-coming-soon:
    backgroundColor: "{colors.vellum}"
    textColor: "{colors.ink-muted}"
  console-panel:
    backgroundColor: "{colors.console-bg}"
    textColor: "#f1f5f9"
    rounded: "{rounded.box}"
    padding: "1.5rem"
---

# Design System: Zhunam Portfolio Showcase

## 1. Overview

**Creative North Star: "The Single Signal"**

One accent, everywhere it appears, means the same thing: this is real and it works. Desaturated teal is the only color in the system besides ink-on-white — no second brand hue competing for attention, no status-color vocabulary to learn. Everything else is slate: near-black text, mid-slate secondary text, a hairline border to separate sections instead of gray fill panels. The name doubles as a nod to the actual technology on display — Angular signals — and to the palette's own restraint: one signal, not noise.

This is a **product** surface (register confirmed in PRODUCT.md): a developer-hub layout — header, hero, a live component playground, a sidebar between libraries — built to prove the `@zhunam/*` libraries work, not to sell a story. It rejects the AI-generated-portfolio look on the same terms as before: no cream/beige background, no gradient text, no uppercase eyebrow repeated over every section, no fabricated version numbers or fake terminal logs. Every fact shown (package names, feature checkmarks, code snippets) is something that's actually true of the code today.

**Key Characteristics:**
- Pure white page background, no gray section fills — regions are separated by spacing and a single 1px hairline border, never by a `bg-slate-100` panel.
- One accent (teal) used deliberately: primary actions, the one live status badge, focus rings. Never decoration for its own sake.
- One type family, hierarchy from weight and size only — never color. A title mixing an accent-colored word into an otherwise ink-colored sentence is the "generic AI landing page" tell; every heading in this system is a single color.
- The one dark surface in the system — a console-styled install panel — is a deliberate, contained departure, not inconsistent theming; its accent tint is a *lighter* teal tuned separately for that background (the base teal fails contrast on dark).

## 2. Colors

A single accent over near-white, Tailwind's own Slate scale carrying every neutral — restrained by design, per the product register default and the brief's explicit "one accent" instruction.

### Primary
- **Signal Teal** (`#2c5f5d`): the only accent. Used for primary buttons, the one "Available" / live-package badge, hover/focus states on links and cards — never inside heading or body text. 7.24:1 against white in both directions (text-on-white and white-on-fill) — verified, not eyeballed.
- **Signal Teal (on dark)** (`#8ba7a6`): a lightened variant used exclusively inside the console-styled install panel. The base Signal Teal measures only 2.47:1 against the panel's near-black background — this lighter tint (7.33:1) is the value that actually stays legible there. Two values, one hue, each scoped to the surface it's readable on.

### Neutral
- **Vellum** (`#ffffff`): the page background, everywhere, no exceptions. No gray "section" fill — regions are separated by spacing and hairline borders instead.
- **Hairline** (`#e2e8f0`, Tailwind Slate-200): the one border color in the system — header bottom edge, card boundaries, table wrapper.
- **Ink** (`#0f172a`, Tailwind Slate-900): headings and primary text. 17.85:1 against Vellum.
- **Ink Muted** (`#475569`, Tailwind Slate-600): secondary text, descriptions, captions. 7.58:1 against Vellum — safe at full opacity, no opacity-blend guesswork needed this time.
- **Console** (`#0f172a`): the install panel's background — the one deliberately dark surface on an otherwise all-white site.

### Named Rules
**The One Accent Rule.** Teal is the only brand color. No second hue for status/info — a badge is either filled teal (live, actionable) or plain slate-outlined (informational, inactive). Never invent a second accent to fill a gap.

**The No-Fill-Section Rule.** Never use a gray background to separate a region of the page. Separation comes from spacing (`gap-*`, section padding) and a single hairline border, never from `bg-slate-100`/`bg-slate-200` panels.

## 3. Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

**Character:** One system sans across the whole interface — no Google Fonts request. Evaluated against the brief's own ask (Hanken Grotesk/Inter vs. system-ui): the visual gain from a licensed grotesk over a modern OS system font is marginal on a product surface (Segoe UI Variable / San Francisco / Linux system sans are already well-drawn), while a Google Fonts load adds a second external origin, a render-blocking or FOUC-prone request, and an IP-logging third party — real costs for a "precise, credible" tool site with nothing to gain visually that weight/size hierarchy doesn't already deliver. The one monospace exception renders real code and real package identifiers only, never decoration.

### Hierarchy
- **Hero Heading** (700, `text-5xl`/80px, 1.1 line-height, tight tracking, `text-wrap: balance`): one per page, home only. Single color (Ink) — no accent-colored word mixed into the sentence; that two-tone-title pattern reads as generic AI-landing-page scaffolding and is explicitly banned (see Do's and Don'ts).
- **Section Heading** (700, `text-2xl`–`text-4xl`): "Live Demo", "Library Explorer", one per section.
- **Body** (400, `text-base`–`text-lg`, 1.625 line-height, `max-w-prose`): descriptive paragraphs under a heading.
- **Label** (600, `text-sm`): card titles, sidebar entries, the "Featured Project" section tag — sentence case, not uppercase-tracked (an uppercase eyebrow above every section is an explicit anti-pattern; this system uses normal-case bold labels instead).
- **Mono Label** (500, `text-xs`): package identifiers (`@zhunam/data-grid`) and the usage code panel only.

### Named Rules
**The Single-Face Rule.** No second typeface, licensed or system. Every hierarchy level is the same family; only weight and size change — never color within a single heading or sentence.

## 4. Elevation

Flat by default, split by role exactly as before: a surface is either a **bounded region** (Vellum fill, one Hairline border, no shadow) or a **raised surface** (daisyUI `--depth: 1`, no border). This system leans further toward "bounded" than the previous one — per the No-Fill-Section Rule, most cards in this redesign are simple white-with-hairline-border regions, not shadowed cards; the raised treatment is reserved for genuinely interactive destinations (the Library Explorer cards, the primary buttons), not static content panels.

### Named Rules
**The Ghost-Card Refusal.** Never pair a 1px border with a box-shadow on the same element. Unchanged from the previous system — still the single most common "AI card" tell, and still refused here.

## 5. Components

### Bounded Panels
- **Shape:** 0.75rem radius, 1px Hairline border, Vellum fill, no shadow.
- **Use:** the table wrapper, the "Fila seleccionada" panel, the usage-code panel, the Technical Foundation panel — any static content region.

### Interactive Cards (Library Explorer)
- **Shape:** 0.75rem radius, 1px Hairline border, no shadow at rest.
- **Hover / Focus:** border shifts to Signal Teal, the card lifts 2px, 200ms ease-out; visible `focus-visible` outline in Signal Teal, 2px, 2px offset. Disabled ("Coming Soon") cards get none of this — they're `<div>`, not `<a>`, so there's nothing to focus or click.

### Badges
- **Live/status:** filled pill, Signal Teal background, white text (`badge-primary`). Used once per context — the package-name tag, the "Disponible" tag — never repeated as decoration.
- **Coming Soon / informational:** outline pill, Hairline border, Ink Muted text. No fill — visually recedes, matching its non-interactive role.

### Avatar
- **Style:** `avatar avatar-placeholder` (daisyUI v5), 2.5rem circle, Signal Teal fill, white initial.

### Console Panel (signature component)
- **Style:** Console background (`#0f172a`), white/slate-100 body text, Signal Teal-on-dark (`#8ba7a6`) for checkmarks — never the base Signal Teal, which fails contrast here.
- **Content rule:** real facts only. `$ npm install @zhunam/data-grid` plus verifiable claims (standalone, signal-based, zero runtime deps) — never a fabricated build log, a fake "Signals detected" line, or an unpublished version number.

### Navigation
- **Header:** brand wordmark (Ink, Signal Teal on hover) + a real external link (GitHub) — no placeholder nav items pointing at pages that don't exist yet.
- **Sidebar (library pages):** a vertical list of every library; the current one highlighted with a Signal-Teal-tinted background and text; unreleased libraries render as plain, non-interactive `<span>` rows tagged "Coming Soon" — never a dead `<a>`.

## 6. Do's and Don'ts

Directly enforces PRODUCT.md's anti-references, plus two new rules this redesign introduced: no fabricated facts, and no gray section fills.

### Do:
- **Do** keep every heading and sentence a single color (Ink). Signal Teal marks controls and status, never a word inside a title.
- **Do** use Signal Teal as the only accent — one hue, used deliberately (primary actions, the live badge, focus rings).
- **Do** separate sections with spacing and a single hairline border, never a gray background fill.
- **Do** use the lightened `#8ba7a6` teal (not the base `#2c5f5d`) for any accent placed on the dark console panel.
- **Do** show only verifiable facts in the console panel and library cards — real package names, real capabilities, no invented version numbers or fake log output.
- **Do** render "Coming Soon" library entries as non-interactive elements (`<span>`/`<div>`), never as a dead link.

### Don't:
- **Don't** color part of a heading or sentence to create emphasis ("built for **real products**"-style two-tone titles). It's one of the most recognizable generic-AI-landing tells — every title stays one color; use weight or a separate element for emphasis instead.
- **Don't** introduce a second accent color for status/info. One teal, two roles at most (filled = live, outlined = inactive), never a second hue.
- **Don't** add a `bg-slate-100`/`bg-slate-200` fill to separate a section — that's the exact gray-panel pattern this redesign replaced.
- **Don't** fabricate a version number, a build log, or a usage statistic ("v1.4.0", "42 entries", "Optimizing bundles...") for anything that isn't actually published or measured yet.
- **Don't** pair a 1px border with a box-shadow on the same card (the ghost-card tell — still banned).
- **Don't** load a second typeface via Google Fonts or any external font CDN — the system-ui stack is the deliberate choice, not a placeholder.
- **Don't** link a nav item, button, or sidebar entry to a page that doesn't exist. Every `<a>` in this system has a real destination.
