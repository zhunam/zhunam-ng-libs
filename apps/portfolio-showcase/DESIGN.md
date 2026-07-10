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
  hero-bg: "#0f172a"
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
- The home hero is a deliberate dark surface — the one section on the site that inverts, and the only full-bleed (edge-to-edge, viewport-width) element in the layout, everything else respects the shared `w-[90%]` shell. Any accent tint placed on it uses a *lighter* teal tuned separately for dark backgrounds (the base teal fails contrast there).
- The header is `position: sticky` and transparent over the hero on load; it only gains a solid white fill, border, and shadow once the page scrolls past it (home route only — every other page keeps the solid header, since it has no dark hero to sit over).

## 2. Colors

A single accent over near-white, Tailwind's own Slate scale carrying every neutral — restrained by design, per the product register default and the brief's explicit "one accent" instruction.

### Primary
- **Signal Teal** (`#2c5f5d`): the only accent. Used for primary buttons, the one "Available" / live-package badge, hover/focus states on links and cards — never inside heading or body text. 7.24:1 against white in both directions (text-on-white and white-on-fill) — verified, not eyeballed.
- **Signal Teal (on dark)** (`#8ba7a6`): a lightened variant used for any teal accent inside the dark hero — link hover states, focus rings. The base Signal Teal measures only 2.47:1 against Hero (`#0f172a`), failing AA; this lighter tint clears 6.95:1. Two values, one hue, each scoped to the surface it's readable on.

### Neutral
- **Vellum** (`#ffffff`): the page background, everywhere, no exceptions. No gray "section" fill — regions are separated by spacing and hairline borders instead.
- **Hairline** (`#e2e8f0`, Tailwind Slate-200): the one border color in the system — header bottom edge, card boundaries, table wrapper.
- **Ink** (`#0f172a`, Tailwind Slate-900): headings and primary text. 17.85:1 against Vellum.
- **Ink Muted** (`#475569`, Tailwind Slate-600): secondary text, descriptions, captions. 7.58:1 against Vellum — safe at full opacity, no opacity-blend guesswork needed this time.
- **Hero** (`#0f172a`, Tailwind Slate-900): the home hero section's background — the one section on the site that inverts to dark, rendered full-bleed. White text (17.85:1), Slate-300 secondary text (12.02:1) — both measured directly against the flat `#0f172a` fill, ignoring the glow (the glow only ever raises contrast further, see the Background Glow entry under Components).

### Named Rules
**The One Accent Rule.** Teal is the only brand color. No second hue for status/info — a badge is either filled teal (live, actionable) or plain slate-outlined (informational, inactive). Never invent a second accent to fill a gap.

**The No-Fill-Section Rule.** Never use a gray background to separate a region of the page. Separation comes from spacing (`gap-*`, section padding) and a single hairline border, never from `bg-slate-100`/`bg-slate-200` panels.

## 3. Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

**Character:** One system sans across the whole interface — no Google Fonts request. Evaluated against the brief's own ask (Hanken Grotesk/Inter vs. system-ui): the visual gain from a licensed grotesk over a modern OS system font is marginal on a product surface (Segoe UI Variable / San Francisco / Linux system sans are already well-drawn), while a Google Fonts load adds a second external origin, a render-blocking or FOUC-prone request, and an IP-logging third party — real costs for a "precise, credible" tool site with nothing to gain visually that weight/size hierarchy doesn't already deliver. The one monospace exception renders real code and real package identifiers only, never decoration.

### Hierarchy
- **Hero Heading** (700, `text-6xl`/60px scaling to `text-7xl`/72px at `lg:`, 1.1 line-height, tight tracking, `text-wrap: balance`): one per page, home only, centered inside a full-bleed `min-h-[80vh]` dark hero section so it has real presence instead of reading as a compact text block. White, not Ink — the one heading that sits on a dark surface — but still a single color; no accent-colored word mixed into the sentence, that two-tone-title pattern reads as generic AI-landing-page scaffolding and is explicitly banned (see Do's and Don'ts). Stays under the frontend-design skill's clamp() ceiling of ~96px. The heading is deliberately generic to the whole portfolio ("Angular libraries, built for real products") — it never names or previews one specific library, since the hero represents the whole site, not one product.
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
- **Shape:** 0.75rem radius, 1px Hairline border, no shadow at rest. Cards size to their own content (`min-width`/`max-width`, not `1fr`) and sit in a `flex-wrap` row capped at `max-w-4xl` — never stretched to fill the page's full 90%-width container, which is what reads as "empty" when there's only one or two real cards. Content inside is vertically centered (`justify-center`) so a taller neighbor card never leaves dead space at the bottom.
- **Hover / Focus:** border shifts to Signal Teal, the card lifts 2px, 200ms ease-out; visible `focus-visible` outline in Signal Teal, 2px, 2px offset.
- **Placeholder variant ("more coming soon"):** same shape, but a **dashed** Hairline border instead of solid, and no interactive states — it's a `<div>`, not a link. Content (icon + one line of text) is centered both axes. The icon sits inside a 4rem circular Signal-Teal-tinted badge (`bg-primary/10`, icon in solid Signal Teal) at 2rem — colorful and present without introducing a second hue. The dashed edge plus the softer badge fill are the only signals needed to read it as "not yet here, but real"; no per-library names or invented dates.

