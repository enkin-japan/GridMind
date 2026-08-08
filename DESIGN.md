---
name: GridMind
description: A film-editing cutting bench for a product whose value is subtraction.
colors:
  bench: "#e4e4df"
  panel: "#ffffff"
  well: "#22231e"
  perf: "#e4e4df"
  ink: "#17180f"
  ink-2: "#5e6156"
  on-film: "#efefe8"
  edge: "#c6c6be"
  edge-2: "#a3a399"
  wax-red: "#ba2818"
  wax-red-fill: "#c32b1c"
  wax-blue: "#2b57a0"
  wax-amber: "#8a6200"
  wax-amber-fill: "#e5a600"
  on-fill: "#efefe8"
  on-warn: "#17180f"
  ctr-hot: "#ffb0a4"
  tape: "#f0ece1"
  tape-hover: "#e6e0d1"
typography:
  display:
    fontFamily: "Archivo, 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Noto Sans JP', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "1.9rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 90"
  headline:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 92"
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1.0625rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 96"
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
    fontVariation: "'wdth' 100"
  small:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  fine:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.14em"
    fontVariation: "'wdth' 84"
  counter:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.6
    fontVariation: "'wdth' 116"
    fontFeature: "tabular-nums"
  mono:
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  none: "0"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
  s8: "64px"
components:
  button:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "38px"
  button-primary:
    backgroundColor: "{colors.wax-red-fill}"
    textColor: "{colors.on-fill}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "38px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.wax-red}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "38px"
  button-danger-hover:
    backgroundColor: "{colors.wax-red-fill}"
    textColor: "{colors.on-fill}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "38px"
  button-disabled:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.ink-2}"
  rail-switch:
    backgroundColor: "transparent"
    textColor: "{colors.on-film}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "6px 10px"
    height: "36px"
  rail-switch-hover:
    backgroundColor: "{colors.on-film}"
    textColor: "{colors.well}"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "9px 12px"
    height: "40px"
  textarea:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.none}"
    padding: "9px 12px"
  counter:
    backgroundColor: "{colors.well}"
    textColor: "{colors.on-film}"
    typography: "{typography.counter}"
    rounded: "{rounded.none}"
    padding: "1px 7px"
  counter-hot:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ctr-hot}"
  tape:
    backgroundColor: "{colors.tape}"
    textColor: "{colors.ink-2}"
    typography: "{typography.fine}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  tape-active:
    backgroundColor: "{colors.wax-red-fill}"
    textColor: "{colors.on-fill}"
  lightbox:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "32px"
  sheet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "24px"
  frame:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 16px 16px 24px"
  frame-hover:
    backgroundColor: "{colors.bench}"
    textColor: "{colors.ink}"
  sprocket-column:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.none}"
    width: "20px"
  pager-item:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    size: "38px"
  pager-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
  notice-warn:
    backgroundColor: "{colors.wax-amber-fill}"
    textColor: "{colors.on-warn}"
    typography: "{typography.small}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  badge:
    backgroundColor: "{colors.wax-red-fill}"
    textColor: "{colors.on-fill}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "2px 7px"
---

# Design System: GridMind

## Overview

**Creative North Star: "The Cutting Bench"**

GridMind's product value is subtraction — it deletes everything in a document that is not knowledge — so its interface is a film editor's cutting bench, not a dashboard. The whole world is built from one physical fiction: material runs through a machine, the machine throws most of it away, and what survives is laid on a light box to be read. Every surface in the build answers to that fiction. The page ground is bench grey. The rail across the top is the machine: always dark, in both themes, because a machine is not paper and does not change colour when the room lights come on. The note list is not a card grid; it is one continuous strip of film with an unbroken sprocket column down its left edge and frames divided by hairlines. Numbers are footage counters — dark recessed plates with expanded tabular figures. Marks are grease pencil in three colours that each have exactly one job.

