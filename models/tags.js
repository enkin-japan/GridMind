// タグの永続化。notes と多対多（note_tags 経由）。
const { run, get, all } = require('./db');

// タグ名から id を取得。無ければ作成して id を返す（find-or-create）。
async function ensure(name) {
  const clean = String(name).trim();
  if (!clean) return null;
  const found = await get('SELECT id FROM tags WHERE name = ?', [clean]);
  if (found) return found.id;
  const res = await run('INSERT INTO tags (name) VALUES (?)', [clean]);
  return res.lastID;
}

// あるノートのタグを名前の配列で置き換える。
async function setForNote(noteId, names = []) {
  await run('DELETE FROM note_tags WHERE note_id = ?', [noteId]);
  const unique = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  for (const name of unique) {
    const tagId = await ensure(name);
    if (tagId) {
      await run(
        'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
        [noteId, tagId]
      );
    }
  }
}

// あるノートのタグ名一覧を取得。
async function forNote(noteId) {
  const rows = await all(
    `SELECT t.name FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
      WHERE nt.note_id = ?
      ORDER BY t.name`,
    [noteId]
  );
  return rows.map((r) => r.name);
}

// あるユーザーのタグ一覧（本人のノートに付いたものだけを集計）。
async function list(userId) {
  const rows = await all(
    `SELECT t.name, COUNT(nt.note_id) AS count
       FROM tags t
       JOIN note_tags nt ON nt.tag_id = t.id
       JOIN notes n ON n.id = nt.note_id
      WHERE n.user_id = ?
      GROUP BY t.id ORDER BY count DESC, t.name`,
    [userId]
  );
  return rows;
}

module.exports = { ensure, setForNote, forNote, list };
