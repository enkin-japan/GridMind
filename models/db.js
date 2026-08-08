// GridMind データアクセス基盤
// course 教材（第12章）の sqlite3 をそのまま採用し、callback を Promise でラップして
// async/await で扱えるようにする。スキーマの初期化も起動時にここで行う。
const path = require('path');
const sqlite3 = require('sqlite3');

const DB_PATH = path.join(__dirname, '..', 'db', 'kb.db');
const db = new sqlite3.Database(DB_PATH);

// --- Promise ラッパー ---
// run: INSERT / UPDATE / DELETE 用。this.lastID・this.changes を返す。
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
// get: 1件取得
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
// all: 複数件取得
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// あるテーブルに指定カラムが存在するか（マイグレーション判定用）。
async function columnExists(table, col) {
  const rows = await all(`PRAGMA table_info(${table})`);
  return rows.some((r) => r.name === col);
}

// --- スキーマ初期化 ---
// ARCHITECTURE.md §6 のデータモデルに対応。起動時に一度だけ実行する。
async function init() {
  // ユーザー（アカウント）。OpenAI の API キーはサービス側が持つので、ここには保存しない。
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan          TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro'
      out_lang      TEXT NOT NULL DEFAULT 'auto',  -- 既定の出力言語（ノートの中身）
      ui_lang       TEXT,                          -- 画面の言語。null なら毎回ブラウザから決める
      theme         TEXT NOT NULL DEFAULT 'auto',  -- 'auto' | 'light' | 'dark'
      stock         TEXT NOT NULL DEFAULT 'standard',    -- 片基（配色）
      density       TEXT NOT NULL DEFAULT 'comfortable', -- 余白の詰めかた
      perf          TEXT NOT NULL DEFAULT 'on',          -- 送り穴を出すか
      created_at    TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      body_md     TEXT,                        -- 整形済み Markdown（AI 整理後、または生テキスト）
      body_text   TEXT,                        -- 全文検索・将来の embedding 用のプレーンテキスト射影
      summary     TEXT,                        -- AI 要約（任意）
      source_type TEXT DEFAULT 'paste',        -- 'upload' | 'paste'
      src_chars   INTEGER,                     -- 取り込んだ資料の文字数（削った量を出すため）
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS tags (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL,
      tag_id  INTEGER NOT NULL,
      PRIMARY KEY (note_id, tag_id)
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS links (
      src_note_id    INTEGER NOT NULL,          -- リンク元ノート
      target_title   TEXT NOT NULL,             -- [[タイトル]] の生テキスト
      target_note_id INTEGER                    -- 一致するノートがあれば解決した id
    )
  `);
  // 利用実績（プランの上限判定と、費用の把握に使う）。
  // period は JST の "YYYY-MM"。月ごとの集計をここで行う。
  await run(`
    CREATE TABLE IF NOT EXISTS usage_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      period     TEXT NOT NULL,               -- 'YYYY-MM'（JST）
      kind       TEXT NOT NULL,               -- 'ingest' | 'merge'
      doc_chars  INTEGER DEFAULT 0,           -- 取り込んだ資料の文字数
      in_tokens  INTEGER DEFAULT 0,
      out_tokens INTEGER DEFAULT 0,
      calls      INTEGER DEFAULT 0,
      cached_in  INTEGER DEFAULT 0,           -- プロンプトキャッシュに当たった入力トークン
      cost_usd   REAL DEFAULT 0,                -- 実際にかかった費用（モデル別の価格で計算）
      created_at TEXT NOT NULL
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_usage_user_period ON usage_log (user_id, period)');

  // ノートの意味ベクトル（二次整理の関連づけに使う）。
  // vec は Float32 の並びを BLOB にしたもの。model と dim も持たせておき、
  // 後でモデルを変えたときに「作り直しが必要な行」を見分けられるようにする。
  await run(`
    CREATE TABLE IF NOT EXISTS embeddings (
      note_id    INTEGER PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      model      TEXT NOT NULL,
      dim        INTEGER NOT NULL,
      vec        BLOB NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings (user_id)');

  // --- マイグレーション：既存の notes に user_id を追加（マルチユーザー化）---
  if (!(await columnExists('notes', 'user_id'))) {
    await run('ALTER TABLE notes ADD COLUMN user_id INTEGER');
  }
  // --- マイグレーション：料金プラン（'free' | 'pro'）---
  if (!(await columnExists('users', 'plan'))) {
    await run("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'");
  }
  // --- マイグレーション：利用実績に費用を追加（モデルを使い分けるため）---
  if (!(await columnExists('usage_log', 'cost_usd'))) {
    await run('ALTER TABLE usage_log ADD COLUMN cost_usd REAL DEFAULT 0');
  }
  // --- マイグレーション：キャッシュ命中分（費用の内訳を見るため）---
  if (!(await columnExists('usage_log', 'cached_in'))) {
    await run('ALTER TABLE usage_log ADD COLUMN cached_in INTEGER DEFAULT 0');
  }
  // --- マイグレーション：既定の出力言語（'auto' | 'ja' | 'en' | 'zh' | 'ko'）---
  if (!(await columnExists('users', 'out_lang'))) {
    await run("ALTER TABLE users ADD COLUMN out_lang TEXT NOT NULL DEFAULT 'auto'");
  }
  // --- マイグレーション：画面の言語（null＝ブラウザに合わせる）---
  if (!(await columnExists('users', 'ui_lang'))) {
    await run('ALTER TABLE users ADD COLUMN ui_lang TEXT');
  }
  // --- マイグレーション：表示テーマ（既定はシステムに従う）---
  if (!(await columnExists('users', 'theme'))) {
    await run("ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'auto'");
  }
  // --- マイグレーション：見た目の好み（片基・密度・送り穴）---
  for (const [col, def] of [['stock', 'standard'], ['density', 'comfortable'], ['perf', 'on']]) {
    if (!(await columnExists('users', col))) {
      await run(`ALTER TABLE users ADD COLUMN ${col} TEXT NOT NULL DEFAULT '${def}'`);
    }
  }
  // --- マイグレーション：資料の元の文字数 ---
  // 「どれだけ削ったか」はこの製品の主張そのものなので、ノート側に控えておく。
  // 既存のノートは null のまま（分からないものを分かったふりに埋めない）。
  if (!(await columnExists('notes', 'src_chars'))) {
    await run('ALTER TABLE notes ADD COLUMN src_chars INTEGER');
  }
}

module.exports = { db, run, get, all, init };