The system is aggressively flat and aggressively square. There is no border radius anywhere and no box-shadow anywhere; those are not defaults that happened, they are the two hardest invariants in the file. Depth is made only two ways: a 1px rule, and a material step between the bench and the panel. That step is measured at 1.28:1 in light and 1.28:1 in dark — deliberately matched, so the bench and the light box sit the same distance apart in both rooms. The result is dense, tool-like, and quiet: pure geometry, one accent that means "cut", and a lot of restraint about where light is allowed.

It refuses the arrangement its category ships. There is no left sidebar, no card grid, no rounded surface floating on a soft shadow, no pastel status pill. What it also refuses is decoration for its own sake — the world's devices (sprockets, counters, wax rules, tape, the clapper stripe) are structural, they mark where the machine touched the material, and none of them is applied twice for effect. The clapper stripe appears on the auth slate and nowhere else.

**Key Characteristics:**
- Bench-grey ground, one lit panel; zero radius, zero shadow
- Depth from a 1px rule plus a 1.28:1 material step, matched in both themes
- An always-dark machine rail, identical in light and dark
- Sprocket perforations as the structural signature, not as ornament
- Footage counters: dark plates, expanded tabular Archivo, one component for every number
- Three grease-pencil colours with fixed, non-overlapping jobs
- Hand-authored SVG applied as CSS masks so shape comes from the asset and colour from a token
- Hand-drawn single-weight SVG icon sprite; no icon font, no emoji

## Colors

Two greys, one white, one near-black, and three pigments — the pigments never trade jobs. Every pair below was measured against its real background; the ratios cited in prose are the shipped measurements, not estimates.

### Primary

- **Wax Red** (`{colors.wax-red}` text, `{colors.wax-red-fill}` fill): the grease pencil that means *cut, commit, destroy, or register*. It draws the rule under every page title and every margin-column label (via the wax mask), it fills the primary button and the file-picker button, it fills the active tape and the "in use" plan badge, it colours the delete button and the error list, it is the advance bar during ingest, it is the hang-mark on each trim-bin item, and it is the registration corner-marks that appear on the hovered frame. Measured 6.17:1 on panel in light, 5.18:1 in dark.
- **Counter Hot** (`{colors.ctr-hot}`): the only variant colour a counter is allowed. It replaces the counter's figure colour when a quota is at or above 80%. It does not invert between themes — it sits on the well plate, which is dark in both.

### Secondary

- **Wax Blue** (`{colors.wax-blue}`): the grease pencil that means *splice*. It is links, the backlink splice-mark chevron in the margin column, the input focus border, the global focus-visible outline, and the "saved" notice. It is never used for a primary action and never fills a surface. Measured 7.06:1 on panel in light, 6.20:1 in dark.

### Tertiary

- **Wax Amber** (`{colors.wax-amber-fill}` fill, `{colors.wax-amber}` text): the grease pencil that means *be careful*. The fill ships on exactly one component — the warning notice — and nowhere else. The text token is declared and theme-mapped (measured 5.49:1 on panel in light, 7.80:1 in dark) but is not applied anywhere in the current build; it is reserved for amber type on a light surface, and any new use must still respect the one-job rule.

### Neutral

- **Bench Grey** (`{colors.bench}`): the bench top. Page ground, the summary box, the code-block-in-prose background, hovered frame, current plan row, and the disabled button. The lower of the two material levels.
- **Light-Box White** (`{colors.panel}`): the lit reading surface. In light it is pure white; in dark it is the one raised surface in the room. It carries the note body, the roll, sheets, compare panes, the auth slate and the pager. Measured 17.89:1 against ink in light, 12.44:1 in dark.
- **The Well** (`{colors.well}`): a recess cut into the material — dark in *both* themes. It is the header rail, counter plates, the gate head, the progress and quota troughs, table header rows, the slate plate and clapper, and `<pre>` blocks. `{colors.on-film}` is its text and does not invert.
- **Ink** (`{colors.ink}`) / **Ink 2** (`{colors.ink-2}`): primary and secondary type. Ink-2 carries summaries, hints, labels, edge codes and metadata; measured 6.32:1 on panel and 5.36:1 on tape in light, 5.90:1 and 4.79:1 in dark.
- **Edge** (`{colors.edge}`) and **Bench Edge** (`{colors.edge-2}`): the entire depth vocabulary. Edge is the rule drawn *on* the light box (panel-level dividers, frame separators, table cells). Bench Edge is the rule drawn *on* the bench (outer container borders, form controls, dashed placement zones, the footer rule).
- **Tape** (`{colors.tape}` / `{colors.tape-hover}`): paper tape stock, a separate material from the panel. It is the tag chip's ground and nothing else.
- **Perf** (`{colors.perf}`): the colour seen *through* a sprocket hole. Light: matches the bench. Dark: a lighter grey, so holes read as punched-through rather than as black-on-black.

