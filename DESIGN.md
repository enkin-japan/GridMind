---
name: GridMind
description: A knowledge base where the grid is the structure, not the decoration.
colors:
  index-blue: "#3b6ef5"
  index-wash: "#e8efff"
  ink: "#1c2128"
  graphite: "#6a7280"
  lattice-line: "#e2e5ea"
  surface: "#ffffff"
  paper: "#f6f7f9"
  on-accent: "#ffffff"
  alert-red: "#d63b3b"
  alert-red-soft: "#fdecec"
  amber: "#8a6d00"
  amber-soft: "#fdf0d5"
typography:
  headline:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.65
  title:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.65
  body:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  title-sm:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.65
  small:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.65
    letterSpacing: "0.04em"
  mono:
    fontFamily: "ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.index-blue}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.alert-red}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-accent-soft:
    backgroundColor: "{colors.index-wash}"
    textColor: "{colors.index-blue}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.circle}"
    width: "38px"
    height: "38px"
  icon-button-hover:
    backgroundColor: "{colors.index-wash}"
    textColor: "{colors.index-blue}"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  chip-active:
    backgroundColor: "{colors.index-wash}"
    textColor: "{colors.index-blue}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.index-blue}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "1px 8px"
---

# Design System: GridMind

## Overview

**Creative North Star: "The Lattice"**

Knowledge arrives as a mess — a slide deck padded with schedules, grading rules, and page numbers. GridMind's job is to cut that away and leave cells of knowledge that snap into a structure. The interface is that structure made visible: a lattice of hairline rules dividing the screen into cells, where every cell holds something worth keeping and nothing holds filler. The 1px border is not a decorative edge here; it is the wall of the cell, and it is why almost nothing in this system needs a shadow to be understood.

The character is **dense, precise, and calm enough to sit in for a long time**. Dense because a wasted line is a defect in the product itself — the extraction refuses to pad, and the interface must not undo that by spreading five facts across a screen of whitespace. Precise because this is an instrument: it reports measured usage, real costs, and real progress, and it should look like something that knows the number rather than something that guesses. Calm because the actual work here is *reading* — long Japanese and English notes, read at length — so borders stay soft, contrast stays comfortable, and colour never raises its voice without cause.

The system commits to one accent and spends it carefully. Index Blue appears where the user needs to know **where they are or where they can go** — a link, the current page, the selected tag, the filling progress bar — and essentially nowhere else. Everything not carrying that job is ink, graphite, or a hairline. Confirmed rejection: this must never read as an "AI product." No violet gradients, no glowing edges, no sparkle iconography, no chrome that advertises the model.

**Key Characteristics:**
- Hairline lattice (1px `lattice-line`) as the primary structural device, not shadow
- One accent, spent only on position and navigation
- Full light/dark parity through twelve CSS custom properties — no component owns a colour
- A closed seven-step type ramp (0.75rem–2rem) tuned for CJK and Latin side by side
- A single radius (10px) with pills reserved for count-like objects
- Small, fast state changes — 80–150ms, a 2px lift at most

## Colors

A cool, near-neutral field crossed by hairlines, with one saturated blue reserved for orientation and two status hues reserved for feedback. The palette is defined once as twelve CSS custom properties on `:root` and redefined wholesale under `prefers-color-scheme: dark`, so every component inherits both themes without knowing they exist. **No component rule contains a literal colour.**

### Primary

- **Index Blue** (light `#3b6ef5` / dark `#6d97ff`): The only voice in the system. It marks links, the active tag chip, the current pager page, the filled portion of a quota or ingest bar, the primary button, and the plan badge. Its role is *positional* — it answers "where am I" and "where can I go."
- **Index Wash** (light `#e8efff` / dark `#1e2740`): Index Blue at rest. The tint behind a selected chip, the summary box on a note, the current plan row, an `ok` notice, and the hover state of the icon button and file drop zone. It says "this one" without shouting.

### Neutral

