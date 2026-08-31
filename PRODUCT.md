# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who has a document they need to *learn from* and wants it turned into knowledge they can review. Lecture slides are one case among workplace training material, technical documentation, and industry reports — the product is not scoped to students.

The defining situation: the user arrives holding **a file** (most often a PDF or a slide deck), not text they have already curated. They did not write it, they cannot control its quality, and it is padded with material that is not knowledge.

Confirmed secondary trait: users do not necessarily read the language the source document is written in. Choosing an output language different from the source is a primary use, not a convenience feature.

## Product Purpose

Turn a document into notes that contain **only its knowledge**.

Extraction deletes document furniture — learning objectives, grading rules, schedules, agendas, presenter names, page numbers, exercise instructions — and keeps definitions, principles, mechanisms, methods, syntax, facts, figures, classifications, and comparisons. Notes then link themselves to the user's related notes, so what accumulates is a knowledge network rather than a pile of summaries.

Success: a reader who has never seen the source can learn from the note alone, and can find it again later through its links.

## Positioning

Three commitments a neighbouring "AI summarizer" could not truthfully copy:

1. **It removes rather than compresses.** The product target is "no omission, no over-extension, dense layout." It refuses to pad a thin document, and it will output an empty note when a document carries no knowledge at all. Deleting is the deliverable.
2. **New knowledge is reconciled against what the user already has.** High overlap opens a side-by-side decision (link or merge into the existing note, with an editable merge preview); medium overlap auto-links; low overlap saves silently. Importing the same material twice does not produce two notes.
3. **Output language is independent of source language,** with a guard that re-translates when the output drifts back toward the source language.

## Operating Context

- Users arrive with real files: PDF, Word, PowerPoint (including `.pptm`), Excel, HTML, Markdown, CSV, plain text. Conversion to Markdown happens locally before any model call.
- **Diagram-heavy slide decks are a normal input, not an edge case.** Their text extraction is unreliable: fragments, broken sentences, and scrambled label/number pairs arrive routinely, and the product must drop them rather than restate them confidently.
- Batch import processes one file at a time, sequentially.
- **One ingest takes roughly 20–35 seconds** and cannot currently be made meaningfully faster at acceptable cost. This is a fixed condition of the experience, not a temporary performance bug.
- Original uploaded files are deleted after conversion; only the extracted note is kept.

## Capabilities and Constraints

**Confirmed capabilities**

- Accounts with per-user isolation (register / login / logout).
- Notes as Markdown: create, read, update, delete.
- AI ingest from an uploaded file or pasted text, producing body, title, summary, and tags.
- Output-language selection: source language, Japanese, English, Simplified Chinese, Traditional Chinese, Korean.
- Keyword search (title and body), tag filtering, pagination.
- Wiki-links `[[Note]]` with backlinks.
- Re-integration: side-by-side compare, link or merge, editable merge preview.
- Batch import with per-file progress.
- Plan tiers (free / pro) limited by **both** monthly ingest count and per-file character count.
- Per-ingest usage and cost logging.
- Semantic vectors used for relatedness scoring.
- Streamed ingest progress: stage checkpoints, the extracted knowledge-point inventory, and the note body as it is written.

**Constraints**

- **The server must be Node.js.** This is the single hard stack rule inherited from the course brief, and it remains binding.
- **Python with MarkItDown is a required runtime dependency** for file conversion.
- **The service holds the API key; users never see or supply one.** Model cost is therefore the operator's cost, which makes quota a product-level constraint rather than a nicety.
- **The interface is multi-language.** Five languages ship — Japanese, English, Simplified Chinese, Traditional Chinese (Taiwan usage) and Korean — resolved per request from the account setting, then a cookie, then `Accept-Language`, with region tags folded in (`zh-Hant-TW`, `zh-HK` → Traditional; `zh-Hans-CN` → Simplified). UI copy lives in `locales/` and must not be hard-coded into templates or client JS; a key with no translation falls back to Japanese rather than rendering blank, and every locale is checked for missing keys and mismatched placeholders. Note output language offers the same five plus source-language passthrough, and **each note records the language it was written in**, so its type renders in that language's glyph forms whatever the interface is set to. When the output language was left as source-language passthrough, the note's language is taken from the writing system only where that is definitional — kana means Japanese, hangul means Korean — and is otherwise left unrecorded rather than guessed.
- **Light and dark are a user choice, not only a system preference.** Stored per account with a cookie fallback so the signed-out screens honour it too.
- **Extraction is not reproducible.** The model in use forces a fixed temperature, so completeness varies between runs on identical input. Any claim of deterministic output would be false.
- The course deliverable is still open; until it closes, running reliably on demo day is a first-class requirement.

**Decided against**

- **The visual world is not a user preference.** Palette (four measured film stocks), density and sprocket texture are selectable; the world itself — the film-roll list, the light box, the gate, the dark machine rail — is not, and no theming architecture will be built for it. With no logo or wordmark established, this world is what carries the product's position, and a product that offers to look like anything has stated no position. Users who want a different palette get one; users who want a different product do not get one here.

**Explicitly undecided**

- **Whether the pro tier will take real payment.** Not decided.
  If it becomes real, these surfaces do not exist yet and must be designed: plan comparison and upgrade, approaching-limit and limit-reached states, checkout, billing history and receipts, payment failure, and downgrade or cancellation.

## Brand Commitments

- Product name: **GridMind**.
- No logo, wordmark, or brand palette has been established.

## Evidence on Hand

- **Real source material** — `testFiles/` holds actual lecture decks from three subjects (Node.js web development, business fundamentals, IoT). This is the corpus the extraction was tuned and measured against, including the diagram-heavy IoT decks.
- **Screens** — `screenshots/` holds 21 captures, covering every screen in both the light and dark themes
  and all five interface languages.
- **Measured data** — per-stage timings, extraction density measurements, and per-ingest costs are recorded in code comments and commit messages.
- **Course deliverables** — `templates/` holds the submitted planning, UI-spec and presentation documents;
  `instruction/` holds the blank forms and samples handed out by the course.

**Absences that future work must not fabricate:** there are no external users, no testimonials, no usage statistics, no press coverage, no published pricing, and no uptime, security-certification, or deployment claims. The repository is private and has had no outside visitors.

## Product Principles

1. **Deleting is the product.** Removing what is not knowledge is the value, not a side effect. An empty note for a document that teaches nothing is a correct result, not a failure.
2. **Density over volume.** A wasted line is a defect. More output is not more value.
3. **A missing point beats a wrong one.** When the source is garbled, dropping the statement is correct; confidently restating broken text is the worst outcome.
4. **Never destroy a completed result.** A failure in billing, linking, or metadata must not discard knowledge the user already waited and paid for.
5. **Waiting must have content.** Latency that cannot be removed is filled with real progress and real output — never with a spinner that only proves the page has not crashed.

## Accessibility & Inclusion

Users are not assumed to read the language of their source documents, nor Japanese. Multi-language interface support is a committed requirement (see Constraints).

No other product-specific accessibility standard has been established yet.