### Named Rules

**The Three Pencils Rule.** Red cuts, blue splices, amber warns. A colour never takes another colour's job. Red is the only colour a primary action may use; blue is the only colour a link or focus ring may use; amber appears on warnings only, and today on exactly one component. Two review rounds were spent enforcing this after earlier drafts let red and blue drift into decoration — if a new surface needs a fourth meaning, it gets a shape or a rule, not a fourth pigment.

**The Opaque Pigment Rule.** `--on-warn`, `--on-fill`, `--on-film` and `--ctr-hot` do not invert between themes, and `--wax-amber-fill` and `--wax-red-fill` keep their dark-mode-adjacent values. Wax is opaque pigment on physical material; it does not change because the room lights changed. Never add a dark-theme override for an on-* token.

**The One Lit Surface Rule.** On any reading surface, exactly one panel glows and the bench does not. On the note detail view this is literal — the light box is the only lit thing on the page, the margin column sits directly on the bench with no surface of its own.

## Typography

**Display / Body / Label / Counter Font:** Archivo variable (wght 400–800, wdth 62–125), self-hosted at `/fonts/archivo-latin.woff2` and `/fonts/archivo-latin-ext.woff2`, latin and latin-ext subsets only, `font-display: swap`, with the latin file preloaded.
**CJK fallback:** Hiragino Kaku Gothic ProN → Yu Gothic → Noto Sans JP → PingFang SC → Microsoft YaHei → sans-serif.
**Mono:** `ui-monospace, 'SFMono-Regular', Menlo, monospace`, used only for textareas and code.

**Character:** One grotesque doing every job, differentiated by *width* rather than by family. Archivo's width axis is the role signal: labels compress to 84 and go uppercase with wide letterspacing so they read as stamped-on markings; headings sit at 88–96 so they stay dense without shouting; counters expand to 116 so figures read as machined dials. Weight is nearly binary — 400 for prose, 700–800 for everything structural — which leaves width free to carry hierarchy on its own.

The stack deliberately drops CJK to the system gothic. A CJK webfont would be multiple megabytes, and the one screen this product cannot afford to make slower is the one where the user is already waiting 20–35 seconds. Japanese therefore renders in the OS gothic with no width axis; the build accounts for this by leaning on weight and size for CJK hierarchy rather than on `wdth`.

### Hierarchy

- **Display** (800, 1.9rem → 1.55rem below 620px, wdth 90, lh 1.3, `text-wrap: balance`): page title and note title. Always followed by a red wax rule.
- **Headline** (800, 1.25rem, wdth 92, lh 1.3): sheet headings, prose `h1`/`h2` inside note bodies, the slate's form title. Carries a 1px edge rule underneath.
- **Title** (800, 1.0625rem, wdth 96, lh 1.3): the frame title in the roll, prose `h3`, compare-pane titles.
- **Body** (400, 1rem, wdth 100, lh 1.7, max 74ch): note prose and general copy.
- **Small** (400/700, 0.875rem, lh 1.6): summaries, buttons, field captions, table cells, gate output.
- **Fine** (400, 0.8125rem, lh 1.5): hints, tags, trim-bin items, margin-column lists.
- **Label** (700, 0.6875rem, wdth 84, ls 0.14em, uppercase): every marking on the machine — rail switch text, section labels, table headers, footer, badges. Uses 0.10–0.12em where it sits inside a tighter component.
- **Counter** (700, 0.875rem, wdth 116, tabular-nums): every number the user is meant to compare or watch.
- **Mono** (0.875rem, lh 1.75): textarea input and code only.