- **Ink** (light `#1c2128` / dark `#e6e9ef`): All primary reading text. Note bodies, headings, card titles, input values.
- **Graphite** (light `#6a7280` / dark `#9aa2af`): Everything secondary — summaries, timestamps, tag labels at rest, backlink headings, the footer, the pane labels, form hints. Roughly half of all text on a busy screen is graphite; that ratio is what keeps the reading text legible.
- **Lattice Line** (light `#e2e5ea` / dark `#2a2f3a`): The structural hairline. Card edges, input strokes, table cells, the header rule, the footer rule, the unfilled track of every progress bar. This is the most load-bearing colour in the system.
- **Surface** (light `#ffffff` / dark `#181b22`): Raised cells — cards, panes, inputs, the sticky header, modals, the auth card.
- **Paper** (light `#f6f7f9` / dark `#0f1116`): The page ground behind the lattice. Also used *inside* raised surfaces for recessed elements: code blocks, the search field, the file drop zone, modal inputs.

### On-Accent

- **On-Accent** (light `#ffffff` / dark `#0f1116`): The text colour that sits on an Index Blue fill — the primary button, the active pager page, the plan badge, the search button, the file-selector button. It is the one token whose value *inverts* between themes rather than shifting.

### Status

Two hues, each with a soft companion, used only for feedback. This family is closed.

- **Alert Red** (`#d63b3b`, identical in both themes): Required-field markers, the delete button's text and border, validation error text. A text and stroke colour — no red fill exists in the system.
- **Alert Red Soft** (light `#fdecec` / dark `#3a1e1e`): The background of the form-error block.
- **Amber** (light `#8a6d00` / dark `#e0c069`): The text of a warning notice.
- **Amber Soft** (light `#fdf0d5` / dark `#3a3115`): The background of a warning notice.

### Measured contrast

| Pair | Light | Dark |
|---|---|---|
| On-Accent on Index Blue | 4.44:1 | 6.76:1 |
| Ink on Surface | 16.18:1 | 14.17:1 |
| Graphite on Surface | 4.85:1 | 6.70:1 |
| Amber on Amber Soft | 4.36:1 | 7.31:1 |
| Index Blue on Index Wash | 3.85:1 | 5.30:1 |
| Index Blue link on Surface | 4.44:1 | 6.17:1 |
| Alert Red on Alert Red Soft | 4.04:1 | 3.29:1 |

Reading text and secondary text clear AA comfortably. **The accent-on-tint and link pairs sit in the 3.85–4.44 band** — above the 3:1 large-text floor, below the 4.5:1 normal-text bar. Closing that gap means darkening Index Blue itself in the light theme, which is an identity change and is deliberately not made here.

### Named Rules

**The Index Rule.** Index Blue answers exactly one question: *where.* Links, current page, selected tag, filled progress, primary action. If a proposed use of the accent does not tell the user where they are or where they can go, it is decoration and must be graphite or ink instead.

**The On-Accent Rule.** Never hard-code the text colour that sits on an accent fill. `--on-accent` exists because the accent is *lighter* in dark mode: white on it measured 2.79:1, below even the large-text floor, on the primary button. The fill is identical in both themes; the text on it inverts.

**The Two-Theme Rule.** No component defines its own colour. Every colour reaches a component through one of the eight custom properties, so a component written correctly is dark-mode-correct for free. Any literal hex inside a component rule is a bug, not a style choice.

## Typography

**Body Font:** `-apple-system, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`
**Mono Font:** `ui-monospace, monospace` (Markdown editing textarea, code blocks, inline code)

**Character:** A single system stack, chosen so Japanese and Latin sit on the same line without the height mismatch that a Latin-first stack produces. There is no display face and no brand face — the type is a delivery mechanism for other people's knowledge, and drawing attention to itself would be working against the product.

### Hierarchy

- **Headline** (700, browser-default `2rem`, line-height 1.65): Page titles — the note title, the import heading, the auth card heading. Currently unstyled and inheriting the browser default.
- **Title** (700, `1.2rem`): The `GridMind` wordmark in the header. Card titles run smaller at `1.05rem`, weight inherited.
- **Body** (400, `1rem`, line-height 1.65): Note bodies, form values, everything read at length. The 1.65 line-height is set once on `body` and inherited everywhere — including into headings, which is what gives headings their generous, unhurried set.
- **Label** (700, `0.75rem`, letter-spacing `0.04em`, uppercase): The `新しい知識` / `既存のノート` markers on the reconcile panes. The only uppercase type in the system.
- **Title-sm** (700, `1.05rem`): Card titles and the modal heading.
- **Small** (400, `0.9rem`) and **Caption** (400, `0.85rem`): The dense secondary band. Small carries form labels, notices, summaries, and table text; Caption carries chips, hints, the streaming preview, and pane hints. Together they account for most secondary text in the system, and this compression is how the interface stays dense without shrinking the reading text.

