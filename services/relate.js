// 二次整理：新しい知識と既存ノートの関連度を求める（本人の範囲内）。
//
// スコア:
//   共通タグ数 * 3
// + タイトル言及（文字列がそのまま含まれる） 4
// + タイトル同士の共通語 * 2
// + 本文の語がよく重なる 2
// + 意味ベクトルの近さ 0〜5
//
// 【ベクトルだけで決めない理由】
// 実測すると、同じ授業の別の回の資料どうしでも類似度は 0.49〜0.86（中央値 0.63）あり、
// 「書き直された同じ知識」（0.61）と大きな差がつかなかった。分野が同じだと語彙が
// 似るためで、ベクトルだけでは「統合すべき」と「ただ関連している」を分けられない。
// そこで、ベクトルは「関連の発見」に使い、統合を勧める（対照ページを出す）には
// タグや見出しの語の一致という裏づけも求める形にしている。
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
const embed = require('./embed');
const embeddings = require('../models/embeddings');

const HIGH = 10;
const MEDIUM = 4;

// 【しきい値の考え方】
// HIGH は「対照ページを出して手を止めてもらう」合図なので、外すと迷惑になる。
// 一方 MEDIUM は [[リンク]] を足すだけで、外れても害がない。
// そこで HIGH は証拠がそろったときだけに絞り、迷う分は MEDIUM に寄せている。
//
// 実測（同じ授業の講義ノート5本・総当たり）:
//   類似度 0.50〜0.72、被覆率は最大 0.259（中央 0.106）
// つまり「同じ分野の別の話題」でもこのくらいは普通に出る。
// HIGH はこの範囲より明確に上でなければならない。

// 類似度からの加点。無関係 0.22 / 同じ分野の別トピック 0.50〜0.72 / ほぼ同一 0.85〜。
// 分野が同じだと語彙が似るので、類似度だけで HIGH にはしない。
function simBonus(sim) {
  if (sim >= 0.85) return 10; // ほぼ同一。これだけで対照ページを出してよい
  if (sim >= 0.6) return 3;
  if (sim >= 0.48) return 2;
  return 0;
}

// 被覆率からの加点。実測の「別トピック」上限 0.259 より明確に上の 0.45 を
// 「旧ノートは新しい方に入っている」の合図とする。
function containmentBonus(c) {
  if (c >= 0.45) return 10; // 旧ノートの中身はほぼ新しい方に含まれている
  if (c >= 0.3) return 4;
  if (c >= 0.2) return 2;
  return 0;
}

