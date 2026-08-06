// OpenAI を使ったドキュメント整理サービス。
//
// 【方針】
//  ・API キーはサービス側（サーバ）が持つ。利用者はキーを意識しない。
//  ・長い資料は分割して抽出し、最後に1つへまとめ直す（取りこぼしを無くすため）。
//  ・出力言語は選べる（原文のまま／日本語／英語／中国語…）。指示だけに頼らず、
//    出力後に言語を判定して、違っていれば1回だけ強く言い直させる。
//  ・使用量（トークン数）を呼び出し側へ返す。プラン・上限の管理に使う。
const OpenAI = require('openai');

// サービス側の既定キーとモデル。
const SERVER_KEY = process.env.OPENAI_API_KEY || null;
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
// まとめ直し（と単発整理）に使うモデル。
// 図の多い資料では文字の取り出しが崩れ、ラベルと数値が入れちがったまま
// もっともらしい文が出てくる。これに気づけるかはモデルの力に依るため、
// 最後の1回だけ上位モデルを使えるようにしておく（入力は抽出済みの知識点だけなので安い）。
const FINAL_MODEL = process.env.AI_FINAL_MODEL || null;

// モデルごとの価格（100万トークンあたりの米ドル）。
// 抽出とまとめ直しで別のモデルを使えるようにしたため、トークン数だけでは
// 費用が出せない。ここで実際の金額まで計算して記録する。
const PRICES = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
  'gpt-4.1': { in: 2, out: 8 },
};
const FALLBACK_PRICE = { in: 0.15, out: 0.6 };

function priceOf(model) {
  return PRICES[model] || PRICES[String(model).replace(/-\d{4}-\d{2}-\d{2}$/, '')] || FALLBACK_PRICE;
}

// 1回の呼び出しに入れる本文の上限。これを超える資料は分割して処理する。
const CHUNK_SIZE = Number(process.env.AI_CHUNK_SIZE) || 12000;
// この長さ以下なら分割せず1回で処理する（分割の手間とコストを避ける）。
const SINGLE_CALL_LIMIT = Number(process.env.AI_SINGLE_LIMIT) || 15000;
// 受けつける資料の最大文字数（プランごとの上限は quota 側でさらに絞る）。
const MAX_DOC_CHARS = Number(process.env.AI_MAX_DOC_CHARS) || 60000;
// 断片を同時に何本まで投げるか（レート制限を避けつつ待ち時間を短くする）。
const CHUNK_CONCURRENCY = Number(process.env.AI_CHUNK_CONCURRENCY) || 3;

// 同時実行数を制限しながら map する（結果は元の順番を保つ）。
async function mapWithLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(runners);
  return out;
}

// 本文を書かせる呼び出しの末尾に付ける、短い確認事項。
// 規則をシステムプロンプトに足すほど、後ろの方の指示が守られにくくなる。
// 見落としやすいものだけを、いちばん最後にもう一度置いて効かせる。
const TAIL_CHECKLIST = [
  '',
  'Before you answer, check these three things:',
  '1. Every line states a fact a reader could learn. Delete agenda, task instructions, and topic-only pointers.',
  '2. No fragment, and no number that contradicts another number in the same note. When two figures cannot both be true, keep only one.',
  '3. No LaTeX delimiters. Write formulas as plain text.',
].join('\n');