**The ramp is closed at seven steps:** `2 / 1.2 / 1.05 / 1 / 0.9 / 0.85 / 0.75rem`. Seven one-off sizes (`0.95`, `0.92`, `0.88`, `0.82`, `0.8`, `0.78`, `0.72rem`, each used exactly once) were snapped to their nearest step — the largest single move was 0.05rem, under one pixel at a 16px root. Timestamps in both the card grid and the note footer now share one step, which they did not before.

### Named Rules

**The Reading Text Is Sacred Rule.** Body copy stays at `1rem`/1.65 and never shrinks to win space. Density is bought from chrome — labels, metadata, chips, timestamps — never from the text the user came to read.

## Layout

A single centred column, `980px` maximum, with `20px` side padding and `64px` of bottom breathing room. Narrower containers step down for narrower jobs: `720px` for note forms, `520px` for the header search, `460px` for modals, `440px` for the auth and settings cards. Nothing in the system is full-bleed.

The note list is the only true grid: `repeat(auto-fill, minmax(240px, 1fr))` with a `16px` gutter, so the column count is decided by the viewport rather than by breakpoints. The reconcile screen is a fixed two-column compare (`1fr 1fr`, `16px` gutter).

**There is exactly one media query for layout in the entire system:** at `max-width: 720px` the reconcile compare collapses to a single column. Everything else adapts through `auto-fill`, `flex-wrap`, `max-width`, and percentage widths. Two further media queries exist for `prefers-color-scheme` and one for `prefers-reduced-motion`.

Vertical rhythm runs on an ad-hoc but consistent set of gaps — `6 / 8 / 12 / 16 / 20 / 24 / 28`px — applied through flex and grid `gap` rather than margins. **These steps are not yet tokenized**; they are captured in this file's `spacing` scale as a description of current practice, not as an existing implementation.

The header is `position: sticky` at `z-index: 10`; modals sit at `z-index: 50`. Those are the only two stacking levels in the system.

### Named Rules

**The 980 Rule.** Reading content never exceeds 980px, and input surfaces never exceed 720px. A screen that wants more width is a screen that should have been split.

## Elevation & Depth

The system is essentially flat: depth is carried by a 1px `lattice-line` border and by the `paper` / `surface` tonal step, not by shadow. In the entire stylesheet there is **one** box-shadow — the note card's hover lift — plus the modal's `rgba(0,0,0,.45)` scrim.

**This is currently a description, not a doctrine.** The flatness emerged from building components one at a time rather than from a decided position on depth, and the question of whether floating elements (modals, future dropdowns, tooltips, toasts) should earn a shadow is deliberately left open. The modal today floats on scrim alone, with the same 1px border as a static card — which works, but has not been tested against a system with more layered surfaces in it.

Until that decision is made: match the incumbent. Add depth with a border and a tonal step; introduce a new shadow only with a specific reason, and record it here when you do.

### Shadow Vocabulary

- **Card lift** (`box-shadow: 0 6px 20px rgba(0,0,0,.08)`, paired with `translateY(-2px)`, both at `.08s ease`): The response to hovering a note card in the list. The only shadow in the system.
- **Modal scrim** (`background: rgba(0,0,0,.45)`): Full-viewport backdrop behind a modal.

Note that the system-wide focus ring is an `outline`, not a shadow. Focus deliberately did not become a third entry in this vocabulary: an outline follows each element's own radius, works on pills and circles unchanged, and keeps the open depth question from being quietly answered by an accessibility fix.

## Shapes

One radius does nearly all the work: **10px** (`--radius`) on cards, buttons, inputs, panes, modals, the summary box, notices, and the file drop zone. Two exceptions are principled rather than accidental:

- **Pills** (`999px`) belong to objects that behave like counts or quantities: tag chips, the plan badge, and the track and fill of every progress bar. A pill signals "this is a measure or a token," not "this is a container."
- **Tighter radii** belong to inline code (`4px`) and to code blocks and pager buttons (`8px`) — small objects where 10px would read as bulbous.

