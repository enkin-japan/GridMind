# GridMind

**A personal AI knowledge base that extracts _only the knowledge_ from your documents.**

Drop in a document (PDF / Word / PowerPoint / Excel / HTML / text) and GridMind converts it, then uses an LLM to pull out **just the knowledge** — definitions, principles, methods, facts — leaving out noise like schedules, grading rules, or page numbers. The result is a clean, structured note that links itself to your related notes, forming your own knowledge network.

**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

---

## Features

- **Accounts** — register / login / logout (sessions + bcrypt-hashed passwords). Every user's notes are isolated.
- **Notes** — create / read / update / delete, written in Markdown.
- **AI ingest** — upload a file (converted to Markdown by [MarkItDown](https://github.com/microsoft/markitdown)) or paste text; an LLM extracts **only the knowledge** and generates a title, summary, and tags. Noise (objectives, grading, schedules, layout) is deliberately excluded, and it never pads when a document is thin.
- **Output language** — choose the note's language independently of the source. An English PDF can become a Japanese note. A guard re-translates if the output drifts back toward the source language.
- **Interface language, theme and stock** — the UI ships in Japanese, English, Simplified Chinese, Traditional Chinese and Korean, picked in settings or resolved from the browser. Light and dark are an explicit choice rather than only a system preference, alongside four measured palettes, a density switch and a sprocket-texture switch.
- **Long documents** — anything over ~15,000 characters is split, extracted in parallel, and consolidated into one note, so nothing is lost to a truncation limit.
- **Live progress** — ingest takes 20–35 seconds. The screen shows the real stage, the list of knowledge points found, and the note body streaming in as it is written.
- **Search & organize** — keyword search (title/body), tag filtering, pagination.
- **Wiki-links & backlinks** — write `[[Another Note]]` to link notes; each note shows what links back to it.
- **Re-integration** — when new knowledge closely matches an existing note, a side-by-side screen lets you choose to **link** them or **merge** them into one (with an AI-generated, editable preview). Relatedness combines term overlap with semantic vectors.
- **Batch import** — select multiple files; they are processed **one at a time** (so the model stays focused), with progress feedback.
- **Plans & quota** — the service holds the API key; users never handle one. A free and a pro tier cap both the monthly ingest count and the per-file character count. Token usage and cost are logged per ingest.
- **Privacy of source files** — uploaded files are deleted as soon as they are converted; only the extracted note is kept.

## Tech stack

- **Server:** Node.js, Express, EJS (server-side rendering), SQLite (`sqlite3`)
- **Auth/security:** `express-session` with a persistent SQLite store, `bcryptjs`
- **Ingest/AI:** `multer` (uploads), a resident Python [MarkItDown](https://github.com/microsoft/markitdown) worker pool (file → Markdown), `openai`, `marked` (Markdown → HTML)
- **Validation:** `express-validator`

Architecture follows MVC: `views/` = View, `routes/` = Controller, `models/` + `services/` = Model.

File conversion runs in a pool of long-lived Python processes that speak line-delimited JSON over stdin/stdout. Loading MarkItDown once instead of per request removes about half a second of start-up from every ingest; the pool applies back-pressure, kills workers that exceed a timeout, and respawns them on crash.

## Requirements

- **Node.js** (LTS recommended)
- **Python 3** with MarkItDown: `pip install "markitdown[all]"`
- An **OpenAI API key** held by the operator (not by end users)

## Setup

```bash
git clone https://github.com/enkin-japan/GridMind.git gridmind
cd gridmind

# Node dependencies
npm install

# Python dependency (for file → Markdown conversion)
pip install "markitdown[all]"

# Configuration
cp .env.example .env
# then edit .env — at minimum set OPENAI_API_KEY and a unique SESSION_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment variables (`.env`)

Only the first three are required. `.env.example` documents every optional knob with the measurements behind its default.

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | The service's own key. Used for both extraction and embeddings. **Required.** |
| `SESSION_SECRET` | Signing secret for `express-session`. **Required.** |
| `OPENAI_MODEL` | Model used for extraction (default `gpt-5.6-luna`). |
| `PORT` | Port to listen on (default `3000`). |
| `HOST` | Bind address (default `127.0.0.1`, loopback only). Set `0.0.0.0` to expose on all interfaces. |
| `AI_TWO_STAGE` | `1` to list the knowledge points first, then write them up. Measured +74% knowledge for +74% cost on documents under 15,000 characters. |
| `PLAN_FREE_INGESTS` / `PLAN_FREE_DOC_CHARS` | Free-tier caps (default 30 ingests per month, 20,000 characters per file). |
| `PLAN_PRO_INGESTS` / `PLAN_PRO_DOC_CHARS` | Pro-tier caps (default 500 / 60,000). |
| `MD_WORKERS` | Size of the Python conversion pool (default: CPU cores − 1, capped at 4). |
| `EMBEDDING_ENABLED` | `0` to disable semantic vectors and fall back to term overlap alone. |
| `TRUST_PROXY` / `COOKIE_SECURE` | Set both to `1` when running behind a reverse proxy over HTTPS. |

## Run

```bash
# optional: seed a demo account (demo / demo1234) with example notes
npm run seed

npm start
# open http://localhost:3000
```

## Usage

1. **Register** an account (or log in as `demo` / `demo1234` if you seeded).
2. Go to **⇪ Import**, choose a file or paste text, pick the output language, and let the AI organize it into a note.
3. If the new knowledge closely matches an existing note, choose whether to **link** or **merge**.
4. Browse, search, tag, and link your notes with `[[Note Title]]`.
5. **⚙ Settings** shows your plan, this month's usage, and your default output language.

> No API key is ever entered by a user. If the AI call fails, the import still saves the converted text so nothing is lost.

## Project structure

```
app.js            # Express entry (server + routing + sessions)
middleware.js     # auth guard + current-user loader
models/           # SQLite access: db, users, notes, tags, embeddings
services/         # ai, embed, ingest (MarkItDown pool), janitor, links,
                  #   quota, relate, render, search
routes/           # controllers: auth, index (home), notes, settings
views/            # EJS templates + partials
public/           # css / client js
tools/            # md_worker.py (Python worker), seed.js, embed_backfill.js
docs/             # architecture & execution notes
```

## Privacy

GridMind is a multi-user service, so notes live in the server's SQLite database, isolated per account — a note is only ever reachable by the account that created it.

The OpenAI API key belongs to the service and is read from the server environment. It is never stored per user, never sent to the browser, and never logged.

Uploaded files are removed from disk as soon as they have been converted, and a background sweep deletes anything left behind by an interrupted request. Only the extracted note is retained.

## License

[MIT](LICENSE) © 2026 enkin
