// ノートの意味ベクトルの保存・取り出し。生成そのものは services/embed.js が行う。
const { run, get, all } = require('./db');
const embed = require('../services/embed');

function nowJst() {
  const jst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
  return jst.replace(' ', 'T') + '+09:00';
}

// 1件保存（すでにあれば入れかえ）。
async function save(noteId, userId, e) {
  if (!e || !e.vec) return false;
  await run(
    `INSERT INTO embeddings (note_id, user_id, model, dim, vec, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(note_id) DO UPDATE SET
       model = excluded.model, dim = excluded.dim,
       vec = excluded.vec, updated_at = excluded.updated_at`,
    [noteId, userId, e.model, e.dim, embed.toBlob(e.vec), nowJst()]
  );
  return true;
}

async function remove(noteId) {
  await run('DELETE FROM embeddings WHERE note_id = ?', [noteId]);
}

// あるユーザーの全ベクトルを取り出す（関連づけの比較用）。
// 今のモデルと次元が合うものだけを返す（モデル変更後の作り直し待ちは無視する）。
async function forUser(userId) {
  const rows = await all(
    'SELECT note_id, vec, dim, model FROM embeddings WHERE user_id = ? AND model = ?',
    [userId, embed.MODEL]
  );
  const map = new Map();
  for (const r of rows) map.set(r.note_id, embed.fromBlob(r.vec));
  return map;
}

// まだベクトルが無い（またはモデルが古い）ノートを探す。作り直し用。
function missing(userId = null) {
  const sql = `
    SELECT n.id, n.title, n.summary, n.body_text, n.user_id
      FROM notes n
      LEFT JOIN embeddings e ON e.note_id = n.id AND e.model = ?
     WHERE e.note_id IS NULL
       ${userId ? 'AND n.user_id = ?' : 'AND n.user_id IS NOT NULL'}
     ORDER BY n.id`;
  return all(sql, userId ? [embed.MODEL, userId] : [embed.MODEL]);
}


module.exports = { save, remove, forUser, missing };