// 見出しの下に内容が1つしかないセクションは、見出しを外す。
//
// 「1項目だけの見出しを作るな」と指示しても守られないことが多いため、
// 出力を受け取ってから機械的に直す。見た目の規則は、頼むより直した方が確実。
function tidyHeadings(md) {
  const lines = String(md).split('\n');
  const blocks = [];
  let cur = { heading: null, lines: [] };
  for (const line of lines) {
    if (/^#{2,6}\s+\S/.test(line)) {
      blocks.push(cur);
      cur = { heading: line, lines: [] };
    } else {
      cur.lines.push(line);
    }
  }
  blocks.push(cur);

  // 入れ子でない（行頭が空白でない）中身の行を数える。
  const contentCount = (ls) => ls.filter((l) => l.trim() && !/^\s/.test(l)).length;

  const out = [];
  for (const b of blocks) {
    if (b.heading && contentCount(b.lines) >= 2) out.push(b.heading);
    // 見出しを外す場合も中身はそのまま残す（知識は消さない）。
    out.push(...b.lines);
  }

  // 見出しを外すと箇条書きの間に空行が残る。そのままだと Markdown が
  // 「ゆるいリスト」として各項目を段落で包み、かえって間延びして見えるので詰める。
  const isBullet = (l) => /^[-*]\s+\S/.test(l || '');
  const tight = [];
  for (let i = 0; i < out.length; i += 1) {
    const line = out[i];
    if (!line.trim()) {
      const prev = tight[tight.length - 1];
      let j = i;
      while (j < out.length && !out[j].trim()) j += 1;
      if (isBullet(prev) && isBullet(out[j])) continue; // 箇条書き同士の間の空行は落とす
    }
    tight.push(line);
  }
  return tight.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// 応答全体が ```markdown ... ``` で包まれていた場合に外す。
function stripFence(text) {
  const t = String(text).trim();
  const m = t.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
  return m ? m[1] : t;
}

// 出力言語の選択肢。auto は「原文と同じ言語」。
const LANGUAGES = {
  auto: { label: '原文のまま', instruction: null, code: null },
  ja: { label: '日本語', instruction: 'Japanese (日本語)', code: 'ja' },
  en: { label: 'English', instruction: 'English', code: 'en' },
  zh: { label: '简体中文', instruction: 'Simplified Chinese (简体中文)', code: 'zh' },
  ko: { label: '한국어', instruction: 'Korean (한국어)', code: 'ko' },
};

// ---------------------------------------------------------------------------
// プロンプト部品
// ---------------------------------------------------------------------------

// 何を「知識」とみなすか／何を捨てるか。
const EXTRACTION_RULES = [
  'EXTRACT — this counts as "knowledge":',
  '- Definitions, concepts, meanings of terms',
  '- Principles, mechanisms, theories',
  '- Methods, procedures, algorithms, syntax, commands',
  '- Facts, data, figures, classifications',
  '- Relationships and comparisons between things',
  '',
  'EXCLUDE — never put this in the body; this is NOT knowledge, it is noise:',
  '- Instructional/course meta: learning objectives, aims, teaching goals',
  '- Assessment/grading: grading criteria, evaluation methods, how/when to submit assignments, deadlines, attendance rules',
  '- Administrative/logistics: schedules, agendas, announcements, class-operation procedures, room numbers, instructor/presenter names, textbook purchase instructions',
  '- Document furniture: page numbers, tables of contents, cover pages, greetings, filler such as "today\'s summary", copyright, navigation',
  '- Agenda and progress talk: "today we review X", "this session covers Y", "let\'s practice Z", "we will now look at W", announcements about exercises or lab work',
  '- Exercise/assignment framing: problem statements, task instructions the reader must carry out, required output strings of an exercise, sample data invented only for an exercise',
  '  (If a worked example demonstrates a technique, keep the TECHNIQUE and its code — never the task description around it.)',
  '- In short, anything that serves the DELIVERER\'s convenience rather than being knowledge to be learned',
].join('\n');

// 書き終えたあとに自分で見直させるための最終チェック。
// 抽出の段階だけでは必ず取りこぼしが出るので、出力直前にもう一度ふるいにかける。
const FINAL_FILTER_RULES = [
  'FINAL CHECK — before answering, re-read your own draft and DELETE every line that is:',
  '- agenda or progress talk ("we review X", "this session covers Y", "an announcement was made")',
  '- an instruction telling the reader to do something (create a project, install X, implement Y yourself)',
  '- an exercise/assignment description, or an output string required by an exercise',
  '- a pointer that names a topic without stating the fact itself',
  '- a fragment, or a statement whose numbers/units are implausible',
  '- otherwise not knowledge (logistics, grading, schedule, presenter, page furniture)',
  'Then check the headings: if a section is left with only ONE point, remove that heading and',
  'merge the point into a related section (or drop the heading entirely if the note is short).',
  'Then output only what remains. Deleting such lines is REQUIRED, not optional.',
].join('\n');

// 資料が図中心のスライドだと、文字の取り出しが崩れて断片や桁の壊れた数字が混ざる。
// モデルはそれを「作り話」ではなく「忠実な転記」として書いてしまうため、
// 明らかにおかしいものは書かずに捨てるよう、はっきり指示する。
const COHERENCE_RULES = [
  'SOURCE MAY BE GARBLED — the text was extracted from slides and can be broken:',
  '- If a sentence is fragmentary, incoherent, or cut off mid-thought, DROP it. Never present a fragment as a complete fact.',
  '- If a number, unit, or magnitude is implausible for what it describes (a national budget in the millions, a percentage above 100, a truncated figure), DROP that statement. Do NOT repair it by guessing the intended value.',
  '- Cross-check numbers against each other. If the same quantity appears twice with magnitudes that cannot both be true',
  '  (e.g. one line says a national budget is 106兆6097億円 and another says it is 8億4700万円), keep only the line that is',
  '  consistent with the rest of the note and DELETE the other. Never keep both.',
  '- Being faithful to broken text is NOT a virtue here. A missing point is better than a wrong one.',
].join('\n');

// 「話題を挙げただけ」の中身のない項目を禁じる。
const POINT_QUALITY_RULES = [
  'POINT QUALITY — every single line must carry the knowledge itself:',
  '- FORBIDDEN: pointer-style points that name a topic without stating the fact.',
  '  Bad: "how to display an array with a loop" / "there are two output methods" / "about variables"',
  '  Good: "配列は for 文で index 0 から .length-1 まで回して表示する" / "出力方法は document.write() と getElementById().innerHTML の2つ"',
  '- FORBIDDEN: points whose only content is that something was explained, reviewed, announced, or practised.',
  '- If a statement in the source is too vague to teach anything concrete, drop it rather than transcribing it.',
  '- A reader who has never seen the source must be able to learn from the line alone.',
].join('\n');

// 取りこぼしと、逆に「盛りすぎ」の両方を禁じる。
const FIDELITY_RULES = [
  'FIDELITY — completeness without invention:',
  '- Capture EVERY distinct knowledge point present in the source. Missing a real point is the worst failure.',
  '- NEVER add, infer, generalize, or explain beyond what the source actually states. Do not bring in outside knowledge.',
  '- Do not "improve" the source: no extra examples, no added background, no advice, no opinions.',
  '- If the source has little knowledge, the note MUST be correspondingly short. Do not lengthen it artificially.',
  '- Keep code, commands, syntax and numbers exactly as written in the source.',
].join('\n');

// 「密度」の指示。GPT は放っておくと1文1行の水増しレイアウトを作るため、強く縛る。
const DENSITY_RULES = [
  'FORMAT — the note must be information-DENSE. Wasted lines are a failure:',
  '- Use the tightest structure that fits the content: a Markdown table for parallel or comparable facts, a flat list otherwise. Nest at most 2 levels.',
  '- One bullet = one complete, self-contained fact. Write it as a compact phrase, not a padded sentence.',
  '- Merge closely related facts into a single bullet instead of repeating the same stem across several bullets.',
  '- Use a heading ONLY when it groups 2 or more distinct points. Never emit an empty or near-empty section.',
  '- FORBIDDEN sections: "Introduction", "Overview", "Background", "Summary", "Conclusion", "In closing", or any section that only restates other sections.',
  '- No preamble, no closing remarks, no meta commentary about the note itself.',
  '- Never state the same fact twice in different words.',
  '- Prefer "term — short definition" lines over prose paragraphs.',
  '- Do not insert decorative blank lines; one blank line between blocks is enough.',
  '- Formulas: write them in plain text (sin^2 θ + cos^2 θ = 1) or inline code. NEVER use LaTeX',
  '  delimiters such as \\( \\), \\[ \\], or $$ — the reader\'s view does not render LaTeX and they show as-is.',
].join('\n');

// 出力言語の指示文を作る。
function languageRule(langKey) {
  const lang = LANGUAGES[langKey] || LANGUAGES.auto;
  if (!lang.instruction) {
    return [
      'LANGUAGE:',
      '- Do NOT translate. Write the output in the SAME language as the source document.',
    ].join('\n');
  }
  return [
    'LANGUAGE — this is a hard requirement:',
    `- Write the ENTIRE output (title, body, summary, tags) in ${lang.instruction}, regardless of the source language.`,
    '- Translate the knowledge faithfully; do not drop or add content while translating.',
    '- Keep code, commands, file names, and identifiers exactly as in the source (do not translate them).',
    `- Technical terms: give the ${lang.instruction} term, and keep the original term in parentheses on first use when it is commonly used that way.`,
    `- Not a single sentence may remain in the source language. Everything must be ${lang.instruction}.`,
  ].join('\n');
}

// 1回で処理する場合のプロンプト（本文だけを Markdown で出させる）。
// 本文を JSON の中に入れると、モデルが途中でオブジェクトを閉じてしまい
// 「JSON としては正しいが中身が切れている」状態を検知できないため、本文は素のテキストで受け取る。
function singleBodyPrompt(langKey) {
  return [
    'You are a strict knowledge-extraction assistant for a personal knowledge base.',
    'From the given text, extract ONLY the substantive knowledge worth studying or referencing later, and organize it into a clean, structured Markdown note body.',
    '',
    EXTRACTION_RULES,
    '',
    FIDELITY_RULES,
    '',
    COHERENCE_RULES,
    '',
    POINT_QUALITY_RULES,
    '',
    DENSITY_RULES,
    '',
    languageRule(langKey),
    '',
    'STRUCTURE:',
    '- If there are 8 or more points, group them under 3-8 topical "##" headings, ordered logically.',
    '- Never leave a long flat list ungrouped; never create a heading for a single point.',
    '',
    'EDGE CASE:',
    '- If there is essentially no extractable knowledge, output nothing at all (an empty answer).',
    '- Even then, NEVER copy the noise (announcements, objectives, grading, logistics) into the body. Leaving noise in the body is a failure.',
    '- Preserve any existing [[...]] wiki-link notation.',
    '',
    FINAL_FILTER_RULES,
    '',
    'Output the note body as raw Markdown only. No JSON, no title line, no commentary, no code fence around the whole answer.',
  ].join('\n');
}

// 本文から見出し・要約・タグだけを作る（出力が小さいので JSON で安全に受け取れる）。
function metaPrompt(langKey) {
  return [
    'You are a knowledge-base indexer. You are given the finished body of one knowledge note.',
    'Produce only its metadata. Do not rewrite or judge the body.',
    '',
    languageRule(langKey),
    '',
    'Return ONLY a JSON object with exactly these keys:',
    '  "title":   a short, specific title naming what the note is about (no generic words like "Notes" or "Summary")',
    '  "summary": ONE compact sentence naming the actual topics covered.',
    '             FORBIDDEN meta phrasing: "This note contains...", "...についての情報をまとめたものです", "本笔记整理了...".',
    '             Write the topics directly, e.g. "変数・演算子・条件分岐・繰り返し・配列の基本文法".',
    '  "tags":    3-6 short content tags (topic words only, no generic tags like "勉強" or "メモ")',
  ].join('\n');
}

// 分割処理の第1段：断片から知識点だけを拾う（整形はまだしない）。
function chunkPrompt(langKey) {
  return [
    'You are a strict knowledge-extraction assistant.',
    'You are given ONE PART of a longer document. Extract every knowledge point contained in THIS PART.',
    '',
    EXTRACTION_RULES,
    '',
    FIDELITY_RULES,
    '',
    COHERENCE_RULES,
    '',
    POINT_QUALITY_RULES,
    '',
    'OUTPUT FORMAT for this stage:',
    '- Output a flat Markdown list of knowledge points, one point per line, each a compact self-contained phrase.',
    '- Keep code/commands/numbers verbatim, inside fenced blocks when they span lines.',
    '- Do NOT write headings, introductions, or conclusions at this stage.',
    '- Do NOT mention that this is a part of a document, and do not refer to page or slide numbers.',
    '- If this part contains no knowledge, output nothing at all.',
    '',
    languageRule(langKey),
    '',
    'Output the raw Markdown list only. No JSON, no code fence around the whole answer, no commentary.',
  ].join('\n');
}

// 分割処理の第2段：拾い集めた知識点を1つのノートにまとめ直す。
function consolidatePrompt(langKey) {
  return [
    'You are a strict knowledge-base editor.',
    'You are given knowledge points extracted from consecutive parts of ONE document. Organize them into a single coherent note.',
    '',
    'RULES:',
    '- Keep EVERY distinct knowledge point. Removing a real point is a failure.',
    '- Remove exact and near duplicates that appear across parts (the parts overlap slightly).',
    '- NEVER add, infer, or explain anything that is not in the given points.',
    '',
    'The earlier stage was imperfect, so filter again now.',
    FINAL_FILTER_RULES,
    '',
    COHERENCE_RULES,
    '',
    POINT_QUALITY_RULES,
    '',
    'STRUCTURE:',
    '- If there are 8 or more points, group them under 3-8 topical "##" headings, ordered logically.',
    '- Never leave a long flat list ungrouped; never create a heading for a single point.',
    '',
    DENSITY_RULES,
    '',
    languageRule(langKey),
    '',
    'Preserve any existing [[...]] wiki-link notation.',
    '',
    'Output the note body as raw Markdown only. No JSON, no title line, no commentary, no code fence around the whole answer.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 言語判定（出力が指定どおりの言語かを機械的に確かめる）
// ---------------------------------------------------------------------------
function detectLang(text) {
  // コードブロック・リンク記法・URL は判定から除く（英字が多く出て誤判定するため）。
  const t = String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const kana = (t.match(/[぀-ゟ゠-ヿ]/g) || []).length;
  const han = (t.match(/[一-鿿]/g) || []).length;
  const hangul = (t.match(/[가-힯]/g) || []).length;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  const total = kana + han + hangul + latin;
  if (total < 20) return 'unknown'; // 短すぎて判定できない
  if (hangul / total > 0.15) return 'ko';
  if (kana / total > 0.05) return 'ja'; // かなが混じるのは日本語だけ
  if (han / total > 0.15) return 'zh';
  if (latin / total > 0.6) return 'en';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// OpenAI 呼び出しの共通処理
// ---------------------------------------------------------------------------
function clientFor(key) {
  const k = key || SERVER_KEY;
  if (!k) throw new Error('NO_KEY');
  return new OpenAI({ apiKey: k });
}

// モデルを1回呼ぶ低レベル関数。出力が長さ上限で切られたかどうかも返す。
async function callRaw({ key, model, system, user, maxTokens, json }) {
  const client = clientFor(key);
  const res = await client.chat.completions.create({
    model: model || DEFAULT_MODEL,
    temperature: 0.1,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const choice = res.choices[0];
  const u = res.usage || {};
  const used = model || DEFAULT_MODEL;
  return {
    text: choice.message.content || '',
    // finish_reason が 'length' なら出力が途中で切られている。
    truncated: choice.finish_reason === 'length',
    usage: {
      input: u.prompt_tokens || 0,
      output: u.completion_tokens || 0,
      calls: 1,
      byModel: { [used]: { input: u.prompt_tokens || 0, output: u.completion_tokens || 0, calls: 1 } },
    },
  };
}

// JSON モードで呼び出す。
// 出力が長さ上限で切れると JSON が壊れて丸ごと失われるため、
// 切れていたら上限を増やして1回だけやり直す。
async function callJson({ key, model, system, user, maxTokens = 6000 }) {
  let usage = ZERO_USAGE;
  let lastErr = null;

  for (const limit of [maxTokens, Math.min(maxTokens * 2, 16000)]) {
    const r = await callRaw({ key, model, system, user, maxTokens: limit, json: true });
    usage = addUsage(usage, r.usage);
    if (!r.truncated) {
      try {
        return { json: JSON.parse(r.text), usage };
      } catch (e) {
        lastErr = e; // 壊れた JSON。上限を上げて再試行する。
        continue;
      }
    }
    lastErr = new Error('OUTPUT_TRUNCATED');
    console.warn(`[ai] 出力が上限(${limit})で切れました。上限を上げて再試行します。`);
  }
  throw lastErr || new Error('JSON_FAILED');
}

// 素のテキストで呼び出す（分割抽出の第1段で使う）。
// JSON にしないので、途中で切れても「そこまでの知識点」は使える＝全滅しない。
async function callText({ key, model, system, user, maxTokens = 8000 }) {
  const r = await callRaw({ key, model, system, user, maxTokens, json: false });
  if (r.truncated) console.warn('[ai] 断片の抽出が上限で切れました（途中までを採用します）。');
  return r;
}

function addUsage(a, b) {
  const byModel = { ...(a.byModel || {}) };
  for (const [m, u] of Object.entries(b.byModel || {})) {
    const cur = byModel[m] || { input: 0, output: 0, calls: 0 };
    byModel[m] = { input: cur.input + u.input, output: cur.output + u.output, calls: cur.calls + u.calls };
  }
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    calls: a.calls + b.calls,
    byModel,
  };
}

const ZERO_USAGE = { input: 0, output: 0, calls: 0, byModel: {} };

// モデル別の内訳から実際の費用（米ドル）を求める。
function costOf(usage) {
  let total = 0;
  for (const [model, u] of Object.entries((usage && usage.byModel) || {})) {
    const p = priceOf(model);
    total += (u.input * p.in + u.output * p.out) / 1e6;
  }
  return total;
}

// ---------------------------------------------------------------------------
// 長い資料の分割
// ---------------------------------------------------------------------------
// 見出しや空行の切れ目を優先して、CHUNK_SIZE 前後の断片に分ける。
// 文脈が途切れないよう、断片の末尾を少しだけ次へ重ねる。
function splitIntoChunks(text, size = CHUNK_SIZE) {
  const lines = String(text).split('\n');
  const chunks = [];
  let cur = '';

  for (let line of lines) {
    // 1行が長すぎる場合は強制的に切る。
    while (line.length > size) {
      if (cur) {
        chunks.push(cur);
        cur = '';
      }
      chunks.push(line.slice(0, size));
      line = line.slice(size);
    }
    const isHeading = /^#{1,6}\s/.test(line);
    // ある程度たまっていて、ちょうど見出しに来たら区切る（意味のまとまりを保つ）。
    if (cur && isHeading && cur.length >= size * 0.6) {
      chunks.push(cur);
      cur = '';
    } else if (cur.length + line.length + 1 > size) {
      chunks.push(cur);
      cur = '';
    }
    cur += line + '\n';
  }
  if (cur.trim()) chunks.push(cur);
  return chunks.filter((c) => c.trim());
}

// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------

// markdown（またはプレーンテキスト）を構造化ノートに整理する。
// opts: { key, model, lang, onProgress }
// 返り値: { title, body_md, summary, tags, usage, chunks, langOk }
async function structure(markdown, opts = {}) {
  const { key, model = DEFAULT_MODEL, lang = 'auto', onProgress } = opts;
  const source = String(markdown).slice(0, MAX_DOC_CHARS);
  if (!source.trim()) throw new Error('EMPTY_INPUT');

  let bodyMd = '';
  let chunks = 1;
  let usage = ZERO_USAGE;

  if (source.length <= SINGLE_CALL_LIMIT) {
    // --- 短い資料：1回で整理する ---
    if (onProgress) onProgress({ stage: 'single', index: 1, total: 1 });
    const r = await callText({
      key,
      model,
      model: FINAL_MODEL || model,
      system: singleBodyPrompt(lang),
      user:
        'Extract ONLY knowledge points from the following document.\n' +
        '<document>\n' + source + '\n</document>' + TAIL_CHECKLIST,
      maxTokens: 8000,
    });
    usage = addUsage(usage, r.usage);
    bodyMd = tidyHeadings(stripFence(r.text));
  } else {
    // --- 長い資料：分割して抽出 → まとめ直す ---
    const parts = splitIntoChunks(source);
    // 断片どうしは独立しているので同時に投げる（待ち時間を大きく短縮できる）。
    // ただしレート制限を避けるため同時数は絞る。
    let done = 0;
    const results = await mapWithLimit(parts, CHUNK_CONCURRENCY, async (part, i) => {
      try {
        const r = await callText({
          key,
          model,
          system: chunkPrompt(lang),
          user:
            `This is part ${i + 1} of ${parts.length} of one document.\n` +
            '<part>\n' + part + '\n</part>',
          maxTokens: 8000,
        });
        done += 1;
        if (onProgress) onProgress({ stage: 'extract', index: done, total: parts.length });
        return r;
      } catch (e) {
        // 1断片が失敗しても全体は続行する（全滅は避ける）。
        done += 1;
        console.error(`[ai] chunk ${i + 1}/${parts.length} failed:`, e.message);
        return null;
      }
    });

    const collected = [];
    for (const r of results) {
      if (!r) continue;
      usage = addUsage(usage, r.usage);
      const points = stripFence(r.text).trim();
      if (points) collected.push(points);
    }

    chunks = parts.length;
    if (!collected.length) {
      return { title: 'Untitled', body_md: '', summary: null, tags: [], usage, chunks, langOk: true };
    }

    if (onProgress) onProgress({ stage: 'consolidate', index: parts.length, total: parts.length });
    const r2 = await callText({
      key,
      model,
      model: FINAL_MODEL || model,
      system: consolidatePrompt(lang),
      user:
        'Organize these knowledge points, extracted from consecutive parts of one document, into a single note body.\n\n' +
        collected.map((p, i) => `<part-${i + 1}>\n${p}\n</part-${i + 1}>`).join('\n\n') + TAIL_CHECKLIST,
      maxTokens: 12000,
    });
    usage = addUsage(usage, r2.usage);
    bodyMd = tidyHeadings(stripFence(r2.text)) || collected.join('\n');
  }

  // 知識が無いと判断された場合は、そのまま空のノートを返す（水増ししない）。
  if (!bodyMd) {
    return { title: 'Untitled', body_md: '', summary: null, tags: [], usage, chunks, langOk: true };
  }

  // --- 見出し・要約・タグを作る（本文と切り離した小さな JSON 呼び出し）---
  if (onProgress) onProgress({ stage: 'meta', index: chunks, total: chunks });
  let meta = { title: 'Untitled', summary: null, tags: [] };
  try {
    const { json, usage: u3 } = await callJson({
      key,
      model,
      system: metaPrompt(lang),
      user: '<note-body>\n' + bodyMd.slice(0, CHUNK_SIZE) + '\n</note-body>',
      maxTokens: 800,
    });
    usage = addUsage(usage, u3);
    meta = {
      title: (json.title || 'Untitled').toString().trim(),
      summary: json.summary ? json.summary.toString().trim() : null,
      tags: normalizeTags(json.tags),
    };
  } catch (e) {
    // メタ情報が作れなくても本文は守る（先頭の見出しをタイトルに使う）。
    console.error('[ai] メタ情報の生成に失敗:', e.message);
    const first = bodyMd.split('\n').find((l) => l.trim());
    meta.title = (first || 'Untitled').replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').slice(0, 60);
  }

  const result = { ...meta, body_md: bodyMd, chunks };

  // --- 言語の護欄：指定と違う言語で返ってきたら1回だけ言い直させる ---
  const check = await enforceLanguage(result, { key, model, lang });
  return { ...check.result, usage: addUsage(usage, check.usage), chunks, langOk: check.ok };
}

// 出力言語が指定どおりか判定し、違えば翻訳し直す（1回だけ）。
async function enforceLanguage(result, { key, model, lang }) {
  const target = LANGUAGES[lang];
  if (!target || !target.code) return { result, usage: ZERO_USAGE, ok: true }; // auto は判定しない
  if (!result.body_md || !result.body_md.trim()) return { result, usage: ZERO_USAGE, ok: true };

  const got = detectLang(result.body_md);
  if (got === target.code || got === 'unknown') return { result, usage: ZERO_USAGE, ok: true };

  console.warn(`[ai] 出力言語が不一致（期待:${target.code} / 実際:${got}）。翻訳し直します。`);
  try {
    const { json, usage } = await callJson({
      key,
      model,
      system: [
        'You are a translator for a knowledge base.',
        `The following note must be entirely in ${target.instruction}, but it is not.`,
        `Rewrite it so that EVERY sentence — title, body, summary, tags — is in ${target.instruction}.`,
        '- Do not add, remove, or reorganize any knowledge. Translate only.',
        '- Keep Markdown structure, code blocks, commands, identifiers and [[...]] links unchanged.',
        'Return ONLY a JSON object: {"title","markdown","summary","tags"}.',
      ].join('\n'),
      user: JSON.stringify({
        title: result.title,
        markdown: result.body_md,
        summary: result.summary || '',
        tags: result.tags || [],
      }),
      maxTokens: 8000,
    });
    const fixed = {
      ...result,
      title: (json.title || result.title).toString().trim(),
      body_md: json.markdown != null ? String(json.markdown) : result.body_md,
      summary: json.summary ? json.summary.toString().trim() : result.summary,
      tags: normalizeTags(json.tags).length ? normalizeTags(json.tags) : result.tags,
    };
    const ok = detectLang(fixed.body_md) === target.code;
    return { result: fixed, usage, ok };
  } catch (e) {
    console.error('[ai] 言語の修正に失敗:', e.message);
    return { result, usage: ZERO_USAGE, ok: false };
  }
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6);
}

// ---------------------------------------------------------------------------
// 二つの関連ノートを1つに統合する
// ---------------------------------------------------------------------------
function mergePrompt(langKey) {
  return [
    'You are a strict knowledge-base assistant. You are given two related knowledge notes (A and B).',
    'Merge them into ONE unified, de-duplicated knowledge note.',
    '',
    'RULES:',
    '- Keep every distinct knowledge point from both; remove duplicates; organize coherently.',
    '- Do NOT invent or add anything not present in A or B. Knowledge only — no meta/logistics.',
    '- Preserve existing [[...]] wiki-link notation.',
    '',
    DENSITY_RULES,
    '',
    languageRule(langKey),
    '',
    'Return ONLY a JSON object: {"title","markdown","summary","tags"} (tags: 0-6 short strings).',
  ].join('\n');
}

async function merge(oldNote, newNote, opts = {}) {
  const { key, model = DEFAULT_MODEL, lang = 'auto' } = opts;
  const { json, usage } = await callJson({
    key,
    model,
    system: mergePrompt(lang),
    user:
      'Merge these two related knowledge notes into one unified, de-duplicated note.\n\n' +
      `<note-A title="${oldNote.title}">\n${String(oldNote.body_md).slice(0, CHUNK_SIZE)}\n</note-A>\n\n` +
      `<note-B title="${newNote.title}">\n${String(newNote.body_md).slice(0, CHUNK_SIZE)}\n</note-B>`,
    maxTokens: 8000,
  });
  return {
    title: (json.title || oldNote.title).toString().trim(),
    markdown: String(json.markdown || ''),
    summary: json.summary ? json.summary.toString().trim() : null,
    tags: normalizeTags(json.tags),
    usage,
  };
}

module.exports = {
  structure,
  merge,
  detectLang,
  splitIntoChunks,
  costOf,
  priceOf,
  tidyHeadings,
  LANGUAGES,
  MAX_DOC_CHARS,
  SINGLE_CALL_LIMIT,
  CHUNK_SIZE,
  DEFAULT_MODEL,
};
