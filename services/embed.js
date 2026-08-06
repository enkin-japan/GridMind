// ベクトル（埋め込み）の生成と比較。
//
// 二次整理の関連づけは、もともと「文字列がそのまま含まれるか」で判定していた。
// しかし AI が見出しや言葉づかいを整えて書き直すため、内容は近いのに文字列は
// 一致しない、という組み合わせが普通に起きる（例：「HTTP基礎」と「HTTPとHTTPSの基本」）。
// 文章の意味をベクトルにして角度を比べれば、書き方が違っても近さが分かる。
//
// API キーは整理用と同じものを使う（chat と embeddings は同じアカウントの別の窓口）。
// 料金は text-embedding-3-small で 100万トークンあたり $0.02 と非常に安い。
const OpenAI = require('openai');

const SERVER_KEY = process.env.OPENAI_API_KEY || null;
const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
// 埋め込みを使わずに動かしたいとき（開発中や API を止めたいとき）は 0 にする。
const ENABLED = process.env.EMBEDDING_ENABLED !== '0';
// 1件あたりに渡す文字数の上限（長すぎる本文は先頭だけで十分に特徴が出る）。
const MAX_CHARS = Number(process.env.EMBEDDING_MAX_CHARS) || 8000;

function clientFor(key) {
  const k = key || SERVER_KEY;
  if (!k) throw new Error('NO_KEY');
  return new OpenAI({ apiKey: k });
}

// ノートからベクトルの元になる文章を作る（見出しと要約は特徴が強いので前に置く）。
function textForNote({ title = '', summary = '', body_text = '', body_md = '', tags = [] }) {
  const body = body_text || String(body_md);
  return [title, (tags || []).join(' '), summary || '', body]
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_CHARS);
}

// 文章をベクトルにする。使えないときは null を返す（呼び出し側は従来の判定に落ちる）。
// 戻り値: { vec: Float32Array, model, dim, usage } | null
async function embed(text, { key } = {}) {
  if (!ENABLED) return null;
  const input = String(text || '').slice(0, MAX_CHARS).trim();
  if (!input) return null;
  try {
    const res = await clientFor(key).embeddings.create({ model: MODEL, input });
    const arr = res.data[0].embedding;
    return {
      vec: Float32Array.from(arr),
      model: MODEL,
      dim: arr.length,
      usage: { input: (res.usage && res.usage.prompt_tokens) || 0, output: 0, calls: 1 },
    };
  } catch (e) {
    // ベクトルが作れなくてもノートの保存は続ける（関連づけの精度が下がるだけ）。
    console.error('[embed] ベクトル生成に失敗:', e.message);
    return null;
  }
}

// 複数まとめて生成する（1回のリクエストに複数入れられるので、まとめた方が速く安い）。
// 戻り値: 入力と同じ並びの配列（失敗した要素は null）。
async function embedMany(texts, { key, batchSize = 64 } = {}) {
  if (!ENABLED) return texts.map(() => null);
  const out = new Array(texts.length).fill(null);
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize).map((t) => String(t || '').slice(0, MAX_CHARS).trim() || ' ');
    try {
      const res = await clientFor(key).embeddings.create({ model: MODEL, input: slice });
      for (const item of res.data) {
        const arr = item.embedding;
        out[i + item.index] = { vec: Float32Array.from(arr), model: MODEL, dim: arr.length };
      }
    } catch (e) {
      console.error(`[embed] まとめて生成に失敗 (${i}〜):`, e.message);
    }
  }
  return out;
}

// --- 保存形式の変換 ---
// SQLite には BLOB（Float32 の並び）として入れる。1536次元で約6KB。
function toBlob(vec) {
  const f = vec instanceof Float32Array ? vec : Float32Array.from(vec);
  return Buffer.from(f.buffer, f.byteOffset, f.byteLength);
}

function fromBlob(buf) {
  if (!buf) return null;
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  // Buffer の一部を共有している場合があるので、境界をそろえてから読む。
  const copy = Buffer.from(b);
  return new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4);
}

// コサイン類似度（-1〜1。実際には 0〜1 の範囲に収まる）。
// OpenAI のベクトルは長さ1に正規化されているため内積だけでよいが、
// 念のため長さでも割っておく。
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { embed, embedMany, textForNote, toBlob, fromBlob, cosine, MODEL, ENABLED };