The settings gear is the one circle (`50%`, 38×38px).

Borders are uniformly `1px solid var(--border)`. Two deliberate departures: the file input uses `1.5px dashed` to read as a drop target, and the reconcile panes carry a `3px` coloured top edge — Index Blue for the incoming note, graphite for the existing one — which is the system's only use of a border as a semantic marker rather than a structural one.

### Named Rules

**The One Radius Rule.** Containers are 10px. If something is not 10px, it must be because it is a measure (pill), inline code (4px), or a circle — not because it looked better.

## Components

Components are **restrained and precise**: thin strokes, one radius, and state changes that are small but unambiguous. A hover moves a card 2px and completes in 80ms. Nothing bounces, nothing scales, nothing glows.

### Buttons

- **Shape:** One radius throughout (10px), `8px 16px` padding, 1px border.
- **Primary:** Index Blue fill, white text, matching border. Used for the single committing action on a screen.
- **Default:** Surface fill, ink text, lattice-line border. Everything non-committing.
- **Danger:** Transparent fill, Alert Red text *and* border. Delete only. The system has no filled destructive button.
- **Ghost:** Graphite text with a dashed border — used for "save without linking" on the reconcile screen, where the action is valid but deliberately de-emphasised.
- **Accent soft** (`.btn-new`): Index Wash fill, Index Blue text, weight 600. The header's "new note" affordance — present but quieter than a primary button.
- **Link button:** No border, no background, graphite underlined text at `0.85rem`; goes Index Blue on hover. Used for logout.
- **Hover:** The border goes Index Blue on every variant (150ms). Primary additionally brightens its own fill (`filter: brightness(1.08)`) rather than reaching for a second blue; Danger takes a 10% wash of Alert Red derived from the token with `color-mix`, so neither hover introduces a colour the palette does not already own.
- **Focus:** A 2px Index Blue outline at 2px offset, inherited from the system-wide focus rule. Danger swaps the outline to Alert Red so the ring agrees with the button.
- **Disabled:** `opacity: .55` with `cursor: default`, and every hover suppressed via `:not(:disabled)`. The import button spends 20–35 seconds disabled during an ingest; before this existed it looked fully pressable the whole time.

### Icon Button

38×38px circle, surface fill, graphite glyph, 1px border. On hover it fills with Index Wash, turns Index Blue, and **rotates 45°** over 250ms. This is the system's one piece of personality — a gear that visibly turns — and it is worth preserving precisely because it is the only one.

### Chips

- **Style:** Pill (999px), surface fill, graphite text, 1px lattice-line border, `3px 10px` padding, `0.85rem`. A `.small` variant drops to `0.75rem` / `2px 8px`.
- **State:** Active chips take Index Wash fill, Index Blue text, and an Index Blue border. A count inside a chip is always Index Blue at weight 600.

### Cards

- **Corner:** 10px. **Background:** Surface. **Border:** 1px lattice-line. **Padding:** 16px. **Internal gap:** 8px, column flex.
- **Shadow strategy:** Flat at rest; on hover, `translateY(-2px)` plus the card-lift shadow at `.08s ease`.
- Titles run `1.05rem`; summaries and timestamps are graphite at `0.9rem` / `0.78rem`, with the timestamp pushed to the bottom by `margin-top: auto` so cards of unequal length still align their footers.

### Inputs

- **Style:** Surface fill, 1px lattice-line border, 10px radius, `10px 12px` padding, inherited font family. The header search and modal inputs use Paper fill instead, to read as recessed inside an already-raised surface.
- **Textarea:** Same shell, monospace family, `resize: vertical` only.
- **File input:** A 1.5px dashed drop zone on Paper with graphite text and 16px padding; on hover the border becomes Index Blue and the fill becomes Index Wash. Its `::file-selector-button` is styled as a primary button with an 18px right margin.
- **Hover:** Border shifts to Graphite (150ms).
- **Focus:** Border shifts to Index Blue, under the same 2px outline every other control gets. The border moves as well as the ring so the field itself answers, not just the halo around it.
- **Select:** Selects were unstyled until they were added to the shared input rule; they now match text inputs exactly.
- **Error:** Field-level errors render in the `.errors` block, not on the field.

