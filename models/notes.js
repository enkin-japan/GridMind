// ノート（知識条目）の CRUD。GridMind の中核 Model。すべて user_id で作用域を限定する。
const { run, get } = require('./db');
const tags = require('./tags');
const links = require('../services/links');
const relate = require('../services/relate');
const embed = require('../services/embed');
const embeddings = require('./embeddings');

// プレーンテキスト射影を作る（検索・関連づけ・ベクトル用）。Markdown 記号をざっくり除去。
// 自動でつけた「## 関連」セクションは、人が書いた内容ではないので先に取りのぞく
// （残すと、自分が足したリンクを次の判定で証拠として数えてしまう）。
function toPlainText(md = '') {
  return String(relate.stripRelatedSection(md))
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

// ノートの意味ベクトルを作って保存する。
// embedding を渡せばそれを使い、無ければここで作る（取り込みでは関連づけの時点で
// すでに作っているので、同じものを渡して二重に呼ばないようにする）。
// 失敗してもノート自体は守る（関連づけの精度が下がるだけ）。
async function saveVector(id, userId, note, embedding) {
  try {
    const e = embedding || (await embed.embed(embed.textForNote(note)));
    if (e) await embeddings.save(id, userId, e);
  } catch (e) {
    console.error('[notes] ベクトルの保存に失敗:', e.message);
  }
}

// 作成。作成後に [[リンク]] を解決する（同一ユーザーの範囲内で）。
// embedding: 取り込みの関連づけで作ったベクトルがあれば渡す（再生成を避けるため）。
async function create({ title, body_md = '', summary = null, source_type = 'paste', tagNames = [], userId, embedding = null }) {
  const ts = now();
  const body_text = toPlainText(body_md);
  const res = await run(
    `INSERT INTO notes (user_id, title, body_md, body_text, summary, source_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, title, body_md, body_text, summary, source_type, ts, ts]
  );
  const id = res.lastID;
  await tags.setForNote(id, tagNames);
  await links.syncForNote(id, body_md, userId);
  await links.resolveTitle(title, id, userId);
  await saveVector(id, userId, { title, summary, body_text, tags: tagNames }, embedding);
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
  // 本文が変わったのでベクトルも作り直す。
  await saveVector(id, userId, { title, summary, body_text: toPlainText(body_md), tags: tagNames }, null);
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
  await embeddings.remove(id);
  await run('DELETE FROM notes WHERE id = ?', [id]);
  return true;
}

async function count(userId) {
  const row = await get('SELECT COUNT(*) AS c FROM notes WHERE user_id = ?', [userId]);
  return row.c;
}

module.exports = { create, update, findById, remove, count, toPlainText };