### Form Fields
- **Style:** plain Vellum fill, 1px Hairline border, 0.5rem radius (`--radius-field`) — same visual language as everything else, no special "input chrome." `focus-visible` gets the standard Signal Teal outline, 2px, 2px offset.
- **Validation:** errors render in red (`text-red-600`) below the field — the one accepted exception to the One Accent Rule, since a validation error needs a color no reasonable viewer confuses with brand or status teal. The invalid input itself is never blocked or cleared; the last valid derived state (e.g. the table's data) simply stops updating until the input is valid again.

### Badges
- **Live/status:** filled pill, Signal Teal background, white text (`badge-primary`). Used once per context — the package-name tag, the "Disponible" tag — never repeated as decoration.
- **Coming Soon / informational:** outline pill, Hairline border, Ink Muted text. No fill — visually recedes, matching its non-interactive role.

### Avatar
- **Style:** `avatar avatar-placeholder` (daisyUI v5), 2.5rem circle, Signal Teal fill, white initial.

### Full-Bleed Hero (signature component)
- **Style:** the home hero breaks out of the shared `w-[90%]` shell to span the true 100% viewport width, no side padding, no `rounded-box` — it reads as the page's actual background for that section, not a floating panel. Implemented with the standard full-bleed technique (`relative left-1/2 right-1/2`, negative `50vw` margins, `w-screen`) plus a negative top margin (`-mt-28`) that pulls it up underneath the sticky header and the `<main>` shell's own top padding, so there's no gap or seam at the top of the page. `overflow-hidden` on the section contains the glow (below) so it never bleeds past the hero's own edges. `body { overflow-x: hidden }` guards against the `100vw` trick introducing a horizontal scrollbar on browsers that reserve layout space for one.
- **Content:** a single centered column (`max-w-3xl`, `items-center`, `text-center`), not the previous two-column layout. Heading, one line of body copy, and one optional soft text CTA — nothing library-specific (no install snippet, no per-library buttons); those live where they're actually useful (the Library Explorer card, the demo page's own Usage panel), not duplicated in the hero.
- **CTA:** "Explore the libraries →" is a plain text link (not a `.btn`) — deliberately light-weight, since the hero's job is to state the thesis, not to push an action. It anchor-scrolls (`href="#library-explorer"`, `html { scroll-behavior: smooth }`) to the Library Explorer section, which carries `scroll-mt-24` so the sticky header never overlaps its heading after the jump.
- **Scope rule:** this is the only inverted, only full-bleed surface. It is not a dark mode — the rest of the page (Library Explorer, FAQ, footer) stays on Vellum inside the normal `w-[90%]` shell. Don't extend either treatment to any other section without an explicit reason.

### Background Glow
- **Style:** a single large (`h-130 w-205`, ~832×520px) circle, `bg-[#8ba7a6]/20`, `blur-[100px]`, centered behind the hero's text via `absolute inset-0 flex items-center justify-center`. 100% CSS — no image, no SVG, no illustration. `pointer-events-none` and `aria-hidden="true"` since it's purely decorative.
- **Contrast rule:** verified at 20% opacity blended over the `#0f172a` Hero fill (effective background ≈ `#283443`): white text 12.63:1, Slate-300 text 8.51:1 — both comfortably clear AA even with the glow directly behind them. 20% was chosen as the subtlest value in the tested range (10–30%) that still reads as a deliberate light source rather than a flat tint.
- **Content rule:** color only, tuned to the existing Signal-Teal-on-dark token — never a second hue, never particles/iconography/stock imagery layered on top.

