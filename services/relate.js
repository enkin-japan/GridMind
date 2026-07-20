// 二次整理：新しい知識と既存ノートの関連度を求める（本人の範囲内、SQL のみ＝無料）。
// スコア: 共通タグ数 * 3 + タイトル言及(あれば) 4
//   HIGH  以上 → 対照ページ（ユーザーが 関連 or 統合 を選ぶ）
//   MEDIUM以上 → 自動で [[リンク]] を付ける
//   未満       → 何もしない
const { all } = require('../models/db');

const HIGH = 4;
const MEDIUM = 2;

// staged = { title, body_text, tags: [] }
async function findRelated(userId, staged) {
  const rows = await all(
    `SELECT n.id, n.title, n.body_text, t.name AS tag
       FROM notes n
       LEFT JOIN note_tags nt ON nt.note_id = n.id
       LEFT JOIN tags t ON t.id = nt.tag_id
      WHERE n.user_id = ?`,
    [userId]
  );

  // ノート単位にまとめる
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.id)) map.set(r.id, { id: r.id, title: r.title, body_text: r.body_text || '', tags: [] });
    if (r.tag) map.get(r.id).tags.push(r.tag);
  }

  const sTags = staged.tags || [];
  const sTitle = staged.title || '';
  const sText = staged.body_text || '';

  const scored = [];
  for (const note of map.values()) {
    const sharedTags = sTags.filter((t) => note.tags.includes(t)).length;
    const mention =
      (note.title.length >= 2 && sText.includes(note.title)) ||
      (sTitle.length >= 2 && note.body_text.includes(sTitle)) ||
      (sTitle.length >= 2 && note.title.length >= 2 && (sTitle.includes(note.title) || note.title.includes(sTitle)));
    const score = sharedTags * 3 + (mention ? 4 : 0);
    if (score >= MEDIUM) scored.push({ id: note.id, title: note.title, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// 本文の末尾に「## 関連」セクションで [[タイトル]] を追記（重複は避ける）。
function addRelatedLinks(md, titles) {
  const uniq = [...new Set(titles)].filter(Boolean);
  const toAdd = uniq.filter((t) => !md.includes('[[' + t + ']]'));
  if (!toAdd.length) return md;
  const section = '\n\n## 関連\n' + toAdd.map((t) => `- [[${t}]]`).join('\n') + '\n';
  return md.trimEnd() + section;
}

module.exports = { findRelated, addRelatedLinks, HIGH, MEDIUM };
