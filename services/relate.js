// 二次整理：新しい知識と既存ノートの関連度を求める（本人の範囲内、SQL のみ＝無料）。
//
// スコア:
//   共通タグ数 * 3
// + タイトル言及（文字列がそのまま含まれる） 4
// + タイトル同士の共通語 * 2
// + 本文の語がよく重なる 2
//
//   HIGH  以上 → 対照ページ（ユーザーが 関連 or 統合 を選ぶ）
//   MEDIUM以上 → 自動で [[リンク]] を付ける
//   未満       → 何もしない
//
// 【なぜ語の重なりを見るか】
// AI がタイトルやタグを整えて書き直すため、「HTTP基礎」と「HTTPとHTTPSの基本」のように
// 内容は近いのに文字列としては一致しない組み合わせが普通に起きる。
// 文字列の一致だけを見ていると、関連づけがほとんど働かなくなってしまう。
const { all } = require('../models/db');

const HIGH = 4;
const MEDIUM = 2;

// 日本語は単語で区切られていないため、形態素解析の代わりに
// 「英数字の語」「カタカナの連なり」「漢字の連なり」を語として取り出す。
function terms(text) {
  const s = String(text || '');
  const out = new Set();
  for (const w of s.match(/[A-Za-z][A-Za-z0-9+#._-]*/g) || []) {
    if (w.length >= 2) out.add(w.toLowerCase());
  }
  for (const w of s.match(/[ァ-ヴー]{2,}/g) || []) out.add(w);
  for (const w of s.match(/[一-鿿]{2,}/g) || []) out.add(w);
  return out;
}

function sharedCount(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

// 二つの語集合の重なり具合（Jaccard 係数）。
function overlapRatio(a, b) {
  if (!a.size || !b.size) return 0;
  const shared = sharedCount(a, b);
  return shared / (a.size + b.size - shared);
}

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

  // 新しい知識側の語をあらかじめ用意しておく（ノートごとに作り直さない）。
  const sTitleTerms = terms(sTitle);
  const sBodyTerms = terms(sTitle + ' ' + sText + ' ' + sTags.join(' '));

  const scored = [];
  for (const note of map.values()) {
    // タグが同じ（AI が同じ言葉を選んだ場合）
    const sharedTags = sTags.filter((t) => note.tags.includes(t)).length;

    // タイトルがそのまま本文に出てくる（もっとも強い手がかり）
    const mention =
      (note.title.length >= 2 && sText.includes(note.title)) ||
      (sTitle.length >= 2 && note.body_text.includes(sTitle)) ||
      (sTitle.length >= 2 && note.title.length >= 2 && (sTitle.includes(note.title) || note.title.includes(sTitle)));

    // 書き直されて文字列が一致しない場合に備え、語の重なりも見る。
    const titleShared = sharedCount(sTitleTerms, terms(note.title));
    const bodyOverlap = overlapRatio(sBodyTerms, terms(note.title + ' ' + note.body_text + ' ' + note.tags.join(' ')));

    const score =
      sharedTags * 3 +
      (mention ? 4 : 0) +
      titleShared * 2 +
      (bodyOverlap >= 0.12 ? 2 : 0);

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
