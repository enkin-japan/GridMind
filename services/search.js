// 検索の抽象化レイヤ。ARCHITECTURE.md §7 の seam。
//   mode 'keyword'  : SQL LIKE（course 第12章）— MVP で実装
//   mode 'semantic' : embedding + コサイン類似度 — DEFERRED（未実装）
const { all } = require('../models/db');
const tags = require('../models/tags');

const PAGE_SIZE = 8;

// LIKE では % と _ が「なんでも一致」の記号として働くため、
// 検索語に含まれていたらただの文字として扱わせる。
// これをしないと「100%」で検索したときに、%が何にでも当たってしまう。
function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, (m) => '\\' + m);
}

// キーワード検索（タイトルと本文に部分一致）＋ タグ絞り込み（完全一致）＋ ページネーション。
// 必ず userId で作用域を限定する。
async function keyword({ q = '', tag = '', page = 1, userId } = {}) {
  const where = ['n.user_id = ?'];
  const params = [userId];

  if (q) {
    where.push("(n.title LIKE ? ESCAPE '\\' OR n.body_text LIKE ? ESCAPE '\\')");
    const like = `%${escapeLike(q)}%`;
    params.push(like, like);
  }
  if (tag) {
    where.push(
      `n.id IN (SELECT nt.note_id FROM note_tags nt
                  JOIN tags t ON t.id = nt.tag_id WHERE t.name = ?)`
    );
    params.push(tag);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await all(
    `SELECT COUNT(*) AS c FROM notes n ${whereSql}`,
    params
  );
  const total = countRow[0].c;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const offset = (current - 1) * PAGE_SIZE;

  const rows = await all(
    `SELECT n.id, n.title, n.summary, n.out_lang, n.created_at
       FROM notes n ${whereSql}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, PAGE_SIZE, offset]
  );

  // カード表示用にタグも付ける
  for (const r of rows) r.tags = await tags.forNote(r.id);

  return { rows, total, page: current, pages };
}

// 公開 API：mode で分岐（今は keyword のみ）。
async function search(opts = {}) {
  const mode = opts.mode || 'keyword';
  if (mode === 'semantic') {
    // DEFERRED: 実装時はここに embedding + コサイン類似度を追加する。
    throw new Error('semantic search is not implemented yet (deferred)');
  }
  return keyword(opts);
}

module.exports = { search, keyword, PAGE_SIZE };