### Named Rules

**The Width-Is-Role Rule.** Role is expressed by `font-variation-settings: 'wdth'`, not by adding a family. 84 = machine marking, 88–96 = heading, 100 = prose, 116 = counter. A new role picks a width on that scale; it does not introduce a second typeface.

**The One Counter Rule.** Every quantity the user compares — quota, percent complete, character counts, note totals, the cut ratio — goes through the `.ctr` component so that they are all the same object. A number typeset as plain prose is a defect, not a variant.

**The No-Webfont-For-CJK Rule.** Latin is self-hosted; CJK falls through to the system stack, permanently. The wait screen is the product's signature surface and must not carry a multi-megabyte font download.

## Layout

A single centred column, not an app shell. There is no sidebar. Page container is `max-width: 1080px` with `32px 16px 64px` padding (tightening to `24px 12px 48px` below 620px); forms narrow to `680px`; note prose caps at `74ch`.

The rail is a sticky flex row, `min-height: 52px`, `8px 16px` padding, that wraps: brand, search (`flex: 1 1 240px`, max 400px), then engraved switches, then the user box. Below 620px the rail stops being sticky and becomes static — at that width it wraps to three rows and would otherwise eat a third of the viewport — the search field takes a full row via `order: 5`, and the icon-only switches reveal their text labels instead of hiding them in a clip-path.

The note detail view is a two-column grid: a `152px` margin column and the light box, `32px` apart, with the margin column `position: sticky; top: 78px`. Below 860px it collapses to one column and the margin column re-flows *below* the light box as an auto-fit grid of `minmax(180px, 1fr)` blocks with its dividing rules removed — the film edge becomes a footer strip rather than a margin. The A/B compare grid collapses from `1fr 1fr` to one column at the same breakpoint.

Spacing is an 8-step scale (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64). The working rhythm is `s4` inside dense components, `s5` between blocks and inside sheets, `s6` inside the light box, `s7`–`s8` only for page-level breathing and empty states. Type is a closed 7-step ramp; only `--t-display` changes responsively.

Two breakpoints only: 860px (two-column layouts collapse) and 620px (rail unsticks and reflows, padding tightens, display type drops, the roll frame drops its edge-code column).

## Elevation & Depth

**There are no box-shadows in this system.** Not one, anywhere in the stylesheet, in either theme. This is an invariant, not an omission.

Depth is made exactly two ways, and they are meant to be read together:

1. **A 1px rule.** `{colors.edge}` when the rule is drawn on the light box, `{colors.edge-2}` when it is drawn on the bench. Which token you use tells the reader which material they are looking at.
2. **A material step.** Bench to panel is a 1.28:1 luminance difference in light and 1.28:1 in dark — matched on purpose, so the raise reads identically in both rooms. The well is the third level, recessed, and it is dark in both themes.

Hover does not lift anything. It changes background, border colour, or text colour over 100–120ms of linear timing, and on the roll it additionally reveals two red registration corner-marks on the hovered frame. Nothing translates on the Z axis because nothing in this world has a Z axis.

### Named Rules

**The Rule-And-Step Rule.** If a surface needs to separate from what is behind it, give it a 1px rule in the correct edge token and, if it is a reading surface, the panel material. Never a shadow, never a glow, never a gradient, never a blur.

**The Three-State Theme Rule.** Dark is not only a system preference. The light tokens live on bare `:root`; the dark tokens are written **twice** — once under `@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme='light'])`, and once as `:root[data-theme='dark']`. The server stamps `data-theme` on `<html>` only when the user has chosen light or dark, so an unset preference still follows the room, and an explicit choice wins in both directions. Never define a colour only inside the media block.

