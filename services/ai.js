// OpenAI を使ったドキュメント整理サービス（BYOK）。
// キーはリクエストごとに渡され、サーバには保存・記録しない（ARCHITECTURE §8, ADR-4）。
const OpenAI = require('openai');

// 入力の上限文字数（コスト節約：長すぎる本文はここで切る）。
const MAX_INPUT_CHARS = 12000;

// システムプロンプトは英語で記述する（OpenAI 系モデルは英語指示の遵守精度が高いため）。
// ただし出力は原文の言語に合わせるよう明示する（翻訳しない）。
const SYSTEM_PROMPT = [
  'You are a strict knowledge-extraction assistant for a personal knowledge base.',
  'From the given text, extract ONLY the substantive knowledge worth studying or referencing later, and organize it into a clean, structured Markdown note.',
  '',
  'EXTRACT — this counts as "knowledge":',
  '- Definitions, concepts, meanings of terms',
  '- Principles, mechanisms, theories',
  '- Methods, procedures, algorithms',
  '- Facts, data, figures, classifications',
  '- Relationships and comparisons between things',
  '',
  'EXCLUDE — never put this in the body; this is NOT knowledge, it is noise:',
  '- Instructional/course meta: learning objectives, aims, teaching goals',
  '- Assessment/grading: grading criteria, evaluation methods, how/when to submit assignments, deadlines, attendance rules',
  '- Administrative/logistics: schedules, agendas, announcements, class-operation procedures, room numbers, instructor/presenter names, textbook purchase instructions',
  '- Document furniture: page numbers, tables of contents, cover pages, greetings, filler such as "today\'s summary", copyright, navigation',
  '- In short, anything that serves the DELIVERER\'s convenience rather than being knowledge to be learned',
  '',
  'HARD RULES:',
  '- NEVER pad, invent, or fabricate to fill space. Only reorganize knowledge that actually exists in the source.',
  '- If the source has little knowledge, the note MUST be correspondingly short. Do not lengthen it artificially.',
  '- If there is essentially no extractable knowledge, set "markdown" to "", "summary" to "", and "tags" to [].',
  '- Even then, NEVER copy the noise (announcements, objectives, grading, logistics) into the body. Leaving noise in the body is a failure.',
  '- Do NOT translate. Respond in the SAME language as the source document.',
  '- Preserve any existing [[...]] wiki-link notation.',
  '',
  'Return ONLY a JSON object with exactly these keys:',
  '  "title":    a short title describing the knowledge (in the source language)',
  '  "markdown": the body containing ONLY the extracted knowledge, organized with headings/lists/tables',
  '  "summary":  a 1-2 sentence summary (short if little knowledge, "" if none)',
  '  "tags":     0-6 short content tags (empty array [] if none fit)',
].join('\n');

// markdown（またはプレーンテキスト）を構造化ノートに整理する。
// opts: { key, model }
async function structure(markdown, { key, model = 'gpt-4o-mini' } = {}) {
  if (!key) throw new Error('NO_KEY');
  const input = String(markdown).slice(0, MAX_INPUT_CHARS);
  const client = new OpenAI({ apiKey: key });

  const res = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'Extract ONLY knowledge points from the following document. ' +
          'Exclude all non-knowledge information (objectives, grading, schedule, presenter, textbook logistics, layout). ' +
          'Do not pad if knowledge is scarce. Respond in the source language.\n\n' +
          '<document>\n' +
          input +
          '\n</document>',
      },
    ],
  });

  const json = JSON.parse(res.choices[0].message.content);
  // markdown が空文字なら「知識なし」の意思表示なので尊重する（生テキストで上書きしない）。
  // undefined/null のときだけ安全側のフォールバックとして生テキストを使う。
  const bodyMd = json.markdown != null ? String(json.markdown) : String(markdown);
  return {
    title: (json.title || 'Untitled').toString().trim(),
    body_md: bodyMd,
    summary: json.summary ? json.summary.toString().trim() : null,
    tags: Array.isArray(json.tags) ? json.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  };
}

// 二つの関連ノートを1つに統合する（重複を除いた統合ノートを作る）。
const MERGE_PROMPT = [
  'You are a strict knowledge-base assistant. You are given two related knowledge notes (A and B).',
  'Merge them into ONE unified, de-duplicated knowledge note.',
  'Rules:',
  '- Keep every distinct knowledge point from both; remove duplicates; organize coherently with headings/lists/tables.',
  '- Do NOT invent or add anything not present in A or B. Knowledge only — no meta/logistics.',
  '- Preserve existing [[...]] wiki-link notation.',
  '- Do NOT translate. Respond in the SAME language as the notes.',
  'Return ONLY a JSON object: {"title","markdown","summary","tags"} (tags: 0-6 short strings).',
].join('\n');

async function merge(oldNote, newNote, { key, model = 'gpt-4o-mini' } = {}) {
  if (!key) throw new Error('NO_KEY');
  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: MERGE_PROMPT },
      {
        role: 'user',
        content:
          'Merge these two related knowledge notes into one unified, de-duplicated note. Respond in the source language.\n\n' +
          `<note-A title="${oldNote.title}">\n${String(oldNote.body_md).slice(0, MAX_INPUT_CHARS)}\n</note-A>\n\n` +
          `<note-B title="${newNote.title}">\n${String(newNote.body_md).slice(0, MAX_INPUT_CHARS)}\n</note-B>`,
      },
    ],
  });
  const json = JSON.parse(res.choices[0].message.content);
  return {
    title: (json.title || oldNote.title).toString().trim(),
    markdown: String(json.markdown || ''),
    summary: json.summary ? json.summary.toString().trim() : null,
    tags: Array.isArray(json.tags) ? json.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  };
}

module.exports = { structure, merge, MAX_INPUT_CHARS };
