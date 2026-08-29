# Deployment

> **Status:** Written 2026-08-29 against the `v3-visual` tree.
> **Scope:** How to run GridMind on a server behind nginx. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for why the system is shaped this way.

---

## 1. What nginx can and cannot do here

GridMind renders every page on the server with EJS. There is no build step and no static
bundle — `GET /notes/116` is HTML that Node assembled from SQLite at request time. nginx has
no JavaScript runtime, so it **cannot serve this application by itself**. It goes in front as
a reverse proxy:

```
browser ──TLS──> nginx :443 ──plain HTTP──> node :3000 ──> SQLite (db/kb.db)
                                                  └──────> python3 workers (markitdown)
                                                  └──────> OpenAI API
```

Node stays resident. nginx adds TLS, a public port, request limits, and static-asset serving.

Running Node directly on :443 also works and is what the development setup does on
:3000 — nginx is not required, it is the recommended production arrangement.

The application was written expecting to sit behind a proxy. Four things are already in place:

| Where | What it does |
|---|---|
| `app.js:28` | `TRUST_PROXY=1` → `app.set('trust proxy', 1)`, so `req.protocol` and `req.ip` read the forwarded values |
| `app.js:40` | `COOKIE_SECURE=1` → session cookie gets `secure` |
| `app.js:83` | `HOST` defaults to `127.0.0.1`, so Node is not reachable except through the proxy |
| `routes/notes.js:112` | the ingest stream sends `X-Accel-Buffering: no`, which tells nginx not to hold the response |

---

## 2. Prerequisites

- **Node.js 24** (developed on v24.15.0). No `engines` field is pinned; anything with a
  modern `fetch` and `node:` builtins will do.
- **Python 3** with `markitdown[all]` installed (`pip install -r requirements.txt`).
  File → Markdown conversion runs in resident Python workers spawned by
  `services/ingest.js:53`. Override the interpreter with `PYTHON=/path/to/python3` if it is
  not on `PATH` for the service user.
- **Writable directories** owned by the service user:
  - `db/` — `kb.db` (application data) and `sessions.db` (login sessions) are created here
  - `uploads/` — uploaded files land here and are deleted as soon as they are converted;
    `services/janitor.js` sweeps anything left behind
- An **OpenAI API key**. The service holds one key for all users; users do not supply their own.

---

## 3. Environment

Copy `.env.example` to `.env` and fill it in. `app.js:4` calls `dotenv.config()`, so the file
is read from the working directory at startup — a process manager does not need to inject
these separately.

The settings that specifically matter behind a proxy:

```sh
SESSION_SECRET=<long random string>   # required; the fallback is a known dev value
HOST=127.0.0.1                        # loopback only — nginx is the sole caller
PORT=3000
TRUST_PROXY=1                         # honour X-Forwarded-*
COOKIE_SECURE=1                       # only with HTTPS; with plain HTTP this locks users out
```

`COOKIE_SECURE=1` without TLS means the browser will refuse to store the session cookie and
login will appear to silently fail. Turn it on only once nginx terminates TLS.

---

## 4. Running Node as a service

Use a **single** process. See §6 for why not to use cluster mode.

`/etc/systemd/system/gridmind.service`:

```ini
[Unit]
Description=GridMind
After=network.target

[Service]
Type=simple
User=gridmind
WorkingDirectory=/srv/gridmind
ExecStart=/usr/bin/node app.js
Restart=always
RestartSec=5
# .env is read by dotenv from WorkingDirectory; no EnvironmentFile needed.

[Install]
WantedBy=multi-user.target
```

```sh
systemctl daemon-reload
systemctl enable --now gridmind
journalctl -u gridmind -f
```

`pm2 start app.js -i 1` works equally well. `-i 1` (fork mode) is not optional.

---

## 5. nginx

Four nginx defaults will break this application if left alone. Each `#` below marks one.