**The Stock Rule.** The palette has a second axis: *stock* (`data-stock`), four measured film stocks — standard, tungsten (warm room light), daylight (cool), high contrast. A stock replaces only the material and ink tokens: bench, panel, well, perf, ink, ink-2, edge, edge-2, tape. **It never touches the three wax colours.** Wax is opaque pigment, so red still means cut, blue still means splice and amber still means warn in every stock — a semantic colour that shifted per stock would stop being semantic. Every stock ships only after all eighteen pairs measure clean in both light and dark; the high-contrast stock deliberately trades the material step down to 1.12:1 and lets the rules carry the structure, which is the same doctrine read from the other end.

**The Recess-Or-Rule Rule.** A well is a recess, shown by going darker than its surround. On a stock whose ground is already pure black there is nowhere darker to go, so the recess is marked by a rule instead — `.ctr` and the table head take their border from `edge-2`, not from `well`. Depth is a rule *plus* a step; when the step is unavailable the rule takes the whole load.

**The Dark Machine Rule.** Machine parts — the rail, counter plates, gate head, progress troughs, table header rows, the slate plate — use `{colors.well}` and `{colors.on-film}` in both themes. They are not surfaces that respond to the room; they are the equipment.

## Shapes

**Radius is 0. Everywhere. No exceptions.** `border-radius` does not appear in the stylesheet, and the focus outline is square because the world is square. Do not introduce a radius scale; there is exactly one shape token (`{rounded.none}`) and it exists to make the zero explicit.

The form language is rectangles and 1px rules, with four recurring geometries:

- **Sprocket perforation.** Vertical: a 20px `{colors.well}` column with `{colors.perf}` holes on an 18px period, inset 5px. Horizontal: two `{colors.perf}` strips repeating on a 22px period along the top and bottom edges of the progress and quota troughs. This is the system's signature; it says "this is film".
- **The wax rule.** A hand-drawn SVG stroke applied as a CSS mask (`--wax-mask`), tiling at 60px, colour supplied by `{colors.wax-red-fill}`. Every red rule in the product is this asset: 52×7px under a page title, 46×7px under the slate title, full-width 7px under the note bar, 6px under each margin-column label. The mask is why the stroke has hand-drawn ends and pressure variation instead of being a flat CSS rectangle.
- **The tape outline.** A second hand-drawn SVG mask (`--tape-mask`) shapes `.tape` via a `::before` at `z-index: -1`. The chip has **no border at all** — its edges are torn because the asset is torn.
- **Dashed placement.** 1.5px dashed `{colors.edge-2}` marks a place where something is meant to be set down: the file input, the empty state, an empty note body, the ghost button.

Two clipped shapes exist and are intentional exceptions to the rectangle: the backlink splice mark (`clip-path: polygon(0 35%, 100% 0, 100% 65%, 0 100%)` in wax blue, a splice-tape parallelogram), and the slate's clapper stripe (a -68deg repeating gradient between `{colors.well}` and `{colors.on-film}`).

## Components

### Buttons

- **Shape:** hard rectangle (0 radius), 1px border, `min-height: 38px`, `8px 16px`, gap 7px to its icon, `font-weight: 700` at Small size.
- **Default:** panel fill, ink text, bench-edge border. Hover darkens the border to ink; nothing else moves.
- **Primary:** wax-red fill and border, `{colors.on-fill}` text. Hover is `filter: brightness(1.1)` — the pencil pressed harder, not a new colour.
- **Danger:** transparent with a wax-red border and wax-red text; hover *fills* with wax red. Its focus outline switches to wax red, the one place the blue focus ring is overridden, because the ring must not contradict the action's colour.
- **Ghost:** transparent, dashed border, ink-2 text. Used for the "do the lesser thing" option in a decision group.
- **Disabled:** bench fill, bench-edge border, ink-2 text, no filter, `cursor: default`. Primary and default collapse to the same disabled appearance on purpose — a disabled control is not a coloured control.
- **Transitions:** `background / color / border-color` at `.12s linear`.