### Sticky Header
- **Style:** `position: sticky; top: 0`, `h-16`, `z-50`, so it stays pinned through scroll on every page. On the home route, while unscrolled, it renders fully transparent with white/slate-200 text sitting directly over the hero; past an 8px scroll threshold (or on any non-home route) it switches to a solid `bg-white/95` fill with a hairline bottom border and a subtle shadow. The swap is a `[class]` binding driven by a `headerIsTransparent` computed signal (`isHome() && !scrolled()`), not a CSS-only trick, since it also depends on route. All color/border/shadow changes transition over 300ms.
- **Scope rule:** transparent-over-dark only applies on the home route, where the hero underneath it is dark. Every other route keeps the solid header regardless of scroll position, since there's no dark surface for transparent light text to sit on safely.

### FAQ List
- **Style:** native `<details>`/`<summary>` accordion, `divide-y`/`border-y` Hairline rules between entries — no cards, no fill, consistent with the No-Fill-Section Rule. Question (semibold Ink) collapsed by default; answer (Ink Muted) revealed on click, no JS.
- **Expand indicator:** a plain "+" character, Ink Muted, that rotates 45° into a "×" on open (CSS `rotate-45` on `[open]`, 200ms ease-out) — not a new icon, and the browser's native disclosure marker is hidden in favor of it.
- **Content rule:** real, specific questions a developer evaluating the library would actually ask, answered honestly — including admitting current limitations (not yet published to npm, v1/active development). No marketing copy, no filler questions.

### Navigation
- **Header:** brand wordmark + a real external link (GitHub) — no placeholder nav items pointing at pages that don't exist yet. See Sticky Header above for the transparent/solid behavior; colors swap between white/slate-200 (transparent, home hero) and Ink/Slate-600 (solid) accordingly, always Signal Teal or Signal-Teal-on-dark on hover depending on state.
- **Sidebar (library pages):** a vertical list of every library; the current one highlighted with a Signal-Teal-tinted background and text; unreleased libraries render as plain, non-interactive `<span>` rows tagged "Coming Soon" — never a dead `<a>`.

## 6. Do's and Don'ts

Directly enforces PRODUCT.md's anti-references, plus two new rules this redesign introduced: no fabricated facts, and no gray section fills.

### Do:
- **Do** keep every heading and sentence a single color (Ink). Signal Teal marks controls and status, never a word inside a title.
- **Do** use Signal Teal as the only accent — one hue, used deliberately (primary actions, the live badge, focus rings).
- **Do** separate sections with spacing and a single hairline border, never a gray background fill.
- **Do** use the lightened `#8ba7a6` teal (not the base `#2c5f5d`) for any accent placed on the dark hero.
- **Do** show only verifiable facts in library cards and usage panels — real package names, real capabilities, no invented version numbers or fake log output.
- **Do** render "Coming Soon" library entries as non-interactive elements (`<span>`/`<div>`), never as a dead link.
- **Do** keep the dark, full-bleed treatment scoped to the home hero only. Library Explorer, FAQ, the demo page, and the footer stay on Vellum inside the normal `w-[90%]` shell — this is one inverted section, not a dark mode.
- **Do** keep the hero's content generic to the whole portfolio (title + subtitle + one soft CTA) — no per-library preview, snippet, or button belongs there; that content lives on the library's own card/page.

### Don't:
- **Don't** color part of a heading or sentence to create emphasis ("built for **real products**"-style two-tone titles). It's one of the most recognizable generic-AI-landing tells — every title stays one color; use weight or a separate element for emphasis instead.
- **Don't** introduce a second accent color for status/info. One teal, two roles at most (filled = live, outlined = inactive), never a second hue.
- **Don't** add a `bg-slate-100`/`bg-slate-200` fill to separate a section — that's the exact gray-panel pattern this redesign replaced.
- **Don't** fabricate a version number, a build log, or a usage statistic ("v1.4.0", "42 entries", "Optimizing bundles...") for anything that isn't actually published or measured yet.
- **Don't** pair a 1px border with a box-shadow on the same card (the ghost-card tell — still banned).
- **Don't** load a second typeface via Google Fonts or any external font CDN — the system-ui stack is the deliberate choice, not a placeholder.
- **Don't** link a nav item, button, or sidebar entry to a page that doesn't exist. Every `<a>` in this system has a real destination.
- **Don't** feature one specific library (a name, a preview, an install command) in the hero — it represents the whole portfolio, not one product.
- **Don't** build the background glow from an image, SVG illustration, or particle effect — it's a blurred, low-opacity color shape only, per the CSS-only rule for this component.
