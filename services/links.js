// 双方向リンク（[[タイトル]]）とバックリンクの処理。すべて同一ユーザーの範囲内で解決する。
const { run, get, all } = require('../models/db');

// 本文中の [[タイトル]] を全部抜き出す。
function parseTitles(md = '') {
  const titles = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(md)) !== null) {
    const t = m[1].trim();
    if (t) titles.push(t);
  }
  return [...new Set(titles)];
}

// あるノートの links を作り直す。同一ユーザー内で既存タイトルと一致すれば target_note_id を解決。
async function syncForNote(srcNoteId, md = '', userId) {
  await run('DELETE FROM links WHERE src_note_id = ?', [srcNoteId]);
  for (const title of parseTitles(md)) {
    const target = await get('SELECT id FROM notes WHERE title = ? AND user_id = ?', [title, userId]);
    await run(
      'INSERT INTO links (src_note_id, target_title, target_note_id) VALUES (?, ?, ?)',
      [srcNoteId, title, target ? target.id : null]
    );
  }
}

// 新しいノートのタイトルが、同一ユーザーの未解決 [[リンク]] から参照されていれば解決する。
async function resolveTitle(title, noteId, userId) {
  await run(
    `UPDATE links SET target_note_id = ?
      WHERE target_title = ? AND target_note_id IS NULL
        AND src_note_id IN (SELECT id FROM notes WHERE user_id = ?)`,
    [noteId, title, userId]
  );
}

// このノートを指しているノート一覧（バックリンク、本人の範囲内）。
async function backlinks(noteId, userId) {
  return all(
    `SELECT DISTINCT n.id, n.title
       FROM links l JOIN notes n ON n.id = l.src_note_id
      WHERE l.target_note_id = ? AND n.user_id = ?
      ORDER BY n.updated_at DESC`,
    [noteId, userId]
  );
}

// 本文の [[タイトル]] を Markdown リンクに変換する（同一ユーザー内で解決）。
async function linkify(md = '', userId) {
  const titles = parseTitles(md);
  let out = md;
  for (const title of titles) {
    const target = await get('SELECT id FROM notes WHERE title = ? AND user_id = ?', [title, userId]);
    const href = target ? `/notes/${target.id}` : `/?q=${encodeURIComponent(title)}`;
    const label = target ? title : `${title}（未作成）`;
    out = out.split(`[[${title}]]`).join(`[${label}](${href})`);
  }
  return out;
}

module.exports = { parseTitles, syncForNote, resolveTitle, backlinks, linkify };