### Rail Switches

Engraved switches on the machine: transparent fill, `#ffffff40` hairline border, `{colors.on-film}` label text at Label size (wdth 84, 0.12em, uppercase), 36px tall. Hover inverts hard — fill goes `{colors.on-film}`, text goes `{colors.well}`. Icon-only switches keep a visually-hidden text label (clip-path inset) that becomes visible below 620px rather than being removed.

### Inputs / Fields

- **Style:** panel fill, 1px bench-edge border, 0 radius, `9px 12px`, `min-height: 40px`, body-size type. Textareas swap to mono at Small size with `line-height: 1.75` and vertical-only resize.
- **Hover:** border to ink-2. **Focus:** border to wax blue, plus the global 2px wax-blue outline at 2px offset.
- **Search (rail only):** the cut groove. `#00000059` fill, `#ffffff2e` border with the right border removed so it butts against its submit button, on-film text, `-2px` outline offset so the ring stays inside the groove. This override is scoped to `.site-header` specifically so the generic input rule cannot win by source order and turn the groove white.
- **File input:** not a control, a *place to set something down* — full-width, 1.5px dashed, transparent, `16px` padding, with a wax-red-filled `::file-selector-button`. Hovering turns the dashes wax red.
- **Required marker:** wax red.

### Tape (tags)

Torn paper tape, not a pill. `{colors.tape}` ground shaped by the tape mask, no border, ink-2 text at Fine size, `4px 10px` (Label size and `3px 8px` in the `sm` variant used inside roll frames). Hover deepens the tape and darkens the text. Active state fills with wax red and switches text to `{colors.on-fill}`. A trailing count is carried in a dimmer inline span.

### Counters

The footage counter, `.ctr`: an inline-flex plate of `{colors.well}` with `1px` well border, its segments divided by `#ffffff26` hairlines. Figures are `{colors.on-film}` at Counter size (wdth 116, tabular-nums, `1px 7px`). Separators use `#ffffff73`; unit segments drop to Label size at wdth 84, uppercase, `#ffffffa6`. The `hot` variant recolours figures to `{colors.ctr-hot}` when a quota crosses 80%.

### The Roll (note list) — signature component

The list is one strip of film, not a stack of cards. A single `.roll` container (panel fill, bench-edge border) holds an unbroken 20px sprocket column on the left and a column of frames on the right. Frames are separated only by a 1px edge rule; the sprocket column runs past all of them without interruption, which is what makes the list read as continuous material rather than as repeated objects.

Each frame is a two-column grid: title, summary (max 78ch, ink-2) and tapes at the left; the **edge code** pinned right and spanning all rows — `GM0115` in ink at Fine size over a `YYYY-MM-DD` date in ink-2, both tabular, letterspaced, at Label size. On hover the frame background steps down to the bench, the edge code's ID turns wax red, and two 8×8px wax-red registration corner-marks fade in at the frame's left edge (top-left and bottom-left, 2px stroke, `.1s linear`). The corner marks are the "this frame is in the gate" indication — deliberately *not* a left accent bar, which is the SaaS convention this world refuses. Below 620px the frame collapses to one column and the edge code moves inline above the title.

### The Gate (ingest progress) — signature component

The screen the product is built around: 20–35 seconds shown as one pass of transfer. A `{colors.well}` header carries the current stage name and a percent counter. Below it the **advance** — a 30px trough in `{colors.well}` with the exposed portion filling wax red, sprocket strips repeating across the full width on both edges (exposed or not — the perforations belong to the film, not to the progress), and a 2px `{colors.on-film}` gate marker standing at the leading edge of the fill.