```nginx
server {
    listen 443 ssl http2;
    server_name gridmind.example.com;

    ssl_certificate     /etc/letsencrypt/live/gridmind.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gridmind.example.com/privkey.pem;

    # (1) Upload size. nginx defaults to 1m and rejects with 413 before the request ever
    #     reaches Node, while the application itself accepts MAX_UPLOAD_MB (default 40).
    #     Keep this above MAX_UPLOAD_MB so the application's own error message is the one
    #     the user sees.
    client_max_body_size 48m;

    location / {
        proxy_pass http://127.0.0.1:3000;

        # (2) HTTP/1.1 with keep-alive upstream. The default HTTP/1.0 + "Connection: close"
        #     cuts the ingest progress stream.
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # (3) Timeouts. The default proxy_read_timeout is 60s. Ingest converts the file
        #     before it starts streaming progress (MD_TIMEOUT_MS is 60s on its own), and
        #     during that window not one byte moves on the connection. Merge preview costs
        #     another 20-40s of silence. 60s is too close to the edge.
        proxy_read_timeout      300s;
        proxy_send_timeout      300s;
        proxy_request_buffering off;   # stream the upload through instead of spooling it

        # (4) Forwarded headers — TRUST_PROXY is meaningless without them.
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: serve static assets from disk instead of waking Node for them.
    # Must match app.js:21 (express.static on public/).
    location /css/   { alias /srv/gridmind/public/css/;   expires 7d; access_log off; }
    location /js/    { alias /srv/gridmind/public/js/;    expires 7d; access_log off; }
    location /fonts/ { alias /srv/gridmind/public/fonts/; expires 30d; access_log off; }
}

server {
    listen 80;
    server_name gridmind.example.com;
    return 301 https://$host$request_uri;
}
```

### Response buffering

`POST /notes/ingest` returns NDJSON: one JSON object per line, written as the AI works, so the
progress panel fills in live. `routes/notes.js:107-114` sets `X-Accel-Buffering: no` and calls
`res.flushHeaders()`, and nginx honours that header per response — so with the config above the
stream passes through unbuffered without a global `proxy_buffering off`.

If you add `gzip on` to this server block, exclude the stream. nginx's gzip filter buffers
independently of `proxy_buffering`, and compressing a trickle of small lines would stall the
progress display until the response ends:

```nginx
gzip on;
gzip_types text/html text/css application/javascript;   # not application/x-ndjson
```

The response also carries `Cache-Control: no-cache, no-transform`, which keeps any
intermediate cache from rewriting it.

---

## 6. Run exactly one Node process

Do not put several Node instances behind an nginx upstream group, and do not use pm2 cluster
mode or `node:cluster`. Three separate reasons:

1. **SQLite.** All data lives in one file (`db/kb.db`). Concurrent writers hit
   `SQLITE_BUSY`. The vector table written during ingest makes this likely, not theoretical.
2. **Session store.** `connect-sqlite3` puts sessions in `db/sessions.db` — same problem,
   and every login would contend with it.
3. **Python worker pool.** `services/ingest.js:22` sizes the pool at `min(4, cpus-1)` **per
   Node process**. Four Node workers means four pools, i.e. up to sixteen resident
   markitdown processes for the memory budget of four.

Scaling past one process would mean moving the data off SQLite first. That is deliberately out
of scope: a single file with no database server to install is part of why this stack was chosen.

---

## 7. Verifying a deployment

```sh
# Node is up and bound to loopback only
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login    # 200

# Public entry point terminates TLS and reaches Node
curl -s -o /dev/null -w '%{http_code}\n' https://gridmind.example.com/login   # 200

# The session cookie is marked secure (TRUST_PROXY + COOKIE_SECURE are working)
curl -sI https://gridmind.example.com/login | grep -i set-cookie

# Uploads larger than nginx's old default are not rejected at the proxy
head -c 5000000 /dev/urandom > /tmp/big.bin
curl -s -o /dev/null -w '%{http_code}\n' -F file=@/tmp/big.bin \
  https://gridmind.example.com/notes/ingest    # 302 to /login, never 413
```

Then, in a browser, run one real ingest and watch the progress panel. If the percentage jumps
straight from 0 to 100 at the end instead of climbing, the stream is being buffered somewhere —
recheck §5.

---

## 8. Backup

Two files hold everything that cannot be recreated:

```sh
sqlite3 /srv/gridmind/db/kb.db ".backup '/backup/kb-$(date +%F).db'"
```

`sessions.db` can be discarded — losing it logs everyone out and nothing more. `uploads/` is
scratch space and is swept automatically. `node_modules/` and the Python environment rebuild
from `package-lock.json` and `requirements.txt`.

Use `.backup` rather than `cp`: copying a SQLite file while a write is in flight can capture a
torn page.
