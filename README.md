# GridMind

**A personal AI knowledge base that extracts _only the knowledge_ from your documents.**

Drop in a document (PDF / Word / PowerPoint / Excel / HTML / text) and GridMind converts it, then uses an LLM to pull out **just the knowledge** — definitions, principles, methods, facts — leaving out noise like schedules, grading rules, or page numbers. The result is a clean, structured note that links itself to your related notes, forming your own knowledge network.

**English** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

---

## Features

- **Accounts** — register / login / logout (sessions + bcrypt-hashed passwords). Every user's notes are isolated.
- **Notes** — create / read / update / delete, written in Markdown.
- **AI ingest** — upload a file (converted to Markdown by [MarkItDown](https://github.com/microsoft/markitdown)) or paste text; an LLM extracts **only the knowledge** and generates a title, summary, and tags. Noise (objectives, grading, schedules, layout) is deliberately excluded, and it never pads when a document is thin.
- **Search & organize** — keyword search (title/body), tag filtering, pagination.
- **Wiki-links & backlinks** — write `[[Another Note]]` to link notes; each note shows what links back to it.
- **Re-integration** — when new knowledge closely matches an existing note, a side-by-side screen lets you choose to **link** them or **merge** them into one (with an AI-generated, editable preview).
- **Batch import** — select multiple files; they are processed **one at a time** (so the model stays focused), with progress feedback.
- **Bring Your Own Key (BYOK)** — each user stores their own OpenAI API key, **encrypted at rest (AES-256-GCM)**; it is decrypted only in memory at call time and never logged or shown again.
- **Graceful degradation** — if no key is set (or the API fails), documents are still saved as plain converted text.

## Tech stack

- **Server:** Node.js, Express, EJS (server-side rendering), SQLite (`sqlite3`)
- **Auth/security:** `express-session`, `bcryptjs`, AES-256-GCM via Node `crypto`
- **Ingest/AI:** `multer` (uploads), a Python [MarkItDown](https://github.com/microsoft/markitdown) bridge (file → Markdown), `openai`, `marked` (Markdown → HTML)
- **Validation:** `express-validator`

Architecture follows MVC: `views/` = View, `routes/` = Controller, `models/` + `services/` = Model.

## Requirements

- **Node.js** (LTS recommended)
- **Python 3** with MarkItDown: `pip install "markitdown[all]"`

## Setup

```bash
git clone https://github.com/enkin-japan/finalTaskWeb.git gridmind
cd gridmind

# Node dependencies
npm install

# Python dependency (for file → Markdown conversion)
pip install "markitdown[all]"

# Configuration
cp .env.example .env
# then edit .env — at minimum set a unique APP_ENCRYPTION_KEY and SESSION_SECRET:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment variables (`.env`)

| Variable | Purpose |
|---|---|
| `APP_ENCRYPTION_KEY` | Key used to encrypt each user's stored OpenAI key (AES-256-GCM). **Required.** Use a long random value. |
| `SESSION_SECRET` | Signing secret for `express-session`. |
| `PORT` | Port to listen on (default `3000`). |
| `HOST` | Bind address (default `127.0.0.1`, loopback only). Set `0.0.0.0` to expose on all interfaces. |
| `OPENAI_API_KEY` | Optional. A development/testing fallback key (the seed script assigns it to the demo account). In normal use, each account provides its own key in the app. |
| `OPENAI_MODEL` | Default model (default `gpt-4o-mini`). |

## Run

```bash
# optional: seed a demo account (demo / demo1234) with example notes
npm run seed

npm start
# open http://localhost:3000
```

## Usage

1. **Register** an account (or log in as `demo` / `demo1234` if you seeded).
2. Open **⚙ Settings** and paste your own OpenAI API key (stored encrypted).
3. Go to **⇪ Import**, choose a file or paste text, and let the AI organize it into a note.
4. Browse, search, tag, and link your notes with `[[Note Title]]`.

> Without a key, import still works — it just saves the converted text without AI organization.

## Project structure

```
app.js            # Express entry (server + routing + sessions)
middleware.js     # auth guard + current-user loader
models/           # SQLite access: db, users, notes, tags
services/         # ai, ingest (MarkItDown bridge), search, links, relate, render, crypto
routes/           # controllers: auth, index (home), notes, settings
views/            # EJS templates + partials
public/           # css / client js
tools/            # md_convert.py (Python bridge), seed.js (demo data)
```

## Privacy & BYOK

GridMind is a multi-user service, so notes live in the server's SQLite database, isolated per account. The sensitive part — your OpenAI API key — is **encrypted at rest** with a server-side key (`APP_ENCRYPTION_KEY`) that is not stored in the database, so a database dump alone cannot recover it. The key is used only transiently to call OpenAI and is never logged or returned to the browser.

## License

[MIT](LICENSE) © 2026 enkin