Both the fill width and the marker position use `transition: … .45s linear`. **Linear is not a default here, it is a requirement:** an eased progress bar decelerates visually while the real process is not decelerating, which reads as a stall. The quota bar in settings uses `ease` instead, correctly — it is a standing measurement, not a live process.

The meter's behaviour lives in `public/js/app.js` and holds two invariants, which any redesign of this component must preserve:
1. **It never goes backwards.** `Meter.set` refuses any value at or below the current one.
2. **It never overshoots the next real checkpoint.** Between checkpoints it advances on the server's time estimate, but asymptotically — past the estimate it only closes the remaining 10% of the stage, never arriving until the real stage event lands. The last 6% is reserved for save-and-link.

The gate body holds two more devices: the **trim bin** (a `<details>` of extracted knowledge points, each item hung by a small wax-red hole mark, entering with a `.28s` `hang` rotation staggered up to 600ms — material hanging on a pin) and the **gate output**, a bench-coloured pre-wrap region streaming the note body as it is written, with a blinking wax-red block caret that stops when the stream completes.

### Notices & Errors

Flat, bordered, no icon-circle, no tint background except for warn. `ok` is a transparent box with a wax-blue border and wax-blue text. `warn` is the only filled state in the system: solid `{colors.wax-amber-fill}` with `{colors.on-warn}` near-black text at weight 700, unchanged between themes. Error lists are a square-bullet `<ul>` in a wax-red border with wax-red text and wax-red markers. An empty notice collapses to `display: none` so it never reserves space.

### The Slate (auth) — signature component

Used on login and register only. A 440px panel with a sprocket column spanning its full height, then a 26px clapper stripe, then a `{colors.well}` name plate, then the form body. This is the only place the clapper stripe appears; it is the product introducing itself before the material is loaded, and it must not be reused as decoration on any other surface.

### Pager

Butted square cells, 38×38px minimum, panel fill with a bench-edge border and the left border removed on adjacent cells so the row reads as one continuous strip of frame counters. Tabular figures. The active cell **inverts the surface**: ink fill, panel-coloured numeral. It was briefly a well fill, which failed in dark — the well is darker than the dark ground, so the current page read as a hole punched in the strip at 1.3:1. Inversion is the only treatment that carries the same weight in both rooms.

### Prose (note body)

Max 74ch. Headings carry an edge rule beneath. **Unordered list bullets are 7px squares, not discs** — sprocket holes; nested levels become 1px outlined squares. Links are wax blue with a 1px underline that becomes a solid wax-blue block with panel-coloured text on hover. Inline code sits on the bench with an edge border; code blocks are wells with `{colors.on-film}` text. An empty body renders as a dashed placement zone carrying the honest message that nothing was extractable.

### Reader options

Two switches change comfort without changing the world. **Density** (`data-density`) scales the eight spacing tokens by ~0.75 and tightens control heights and body line-height to 1.6; the body *type size* is never touched. **Sprocket holes** (`data-perf`) removes the perforation overlays from the roll's edge column and from both bars, leaving the dark film edge itself — the structure stays, the texture goes. Neither switch alters layout topology, component vocabulary or colour semantics: they are settings, not skins.

### Motion

Short, linear, and only where something is genuinely changing: `.12s linear` on colour and border transitions, `.1s linear` on frame hover and registration marks, `.45s linear` on the advance and gate marker, `.3s ease` on the quota fill, `1s steps(2, start)` on the caret, `.28s` on the trim-bin hang.

`prefers-reduced-motion: reduce` stops exactly the things that move: the advance transition, the gate marker, the quota fill, the caret blink, and the trim-bin hang. It deliberately **keeps** colour and border transitions, because removing those would remove the only cue telling a user where the pointer is.

## Do's and Don'ts

### Do:

