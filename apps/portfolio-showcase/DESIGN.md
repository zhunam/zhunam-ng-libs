---
name: Zhunam Portfolio Showcase
description: The live demo surface for the @zhunam/* Angular component libraries.
colors:
  vellum: "#ffffff"
  vellum-hover: "#fafafa"
  hairline: "#e2e8f0"
  ink: "#0F252A"
  ink-muted: "#475569"
  signal-teal: "#2c5f5d"
  signal-teal-content: "#ffffff"
  signal-teal-on-dark: "#8ba7a6"
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

One accent, everywhere it appears, means the same thing: this is real and it works. Desaturated teal is the only color in the system besides ink-on-white: no second brand hue competing for attention, no status-color vocabulary to learn. Everything else is slate: near-black text, mid-slate secondary text, a hairline border to separate sections instead of gray fill panels. The name doubles as a nod to the actual technology on display (Angular signals) and to the palette's own restraint: one signal, not noise.

This is a **product** surface (register confirmed in PRODUCT.md): a developer-hub layout (header, hero, a live component playground, a sidebar between libraries) built to prove the `@zhunam/*` libraries work, not to sell a story. It rejects the AI-generated-portfolio look on the same terms as before: no cream/beige background, no gradient text, no uppercase eyebrow repeated over every section, no fabricated version numbers or fake terminal logs. Every fact shown (package names, feature checkmarks, code snippets) is something that's actually true of the code today.

**Key Characteristics:**
- Pure white page background, no gray section fills. Regions are separated by spacing and a single 1px hairline border, never by a `bg-slate-100` panel.
- One accent (teal) used deliberately: primary actions, the one live status badge, focus rings. Never decoration for its own sake.
- One type family, hierarchy from weight and size only, never color. A title mixing an accent-colored word into an otherwise ink-colored sentence is the "generic AI landing page" tell; every heading in this system is a single color.
- The home hero is a deliberate dark surface: the one section on the site that inverts, and the only full-bleed (edge-to-edge, viewport-width) element in the layout. Everything else respects the shared `w-[90%]` shell. Any accent tint placed on it uses a *lighter* teal tuned separately for dark backgrounds (the base teal fails contrast there).
- The header is `position: sticky` and transparent over the hero on load; it only gains a solid white fill, border, and shadow once the page scrolls past it (home route only; every other page keeps the solid header, since it has no dark hero to sit over).
- **Ink is one token, two jobs.** Primary text and every dark surface fill (the hero, code/usage panels) both read from the same daisyUI theme variable, `--color-base-content`, via the `text-base-content`/`bg-base-content` utilities, not a hardcoded `text-slate-900`/`bg-slate-900`. There's exactly one dark color in the system; it just gets used as a foreground in most places and as a background in a few. Secondary/muted text (descriptions, captions, disabled states) is the one thing that stays on Tailwind's literal Slate scale (`text-slate-600`, `-400`, `-300`, `-500`) rather than a theme token; see Colors below for why that's still safe.
- Library-specific demo pages (e.g. the Data Grid Live Demo) lead with the package identifier itself (large, bold, mono, Signal Teal) rather than a generic page title; see **Package Identifier Label** under Components. Every future library's demo page should follow the same header shape.
- A separate **Featured Project** section on home (its own section, never inside the Library Explorer grid) surfaces a non-library `apps/*` piece — the crypto market dashboard is the first one — with a larger single card and this system's Live badge activated for the first time, since it's the first project that actually consumes live data rather than example content. See **Featured Project** under Components.
- Below `lg`, per-library demo pages navigate via a drawer: a small tab pinned to the screen's left edge, below the header, that slides a sidebar out over the content on tap; see **Mobile Drawer Navigation** under Components.

## 2. Colors

A single accent over near-white, Tailwind's own Slate scale carrying every neutral, restrained by design, per the product register default and the brief's explicit "one accent" instruction.

### Primary
- **Signal Teal** (`#2c5f5d`): the only accent. Used for primary buttons, hover/focus states on links and cards, the package-identifier label; never inside heading or body text. 7.24:1 against Vellum in both directions (text-on-white and white-on-fill), verified, not eyeballed.
- **Signal Teal (on dark)** (`#8ba7a6`): a lightened variant used for any teal accent inside the dark hero: link hover states, focus rings. The base Signal Teal measures only 2.20:1 against Ink (`#0F252A`) used as a dark surface, failing AA; this lighter tint clears 6.20:1. Two values, one hue, each scoped to the surface it's readable on.

### Neutral
- **Vellum** (`#ffffff`): the page background, everywhere, no exceptions. No gray "section" fill; regions are separated by spacing and hairline borders instead.
- **Hairline** (`#e2e8f0`, Tailwind Slate-200): the one border color in the system: header bottom edge, card boundaries, form fields. (Exception: the Data Grid table wrapper itself now renders with no outer border; see Bounded Panels.)
- **Ink** (`#0F252A`): daisyUI's `--color-base-content`, applied via `text-base-content`/`bg-base-content`, never hardcoded as `slate-900`. A cooler, more teal-tinted near-black than Tailwind's own Slate-900, chosen to tie the system's one dark neutral to the brand hue instead of Tailwind's default blue-leaning gray. Two roles, one token:
  - **As text:** headings and primary body copy. 15.93:1 against Vellum.
  - **As a dark surface:** the home hero's flat background and the Usage/code panels: the one dark fill in the system doubles as the one dark text color, so there's a single source of truth instead of two coincidentally-matching hardcoded hex values. White text on it: 15.93:1. Slate-300 secondary text on it: 10.73:1. (The hero's glow changes these locally; see Background Glow under Components.)
- **Ink Muted** (`#475569`, Tailwind Slate-600): secondary text, descriptions, captions. 7.58:1 against Vellum, safe at full opacity, no opacity-blend guesswork needed. Stays a literal Tailwind utility, not a theme token, since it never doubles as a surface fill the way Ink does.

### Named Rules
**The One Accent Rule.** Teal is the only brand color for status/info in the general UI: a badge is either filled teal (live, actionable) or plain slate-outlined (informational, inactive). Never invent a second accent to fill a gap without a documented exception here. Two exist today, both because a normal viewer reads them as a different semantic category entirely, not as a competing brand hue: red (`text-red-600`) for form validation errors (see Form Fields), and red/green (`text-red-600`/`text-green-600`) for financial price-direction indicators (see Price Direction Indicator under Components, first used in `price-ticker`). No third exception without updating this rule.

**The No-Fill-Section Rule.** Never use a gray background to separate a region of the page. Separation comes from spacing (`gap-*`, section padding) and a single hairline border, never from `bg-slate-100`/`bg-slate-200` panels.

## 3. Typography

**Body Font:** system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
**Label/Mono Font:** ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

**Character:** One system sans across the whole interface: no Google Fonts request. Evaluated against the brief's own ask (Hanken Grotesk/Inter vs. system-ui): the visual gain from a licensed grotesk over a modern OS system font is marginal on a product surface (Segoe UI Variable / San Francisco / Linux system sans are already well-drawn), while a Google Fonts load adds a second external origin, a render-blocking or FOUC-prone request, and an IP-logging third party: real costs for a "precise, credible" tool site with nothing to gain visually that weight/size hierarchy doesn't already deliver. The one monospace exception renders real code and real package identifiers only, never decoration.

### Hierarchy
- **Hero Heading** (700, `text-6xl`/60px scaling to `text-7xl`/72px at `lg:`, 1.1 line-height, tight tracking, `text-wrap: balance`): one per page, home only, centered inside a full-bleed `min-h-[90vh]` dark hero section so it has real presence instead of reading as a compact text block. White, not Ink (the one heading that sits on a dark surface), but still a single color; no accent-colored word mixed into the sentence, that two-tone-title pattern reads as generic AI-landing-page scaffolding and is explicitly banned (see Do's and Don'ts). Stays under the frontend-design skill's clamp() ceiling of ~96px. The heading is deliberately generic to the whole portfolio ("Angular libraries, built for real products"); it never names or previews one specific library, since the hero represents the whole site, not one product.
- **Section Heading** (700, `text-2xl`): "Library Explorer", "FAQ", one per section. (Per-library demo pages are the exception: see Package Identifier Label under Components. The package name, not a `text-2xl`+ heading, is what leads there.)
- **Body** (400, `text-base`–`text-lg`, 1.625 line-height, `max-w-prose`): descriptive paragraphs under a heading.
- **Label** (600, `text-sm`): card titles, sidebar entries, the "Featured Project" section tag, sentence case, not uppercase-tracked (an uppercase eyebrow above every section is an explicit anti-pattern; this system uses normal-case bold labels instead).
- **Mono Label** (500, `text-xs`): package identifiers (`@zhunam/data-grid`) and the usage code panel only.

### Named Rules
**The Single-Face Rule.** No second typeface, licensed or system. Every hierarchy level is the same family; only weight and size change, never color within a single heading or sentence.

## 4. Elevation

Flat by default, split by role exactly as before: a surface is either a **bounded region** (Vellum fill, one Hairline border, no shadow) or a **raised surface** (daisyUI `--depth: 1`, no border). This system leans further toward "bounded" than the previous one; per the No-Fill-Section Rule, most cards in this redesign are simple white-with-hairline-border regions, not shadowed cards; the raised treatment is reserved for genuinely interactive destinations (the Library Explorer cards, the primary buttons), not static content panels.

### Named Rules
**The Ghost-Card Refusal.** Never pair a 1px border with a box-shadow on the same element. Unchanged from the previous system: still the single most common "AI card" tell, and still refused here.

## 5. Components

### Bounded Panels
- **Shape:** 0.75rem radius, 1px Hairline border, Vellum fill, no shadow.
- **Use:** the "Selected row" panel, the Edit columns/Edit data panels, the Usage panel: any static content region.
- **Exception (the data table wrapper):** rounded + Vellum fill, but deliberately **no** outer Hairline border. The grid component already draws its own internal row dividers, so an outer border on top of that read as double-framing; the rounded corners alone are enough to read as a contained region.

### Interactive Cards (Library Explorer)
- **Shape:** 0.75rem radius, 1px Hairline border, no shadow at rest. Cards size to their own content (`min-width`/`max-width`, not `1fr`) and sit in a `flex-wrap` row capped at `max-w-4xl`, never stretched to fill the page's full 90%-width container, which is what reads as "empty" when there's only one or two real cards. Content inside is vertically centered (`justify-center`) so a taller neighbor card never leaves dead space at the bottom.
- **Hover / Focus:** border shifts to Signal Teal, the card lifts 2px, 200ms ease-out; visible `focus-visible` outline in Signal Teal, 2px, 2px offset.
- **Placeholder variant ("more coming soon"):** same shape, but a **dashed** Hairline border instead of solid, and no interactive states: it's a `<div>`, not a link. Content (icon + one line of text) is centered both axes. The icon sits inside a 4rem circular Signal-Teal-tinted badge (`bg-primary/10`, icon in solid Signal Teal) at 2rem, colorful and present without introducing a second hue. The dashed edge plus the softer badge fill are the only signals needed to read it as "not yet here, but real"; no per-library names or invented dates.

### Featured Project
- **Use:** a single, separate section on home for an `apps/*` portfolio piece that isn't a published library (the crypto market dashboard is the first). Never a card inside the Library Explorer grid, and never used for a library itself — a library gets its own Library Explorer card plus a demo page with a Package Identifier Label, a different pattern entirely.
- **Shape:** larger presence than a Library Explorer card: one wide bounded panel (0.75rem radius, 1px Hairline border, no shadow) that fills the section's own row, not sized to its own content inside a `flex-wrap` grid. One project at a time; if a second featured project is ever added, design it as a real multi-card grid at that point instead of forcing this shape to hold two.
- **Section tag:** "Featured Project" itself, rendered as a Label (`text-sm font-semibold`, sentence case), the same weight/size as a Library Explorer card title — not a `text-2xl` Section Heading. This section reads as a highlight sitting above the page, not a peer of "Library Explorer"/"FAQ".
- **Live badge:** `badge-primary` (filled, Signal Teal, white text) — the first honest use of this badge in the system (previously defined but "not currently rendered anywhere"). Earned specifically because the linked page consumes real, live market data on every load, unlike the library demos' example/seed data. Don't reuse it on a library card just to look more "alive": it stays scoped to a project whose content is actually live.
- **Content:** the project's real name, one line of description (no invented stats or fake activity, same Do's and Don'ts as everywhere else), and a link to its real page. No install snippet, no code preview — those belong to library demo pages; this piece has nothing to install.
- **Hover / Focus:** same as Interactive Cards — border shifts to Signal Teal, the card lifts 2px, 200ms ease-out; visible `focus-visible` outline in Signal Teal, 2px, 2px offset.
- **Never:** a gradient, a second accent color, or a `bg-slate-100`-style fill to make it stand out from Library Explorer cards. The size difference and the Live badge already do that job inside the existing system.

### Form Fields
- **Style:** plain Vellum fill, 1px Hairline border, 0.5rem radius (`--radius-field`), same visual language as everything else, no special "input chrome." `focus-visible` gets the standard Signal Teal outline, 2px, 2px offset.
- **Validation:** errors render in red (`text-red-600`) below the field: the one accepted exception to the One Accent Rule, since a validation error needs a color no reasonable viewer confuses with brand or status teal. The invalid input itself is never blocked or cleared; the last valid derived state (e.g. the table's data) simply stops updating until the input is valid again.

### Badges
- **Live/status** (`badge-primary`): filled pill, Signal Teal background, white text. First activated on the Featured Project card (see Featured Project under Components), since that's the first content in the system that's genuinely live rather than example data. Still unused in the Library Explorer: its "Available" tag stays commented out (redundant with the FAQ's "how many libraries" answer while there's only one), and the demo page's package identifier uses a plain label instead (see Package Identifier Label). The class stays available for when a second library ships and status needs distinguishing there too.
- **Coming Soon / informational** (`badge-outline`): outline pill, Hairline border, Ink Muted text. No fill, visually recedes, matching its non-interactive role. Still live: the role tag in the "Selected row" panel.

### Price Direction Indicator
- **Use:** any percentage or value change tied to real market data (24h price change, market cap change), first introduced in `price-ticker` (crypto-dashboard).
- **Style:** `text-green-600` for a positive change, `text-red-600` for a negative change (same weight-600 shade already established for the validation exception, kept for palette consistency), `text-slate-600` (Ink Muted) for a change of exactly 0. Zero is neutral, never colored as good or bad.
- **Rationale:** financial positive/negative is a near-universal, fast-scanned convention; forcing a viewer to read direction from a sign or icon alone on a frequently-updating ticker adds real friction the One Accent Rule wasn't written to protect against. Scoped narrowly to real financial deltas, not reused as a general-purpose status color elsewhere in the app.

### Avatar
- **Style:** `avatar avatar-placeholder` (daisyUI v5), 2.5rem circle, Signal Teal fill, white initial.

### Package Identifier Label
- **Style:** the demo page's `@zhunam/<name>` string, rendered as `text-2xl font-bold font-mono text-primary` (large, bold, monospace, Signal Teal) directly above a much smaller `text-lg` page label ("Live Demo"). This inverts the usual size relationship (the identifier reads as the page's real headline; the label beneath it reads as a kicker), which is deliberate: the package name is the one fact every visitor is here to confirm actually exists and is installable.
- **Use:** every per-library demo page leads with this pattern instead of a generic `text-4xl` "Live Demo" heading, so the package identity, not a generic page title, is what forms first.

### Crypto Dashboard (page-specific register)
- **Scope:** applies ONLY to `/crypto-dashboard`. Not home, not any library demo page. A documented, scoped exception to the general system, same precedent as the home hero's own dark full-bleed register: an exception with an explicit reason stated here, never a silent drift from the rest of the system.
- **Why a separate register:** this page is a live-data demo, not a library catalog entry. It earns more visual weight and color than the restrained catalog tone of the rest of the site, the same way the home hero earns its one dark inversion.
- **Superseded draft:** this replaces an earlier version of this same section (a tinted `bg-primary/5` panel wash, a compact ~260px light hero with a "Live" badge, and a separate "Featured coin" panel next to it). That draft is fully superseded by the spec below, based on mockups reviewed and approved outside this file; none of the earlier draft's specifics still apply.
- **Panels (market-state, market-table, currency-converter, trending-carousel):** a **raised surface**, per the generic definition in Elevation above (daisyUI `--depth: 1`, no border), applied to content panels for the first time (previously scoped to buttons and Library Explorer cards only). Concretely: white fill (`bg-base-100`), `rounded-box` (0.75rem radius), no border, and a soft shadow, `shadow-[0_2px_10px_rgba(15,37,42,0.08)]`. The Ghost-Card Refusal still holds here: this shadow is never paired with a border on the same element.
- **market-ticker:** full-bleed, true 100% viewport width, same technique as the Full-Bleed Hero below (`relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen`). Sits immediately below the header, before any breadcrumb or title, nothing renders above it. Unlike the home hero, this page's header stays solid (see Sticky Header's scope rule: transparent-over-dark is home-route only), so the negative top margin only needs to cancel `<main>`'s own `py-12` (`-mt-12`), not tuck further back behind the header the way the home hero's `-mt-28` does.
- **Hero (full-bleed, dark):** replaces both the earlier compact light hero and the separate "Featured coin" panel; the hero now carries that role by itself, so the same coin's price is never shown twice on the page. Full-bleed, same technique as market-ticker above (`relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen`), `min-h-85` (~340px, `85 * 0.25rem`, taller than the superseded draft's `min-h-65`), `bg-base-content` (Ink, the same token used by the home hero, see Colors). Like market-ticker, only `-mt-12` is needed here (this page's header stays solid, unlike home's transparent-over-dark hero).
  - **Decorative background:** 3-4 blurred, rotated, rounded-rectangle shapes (Signal Teal and its on-dark variant `#8ba7a6`, 0.3-0.5 opacity, 60-85px blur) plus 6-9 small scattered particle dots (`#8ba7a6`, ~0.45 opacity, 1-1.5px). Same CSS-only rule as Background Glow: no image, no SVG illustration, no particle-library effect; plain absolutely-positioned `<div>`s, `pointer-events-none` and `aria-hidden="true"`, contained by the section's own `overflow-hidden`. The sparkline described below is the one exception: real data, not decoration.
  - **No Live badge.** Deliberately removed from this hero per design review. The badge stays reserved for the home page's Featured Project card (see Featured Project under Components and Badges), the one place it's currently earned.
  - **Content:** coin name + symbol (e.g. "Bitcoin · BTC") in `#8ba7a6`; price at 56px/700 weight, white; 24h change colored via the existing Price Direction Indicator convention (`priceDirection()`, green/red, neutral for exactly 0), never a fixed placeholder color. A short line of honest copy sits underneath, describing the page itself (real, live CoinGecko data), not a fabricated per-coin summary: `CryptoCoin` (mapped from `/coins/markets`) carries no `description` field, and inventing one would break the system's no-fabricated-facts rule (see Do's and Don'ts).
  - **Ambient sparkline background (revised):** the featured coin's own 168-point 7-day `sparkline` array, same real data and path-building technique `trending-carousel` already uses (duplicated here at the page level, not extracted into a shared helper, since this task's scope doesn't touch that component's file), now renders as a full-bleed background layer (`absolute inset-0`, `preserveAspectRatio="none"`) across the entire hero, not a bounded corner element. Two independent fades keep it atmospheric rather than a hard rectangle: (1) an internal SVG mask with a horizontal gradient fades it to opacity 0 on the side where the text sits, staying fully visible on the other side, so it never fights legibility; (2) an outer CSS `mask-image` vertical gradient fades it out at the hero's own top and bottom edges. **Color, resolved deliberately:** the area fill stays a fixed Signal Teal vertical gradient (opacity decreasing downward), since it reads as atmospheric texture, the same role the hero's blurred decorative shapes already play, not as a status signal, consistent with the Price Direction Indicator's own scope note ("not reused as a general-purpose status color elsewhere"); painting a large background wash red on a down day would be exactly that kind of overreach. The line stroke, which is what actually reads as "the trend," instead follows the existing `priceDirection()` convention (green/red, `text-slate-300` neutral, reusing `heroChangeColor()`, see below) instead of a fixed color, the same real-data-driven convention `trending-carousel`'s own sparkline already uses for both its stroke and fill. One chart, two colors with two different jobs: background texture stays neutral, trend line stays honest about direction.
  - **Decorative shapes, opacity trimmed:** the four blurred background shapes above dropped roughly 20% in opacity (e.g. 0.40 → 0.32) to leave visual room for the now-much-larger ambient sparkline layered on top of them; unchanged otherwise (same count, blur, position, hue).
- **Neutral-change color, dark surface only:** the shared `priceDirection()` convention's neutral case (`text-slate-600`) is tuned for panels on a white background; on this hero's Ink surface it's swapped for `text-slate-300`, the same Ink-surface secondary-text color the Full-Bleed Hero already documents at 10.73:1 contrast (see Colors, "As a dark surface"). Green-600/red-600 stay as-is; both already clear AA against Ink. Scoped to this one hero's own color mapping (reused as `heroChangeColor()` for both the 24h-change text and the sparkline's line stroke), not a change to the shared Price Direction Indicator rule used everywhere else.
- **No breadcrumb.** Unlike every other page, `/crypto-dashboard` renders no "Home / ..." breadcrumb nav. The full-bleed hero immediately establishes where the visitor is (page identity, live price, real chart) with more clarity than a small text trail would add underneath it; the breadcrumb would be pure redundancy here, not a missing element. Scoped to this one page only, an explicit exception, not a precedent for dropping it elsewhere.
- **currency-converter placement:** a narrow column beside `market-table`, not a separate full-width section, its 3 fields (Amount/From/To) stacked vertically, one per row (`[columns]` left at its default of 1; a value of 2 or more would lay them out side-by-side in a grid instead).

### Full-Bleed Hero (signature component)
- **Style:** the home hero breaks out of the shared `w-[90%]` shell to span the true 100% viewport width, no side padding, no `rounded-box`; it reads as the page's actual background for that section, not a floating panel. Background is `bg-base-content` (Ink, see Colors), not a hardcoded `bg-slate-900`. Implemented with the standard full-bleed technique (`relative left-1/2 right-1/2`, negative `50vw` margins, `w-screen`) plus a negative top margin (`-mt-28`) that pulls it up underneath the sticky header and the `<main>` shell's own top padding, so there's no gap or seam at the top of the page. `min-h-[90vh]` gives it real vertical presence. `overflow-hidden` on the section contains the glow (below) so it never bleeds past the hero's own edges. `body { overflow-x: hidden }` guards against the `100vw` trick introducing a horizontal scrollbar on browsers that reserve layout space for one.
- **Content:** a single centered column (`max-w-3xl`, `items-center`, `text-center`), not a two-column layout. Heading, one line of body copy, and one optional soft text CTA, nothing library-specific (no install snippet, no per-library buttons); those live where they're actually useful (the Library Explorer card, the demo page's own Usage panel), not duplicated in the hero.
- **CTA:** "Explore the libraries" is a plain text link (not a `.btn`, no trailing arrow glyph), deliberately light-weight, since the hero's job is to state the thesis, not to push an action. It anchor-scrolls (`href="#library-explorer"`, `html { scroll-behavior: smooth }`) to the Library Explorer section, which carries `scroll-mt-24` so the sticky header never overlaps its heading after the jump.
- **Scope rule:** this is the only inverted, only full-bleed surface. It is not a dark mode: the rest of the page (Library Explorer, FAQ, footer) stays on Vellum inside the normal `w-[90%]` shell. Don't extend either treatment to any other section without an explicit reason.

### Background Glow
- **Style:** a single large (`h-230 w-315`, ~1260×920px) circle, `bg-primary/80`, `blur-[150px]`, centered behind the hero's text via `absolute inset-0 flex items-center justify-center`. 100% CSS: no image, no SVG, no illustration. `pointer-events-none` and `aria-hidden="true"` since it's purely decorative.
- **Contrast rule:** verified by script, not eyeballed. Blending Signal Teal at 80% over the flat Ink hero fill (`#0F252A`) gives an effective background of `#265353`: white text 8.59:1, Slate-300 text 5.79:1, both still clear AA (4.5:1) with real margin, though *lower* than the flat no-glow background (15.93:1 / 10.73:1): the glow lightens the surface it sits on, so it costs contrast rather than adding it. That's the opposite of the previous (lighter, low-opacity) glow treatment; don't assume future glow tweaks are automatically safe; re-verify with the same blend-and-measure method whenever the color or opacity changes. Even at a theoretical full 100% opacity (bounding the blur's most saturated point), Slate-300 still holds 4.87:1.
- **Content rule:** color only, tuned to the existing Signal Teal token, never a second hue, never particles/iconography/stock imagery layered on top.

### Mobile Drawer Navigation
- **Trigger (the tab):** below `lg`, the library sidebar is reached via a small square button fixed to the screen's left edge, immediately below the sticky header (`top-16 left-0`). It's built as a "tab sticking out": `rounded-l-none`, no left border, a Hairline border on the remaining three sides, and a `shadow-md`, so it visually detaches from the page content while staying flush with the true viewport edge.
- **Panel:** a daisyUI `drawer` (`lg:drawer-open` so it becomes a normal in-flow sticky sidebar at `lg` and up, no checkbox/overlay behavior at all); below `lg` it's a checkbox-driven, JS-free overlay that slides in from the left over the page content. Its default `top: 0 / height: 100dvh` is overridden to `top: 4rem` / `height: calc(100dvh - 4rem)` so the panel starts below the sticky header instead of sliding underneath it.
- **Tab-follows-panel motion:** when the drawer opens, the tab doesn't stay pinned at the screen edge under the now-open panel: it slides to sit exactly at the panel's trailing edge (`left` shifts to match the panel's open width) and sheds its border/shadow (both go transparent/`none`), so it reads as part of the open panel rather than a separate chip floating over it. Closing reverses both: tab slides back to the edge, border/shadow return. All transitions share one 300ms ease-out.
- **Use:** every per-library demo page with a Library Explorer sidebar should use this exact pattern, not a from-scratch mobile nav: it's the one place in the system content genuinely overlays other content, and it's already tuned for the sticky header's height.

### Sticky Header
- **Style:** `position: sticky; top: 0`, `h-16`, `z-50`, so it stays pinned through scroll on every page. On the home route, while unscrolled, it renders fully transparent with white/slate-200 text sitting directly over the hero; past an 8px scroll threshold (or on any non-home route) it switches to a solid `bg-white/95` fill with a hairline bottom border and a subtle shadow. The swap is a `[class]` binding driven by a `headerIsTransparent` computed signal (`isHome() && !scrolled()`), not a CSS-only trick, since it also depends on route. All color/border/shadow changes transition over 300ms.
- **Scope rule:** transparent-over-dark only applies on the home route, where the hero underneath it is dark. Every other route keeps the solid header regardless of scroll position, since there's no dark surface for transparent light text to sit on safely.

### FAQ List
- **Style:** native `<details>`/`<summary>` accordion, `divide-y` Hairline rules between entries (no enclosing top/bottom border), no cards, no fill, consistent with the No-Fill-Section Rule. Question (semibold Ink) collapsed by default; answer (Ink Muted) revealed on click, no JS.
- **Expand indicator:** a plain "+" character, Ink Muted, that rotates 45° into a "×" on open (CSS `rotate-45` on `[open]`, 200ms ease-out), not a new icon, and the browser's native disclosure marker is hidden in favor of it.
- **Content rule:** real, specific questions a developer evaluating the ecosystem would actually ask, answered honestly at the ecosystem level (licensing, supported Angular versions, the philosophy behind small focused libraries) rather than scoped to a single library, even while Data Grid is the only one shipped. No marketing copy, no filler questions, no admitting a limitation that isn't true.

### Navigation
- **Header:** brand wordmark + a real external link (GitHub); no placeholder nav items pointing at pages that don't exist yet. See Sticky Header above for the transparent/solid behavior; colors swap between white/slate-200 (transparent, home hero) and Ink/Slate-600 (solid) accordingly, always Signal Teal or Signal-Teal-on-dark on hover depending on state.
- **Sidebar (library pages):** a vertical list of every library; the current one highlighted with a Signal-Teal-tinted background and text; unreleased libraries render as plain, non-interactive `<span>` rows tagged "Coming Soon", never a dead `<a>`.

## 6. Do's and Don'ts

Directly enforces PRODUCT.md's anti-references, plus two new rules this redesign introduced: no fabricated facts, and no gray section fills.

### Do:
- **Do** keep every heading and sentence a single color (Ink). Signal Teal marks controls and status, never a word inside a title.
- **Do** use Signal Teal as the only accent: one hue, used deliberately (primary actions, the live badge, focus rings).
- **Do** separate sections with spacing and a single hairline border, never a gray background fill.
- **Do** use the lightened `#8ba7a6` teal (not the base `#2c5f5d`) for any accent placed on the dark hero.
- **Do** show only verifiable facts in library cards and usage panels: real package names, real capabilities, no invented version numbers or fake log output.
- **Do** render "Coming Soon" library entries as non-interactive elements (`<span>`/`<div>`), never as a dead link.
- **Do** keep the dark, full-bleed treatment scoped to the home hero only. Library Explorer, FAQ, the demo page, and the footer stay on Vellum inside the normal `w-[90%]` shell; this is one inverted section, not a dark mode.
- **Do** keep the hero's content generic to the whole portfolio (title + subtitle + one soft CTA); no per-library preview, snippet, or button belongs there; that content lives on the library's own card/page.
- **Do** use `text-base-content`/`bg-base-content` for primary text and any dark surface fill, not a hardcoded `text-slate-900`/`bg-slate-900`: that's what keeps Ink a single token instead of two hex values that happen to match today and silently drift apart later.

### Don't:
- **Don't** color part of a heading or sentence to create emphasis ("built for **real products**"-style two-tone titles). It's one of the most recognizable generic-AI-landing tells; every title stays one color; use weight or a separate element for emphasis instead.
- **Don't** introduce a second accent color for status/info. One teal, two roles at most (filled = live, outlined = inactive), never a second hue.
- **Don't** add a `bg-slate-100`/`bg-slate-200` fill to separate a section: that's the exact gray-panel pattern this redesign replaced.
- **Don't** fabricate a version number, a build log, or a usage statistic ("v1.4.0", "42 entries", "Optimizing bundles...") for anything that isn't actually published or measured yet.
- **Don't** pair a 1px border with a box-shadow on the same card (the ghost-card tell, still banned).
- **Don't** load a second typeface via Google Fonts or any external font CDN: the system-ui stack is the deliberate choice, not a placeholder.
- **Don't** link a nav item, button, or sidebar entry to a page that doesn't exist. Every `<a>` in this system has a real destination.
- **Don't** feature one specific library (a name, a preview, an install command) in the hero: it represents the whole portfolio, not one product.
- **Don't** build the background glow from an image, SVG illustration, or particle effect: it's a blurred, translucent color shape only, per the CSS-only rule for this component. Re-verify contrast with the blend-and-measure script whenever its color or opacity changes (see Background Glow); it isn't automatically safe just because the previous version was.