### Navigation

The sticky header is a single `surface` bar with a bottom hairline: wordmark, search field, new-note button, spacer, username, settings gear, logout. Type is small — username at `0.88rem`/600, logout at `0.85rem`. There is no mobile navigation treatment; the header wraps by flex at narrow widths.

### Progress Bars

The system's signature component, used for both quota and ingest. A `999px` track in `lattice-line`, filled with Index Blue, `overflow: hidden` so the fill's own pill corners are clipped to the track. Two heights carry two meanings: **8px for quota** (a standing measure, `width .3s ease`) and **6px for ingest** (a live process, `width .45s linear` — linear because an eased progress bar reads as decelerating when it is not).

The ingest panel pairs this with a streaming preview: a scrolling `surface` box in `0.85rem`/1.75 with `white-space: pre-wrap`, ending in a blinking Index Blue caret (`1s steps(2, start)`). Both the bar transition and the caret are disabled under `prefers-reduced-motion`.

### Notices

Full-width, 10px radius, `10px 14px` padding, `0.9rem`. The `ok` variant uses Index Wash with Index Blue text. The `warn` variant uses amber values (`#fdf0d5` / `#8a6d00`, dark `#3a3115` / `#e0c069`) that live **outside** the token system — the one place a component defines its own colour.

## Do's and Don'ts

### Do:

- **Do** build depth from a 1px `lattice-line` border and a `paper`/`surface` tonal step before reaching for a shadow. Match the incumbent while the depth question is open.
- **Do** spend Index Blue only on position and navigation, per **The Index Rule**. Links, current page, selected tag, filled progress, primary action.
- **Do** reach every colour through the eight custom properties, so the component is correct in both themes without a second rule.
- **Do** keep containers at 10px radius and reserve pills (999px) for measures — chips, badges, progress tracks.
- **Do** buy density from chrome, not from reading text. Labels and metadata may go to `0.72–0.85rem`; body copy stays at `1rem`/1.65.
- **Do** keep state changes small and quick: 80–150ms, a 2px lift at most. The gear's 45° rotation at 250ms is the system's one indulgence and stays unique.
- **Do** guard new motion with `prefers-reduced-motion`. The single block at the foot of the stylesheet stops what actually moves — the card lift, the gear rotation, both bar fills, the caret — and deliberately keeps colour and border transitions, because removing those would leave no feedback about what the pointer is on.
- **Do** give every new interactive component a hover, a focus, and (if it can be disabled) a disabled state. The system-wide `:where(...):focus-visible` rule covers focus by default at zero specificity; the other two are yours to write.
- **Do** derive a hover colour from a token that already exists — `filter: brightness()` on a filled control, `color-mix()` on a tinted one — rather than adding a palette entry for one state.

### Don't:

- **Don't** let this look like an "AI product." No violet or gradient fills, no glowing borders, no sparkle or wand iconography, no chrome that advertises the model. The extraction is the product; the model is plumbing.
- **Don't** write a literal colour inside a component rule. The stylesheet has none left — the warning notice, the error block, and every white-on-accent label now go through tokens. The only literals outside `:root` are the two shadow alphas, which are not palette entries.
- **Don't** spread content to fill width. Reading stays within 980px, input surfaces within 720px, per **The 980 Rule**.
- **Don't** add a second accent. Index Blue is the only orientation colour, and the status family — Alert Red and Amber, each with a soft companion — is closed at two hues and exists only for feedback. A new hue needs a new job that neither orientation nor feedback covers.
- **Don't** introduce a new radius value. Ten pixels, a pill, `4px`/`8px` for code, and one circle is the complete vocabulary.
- **Don't** add a font size. The ramp is closed at `2 / 1.2 / 1.05 / 1 / 0.9 / 0.85 / 0.75rem`. Snap to the nearest step; a size that seems to need a new step usually needs a different weight or colour instead.
- **Don't** ease a live progress bar. Linear is correct for anything reporting real elapsed work; easing reads as slowing down.
- **Don't** ship an interaction whose only feedback is that a spinner is turning. Progress in this system reports a real stage, a real count, or real output.