- **Do** put every number through the counter component (`.ctr`, wdth 116, tabular) so quota, percent, character counts and totals are recognisably the same object.
- **Do** express a new role with Archivo's width axis (84 marking / 88–96 heading / 100 prose / 116 counter) rather than by adding a typeface.
- **Do** separate surfaces with a 1px rule plus the panel/bench material step — `{colors.edge}` for rules on the light box, `{colors.edge-2}` for rules on the bench.
- **Do** keep the machine dark in both themes: rail, counter plates, gate head, progress troughs, table headers, the slate plate.
- **Do** draw every red rule with the wax mask asset at 60px tiling, so all of them share one hand.
- **Do** use `linear` timing on any bar reporting real elapsed time, and reserve `ease` for standing measurements.
- **Do** give any new world device a job — a sprocket, a counter, a wax rule, or a tape must mark something real, or it does not go on the page.
- **Do** ship icons from the hand-drawn sprite in `views/partials/header.ejs` at 1.6 stroke, square caps, miter joins, 17px.

### Don't:

- **Don't** add a border-radius. Anywhere. The system has one shape token and its value is 0.
- **Don't** add a box-shadow, glow, gradient fill, or backdrop blur. There are none in the build and depth must not be made this way.
- **Don't** let a wax colour take another wax colour's job — no blue primary buttons, no red links, no amber outside a warning.
- **Don't** add a dark-theme override for `--on-warn`, `--on-fill`, `--on-film` or `--ctr-hot`; wax is opaque pigment and does not follow the room light.
- **Don't** mark the current/hovered item with a left accent bar; this world uses registration corner-marks.
- **Don't** rebuild the note list as cards, or reintroduce a sidebar; the roll is one continuous strip and the navigation is the rail.
- **Don't** reuse the clapper stripe outside the auth slate, and don't add a second full-width red bar to a page that already has one under its title.
- **Don't** add a CJK webfont; the system stack is the permanent answer, for the sake of the ingest wait screen.
- **Don't** use round list bullets in prose; the bullet is a 7px square sprocket hole.
- **Don't** use emoji or an icon font. Extend the SVG sprite instead.

## Open Items

The spec has no canonical section for unresolved decisions, so they are recorded here. These are known defects the build currently carries. **None of them is a design rule**; do not inherit them on new surfaces.

- **The counter disappears on the slate plate.** `.ctr` sets its own `{colors.well}` background, but `.slate-plate` is also `{colors.well}`, so the "LOGIN" counter on the auth nameplate loses its plate and reads as plain type rather than as a counter. The counter component needs a variant (or a border/inset treatment) for use on well-coloured ground. Do not solve it by removing the counter.
- **Three surfaces carry no world device.** Sprockets appear on the roll, the gate, the quota bar and the auth slate. The note form, the import form and the settings language panel are plain bordered sheets and read as ordinary forms — the world stops at their edge.
- **The type never reaches the scale the world allows.** Archivo's width extremes (62 and 125) are never taken; the used range is 84–116. `--t-display` caps at 1.9rem. The world's material would support a much louder display setting than the build takes.
- **Two declared colour tokens are unused.** `--wax-amber` (amber *text*) and `--on-blue` (type on a blue fill) are defined and theme-mapped but applied nowhere. They are honest reservations for the roles they name, not evidence that those roles ship today.
- **Tape is nearly invisible on the panel.** `{colors.tape}` against `{colors.panel}` is a very small material step in light theme, so tags inside the roll and the light box read as bare text and the torn-tape silhouette is largely lost. The device is doing its job on the bench, not on the panel.

### Where the build contradicts the direction contract

- The contract states **one lit white light-box that is the only surface allowed to glow**. In the build, `{colors.panel}` is a general material: the roll, sheets, compare panes, the auth slate, pager cells and default buttons all use it. The rule holds literally on the note detail view and as a per-page intent everywhere else, but it is not a global invariant — it is recorded above as *The One Lit Surface Rule*, scoped to reading surfaces, because that is what the code does.
- The contract names **amber warns** as one of three equal pigments. In the build amber ships on exactly one component and its text token is unused, so the working palette is effectively two pigments plus a warning fill. The three-pencil rule is still the governing rule for new work, but the shipped ratio should not be mistaken for parity.
