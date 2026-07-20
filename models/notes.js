// ノート（知識条目）の CRUD。GridMind の中核 Model。すべて user_id で作用域を限定する。
const { run, get } = require('./db');
const tags = require('./tags');
const links = require('../services/links');

// プレーンテキスト射影を作る（検索・将来の embedding 用）。Markdown 記号をざっくり除去。
function toPlainText(md = '') {
  return String(md)
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/[#>*_~\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 東京時間(JST, UTC+9)の ISO 風タイムスタンプ "YYYY-MM-DDTHH:MM:SS+09:00"。
function now() {
  const jst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
  return jst.replace(' ', 'T') + '+09:00';
}

// 作成。作成後に [[リンク]] を解決する（同一ユーザーの範囲内で）。
async function create({ title, body_md = '', summary = null, source_type = 'paste', tagNames = [], userId }) {
  const ts = now();
  const res = await run(
    `INSERT INTO notes (user_id, title, body_md, body_text, summary, source_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, body_md, toPlainText(body_md), summary, source_type, ts, ts]
  );
  const id = res.lastID;
  await tags.setForNote(id, tagNames);
  await links.syncForNote(id, body_md, userId);
  await links.resolveTitle(title, id, userId);
  return id;
}

// 更新。所有権を確認してから行う。
async function update(id, { title, body_md = '', summary = null, tagNames = [] }, userId) {
  const owned = await get('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (!owned) return false; // 他人のノートは触らせない
  await run(
    `UPDATE notes SET title = ?, body_md = ?, body_text = ?, summary = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
    [title, body_md, toPlainText(body_md), summary, now(), id, userId]
  );
  await tags.setForNote(id, tagNames);
  await links.syncForNote(id, body_md, userId);
  await links.resolveTitle(title, id, userId);
  return true;
}

// 1件取得（本人のもののみ、タグ付き）。
async function findById(id, userId) {
  const note = await get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (!note) return null;
  note.tags = await tags.forNote(id);
  return note;
}

// 削除（本人のもののみ、関連も掃除）。
async function remove(id, userId) {
  const owned = await get('SELECT id FROM notes WHERE id = ? AND user_id = ?', [id, userId]);
  if (!owned) return false;
  await run('DELETE FROM note_tags WHERE note_id = ?', [id]);
  await run('DELETE FROM links WHERE src_note_id = ?', [id]);
  await run('UPDATE links SET target_note_id = NULL WHERE target_note_id = ?', [id]);
  await run('DELETE FROM notes WHERE id = ?', [id]);
  return true;
}

async function count(userId) {
  const row = await get('SELECT COUNT(*) AS c FROM notes WHERE user_id = ?', [userId]);
  return row.c;
}

module.exports = { create, update, findById, remove, count, toPlainText };