// 日本語は単語で区切られていないため、形態素解析の代わりに
// 「英数字の語」「カタカナの連なり」「漢字2文字ずつ」を語として取り出す。
//
// 漢字を「連なりまるごと」で見ると、たとえば「通信規約」と「通信方式」が
// 別語になってしまい、同じことを言い換えただけの文が一致しなくなる。
// 2文字ずつに割ると共通部分（通信）が拾えるので、言い換えに強くなる。
function terms(text) {
  const s = String(text || '');
  const out = new Set();
  for (const w of s.match(/[A-Za-z][A-Za-z0-9+#._-]*/g) || []) {
    if (w.length >= 2) out.add(w.toLowerCase());
  }
  for (const w of s.match(/[ァ-ヴー]{2,}/g) || []) out.add(w);
  for (const run of s.match(/[一-鿿]{2,}/g) || []) {
    for (let i = 0; i + 2 <= run.length; i += 1) out.add(run.slice(i, i + 2));
  }
  return out;
}

// 語の「珍しさ」の重み（IDF）を作る。
//
// そのまま語の一致数を数えると、「処理」「設定」「使用」のような
// どのノートにも出てくる語が点数を押し上げてしまい、同じ分野のノートが
// すべて「まとめるべき」に見えてしまう。
// 多くのノートに出てくる語ほど軽く、そのノートらしい語ほど重く数える。
function buildIdf(termSets) {
  const df = new Map();
  for (const set of termSets) {
    for (const t of set) df.set(t, (df.get(t) || 0) + 1);
  }
  const n = termSets.length;
  return (term) => Math.log((n + 1) / (1 + (df.get(term) || 0))) + 0.1;
}

// 旧ノートらしい語のうち、新しい知識にどれだけ入っているか（0〜1）。
// 「旧ノートの中身は新しい方に含まれている」＝まとめる価値がある、の判断に使う。
// 同じ分野でも扱う話題が違えば、珍しい語が一致しないので低いままになる。
function weightedContainment(oldTerms, newTerms, idf) {
  let total = 0;
  let shared = 0;
  for (const t of oldTerms) {
    const w = idf(t);
    total += w;
    if (newTerms.has(t)) shared += w;
  }
  return total ? shared / total : 0;
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
// opts.vec に作成済みの意味ベクトルを渡すと、作り直さずにそれを使う。
// （ベクトルはセッションに入れると大きいので、staged 本体には持たせない）
async function findRelated(userId, staged, opts = {}) {
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

  // 意味ベクトル。staged.vec があればそれを使う（取り込みで作った分を使いまわす）。
  // 作れなかった場合は語の重なりだけで判定する（動きは止めない）。
  let sVec = opts.vec || null;
  let vecMap = new Map();
  try {
    if (embed.ENABLED) {
      if (!sVec) {
        const e = await embed.embed(embed.textForNote({ title: sTitle, summary: staged.summary, body_text: sText, tags: sTags }));
        sVec = e ? e.vec : null;
      }
      if (sVec) vecMap = await embeddings.forUser(userId);
    }
  } catch (e) {
    console.error('[relate] ベクトルの読み込みに失敗:', e.message);
  }

  // 語の珍しさは「この人のノート全体」を見て決める。
  const noteTermSets = new Map();
  for (const note of map.values()) {
    noteTermSets.set(note.id, terms(note.title + ' ' + note.body_text + ' ' + note.tags.join(' ')));
  }
  const idf = buildIdf([...noteTermSets.values(), sBodyTerms]);

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

    // 意味の近さ（書き方が違っても内容が近ければ効く）。
    const nVec = sVec ? vecMap.get(note.id) : null;
    const sim = nVec ? embed.cosine(sVec, nVec) : 0;

    // 旧ノートの内容が新しい知識に含まれているか（まとめる価値の判断に効く）。
    const cover = weightedContainment(noteTermSets.get(note.id), sBodyTerms, idf);

    // 共通タグは弱めに数える。同じ分野のノートは分野名のタグを共有しやすく、
    // それだけで「まとめるべき」とは言えないため。
    const score =
      sharedTags * 2 +
      (mention ? 10 : 0) +
      titleShared * 2 +
      (bodyOverlap >= 0.12 ? 1 : 0) +
      simBonus(sim) +
      containmentBonus(cover);

    if (score >= MEDIUM) scored.push({ id: note.id, title: note.title, score, sim, cover });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// 自動でつけた関連リンクの見出し。
const RELATED_HEADING = '## 関連';

// 本文の末尾に「## 関連」セクションで [[タイトル]] を追記（重複は避ける）。
function addRelatedLinks(md, titles) {
  const uniq = [...new Set(titles)].filter(Boolean);
  const toAdd = uniq.filter((t) => !md.includes('[[' + t + ']]'));
  if (!toAdd.length) return md;
  const section = '\n\n' + RELATED_HEADING + '\n' + toAdd.map((t) => `- [[${t}]]`).join('\n') + '\n';
  return md.trimEnd() + section;
}

// 自動でつけた「## 関連」セクションを取りのぞく。
//
// これを残したまま判定に使うと、次のような回り込みが起きる：
//   自動リンクで [[Aのタイトル]] を本文に足す
//     → 本文の平文に「Aのタイトル」という文字列が現れる
//       → 次の判定で「タイトルがそのまま出てくる」と見なされ、点数が跳ね上がる
// 機械が足したものを、人が書いた証拠として数えてはいけない。
function stripRelatedSection(md) {
  const s = String(md || '');
  const i = s.lastIndexOf(RELATED_HEADING);
  return i === -1 ? s : s.slice(0, i).trimEnd();
}

module.exports = {
  findRelated, addRelatedLinks, stripRelatedSection, simBonus, terms,
  buildIdf, weightedContainment, // 調整・検証用
  HIGH, MEDIUM,
};
