// 起動時に .env を確かめる。ねらいは「黙って既定値で動きだす」のを止めること。
//
// 環境変数はプロセスが立ち上がるときに一度だけ読まれる。だから書き間違えても、
// 既定値のまま何ごともなく起動してしまい、直したつもりで気づけない
// （PORT を書き替えたのに 3000 で動き続ける、など）。そこで3段に分けて扱う。
//
//   ・無いと動きが変わる項目が未記入 → 起動を止める
//   ・値の書式が壊れている           → 起動を止める
//   ・無くても動くが知らせたいこと   → 警告だけ出して起動する
//
// app.js で dotenv を読んだ直後に check() を呼ぶ。

const fs = require('fs');
const path = require('path');

// 未記入なら起動しない項目。サーバの居場所とセッションの鍵は、
// 既定値で黙って動かれると事故になる（別のポートで動く／署名鍵が使い回される）。
const REQUIRED = ['PORT', 'HOST', 'SESSION_SECRET'];

// .env.example に書いたままの値。書き替え忘れを見つけるために持っておく。
const SAMPLES = {
  OPENAI_API_KEY: 'sk-your-openai-api-key',
  SESSION_SECRET: 'change-me-to-a-long-random-string',
};

const EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];
const VERBOSITIES = ['low', 'medium', 'high'];

// 未記入（未定義・空文字）は null にそろえる。空文字を「書いた」扱いにしない。
function raw(name) {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? null : v.trim();
}

function make() {
  const errors = [];
  const warnings = [];
  const bad = (name, value, expected) => errors.push(`${name}=${JSON.stringify(value)} … ${expected}`);

  // 数値。未記入なら既定値に任せるので、書いてあるときだけ確かめる。
  const number = (name, { min, max = null, int = true }) => {
    const v = raw(name);
    if (v === null) return;
    const n = Number(v);
    const ok =
      Number.isFinite(n) && (!int || Number.isInteger(n)) && n >= min && (max === null || n <= max);
    if (!ok) {
      const range = max === null ? `${min} 以上` : `${min}〜${max}`;
      bad(name, v, `${int ? '整数' : '数値'}で ${range} を指定してください`);
    }
  };

  const choice = (name, allowed) => {
    const v = raw(name);
    if (v !== null && !allowed.includes(v)) {
      bad(name, v, `${allowed.join(' / ')} のいずれかを指定してください`);
    }
  };

  // 0 か 1 で切りかえる項目。true や yes と書かれても効かないので止める。
  const flag = (name) => choice(name, ['0', '1']);

  return { errors, warnings, bad, number, choice, flag };
}

function check() {
  const { errors, warnings, bad, number, choice, flag } = make();
  const envPath = path.join(process.cwd(), '.env');
  const hasEnv = fs.existsSync(envPath);

  // --- 未記入なら起動しない ---
  for (const name of REQUIRED) {
    if (raw(name) === null) errors.push(`${name} が未記入です … .env.example を見て値を入れてください`);
  }

  // --- 書式：サーバ ---
  number('PORT', { min: 1, max: 65535 });
  const host = raw('HOST');
  // ホスト名だけを書く欄。scheme やポートまで書くと listen できない。
  if (host !== null && /^\w+:\/\//.test(host)) bad('HOST', host, 'http:// を付けずにホスト名だけを書いてください');
  else if (host !== null && /:\d+$/.test(host)) bad('HOST', host, 'ポートは PORT に分けて書いてください');
  flag('TRUST_PROXY');
  flag('COOKIE_SECURE');

  // --- 書式：アップロードと変換ワーカー ---
  number('MAX_UPLOAD_MB', { min: 1, max: 2048 });
  number('MD_WORKERS', { min: 1, max: 64 });
  number('MD_TIMEOUT_MS', { min: 1000 });
  number('MD_MAX_QUEUE', { min: 1 });

  // --- 書式：AI 整理 ---
  number('AI_SINGLE_LIMIT', { min: 1 });
  number('AI_CHUNK_SIZE', { min: 1 });
  number('AI_MAX_DOC_CHARS', { min: 1 });
  number('AI_CHUNK_CONCURRENCY', { min: 1, max: 32 });
  number('AI_TEMPERATURE', { min: 0, max: 2, int: false });
  choice('AI_REASONING_EFFORT', EFFORTS);
  choice('AI_VERBOSITY', VERBOSITIES);
  flag('AI_TWO_STAGE');

  // --- 書式：意味ベクトル ---
  number('EMBEDDING_MAX_CHARS', { min: 1 });
  flag('EMBEDDING_ENABLED');

  // --- 書式：料金プランと掃除 ---
  number('PLAN_FREE_INGESTS', { min: 1 });
  number('PLAN_FREE_DOC_CHARS', { min: 1 });
  number('PLAN_PRO_INGESTS', { min: 1 });
  number('PLAN_PRO_DOC_CHARS', { min: 1 });
  number('UPLOAD_MAX_AGE_MS', { min: 1000 });
  number('UPLOAD_SWEEP_MS', { min: 1000 });

  // --- 書式が正しくても噛み合わない組み合わせ ---
  const n = (name) => (raw(name) === null ? null : Number(raw(name)));
  const single = n('AI_SINGLE_LIMIT');
  const chunk = n('AI_CHUNK_SIZE');
  if (single !== null && chunk !== null && chunk > single) {
    warnings.push(
      `AI_CHUNK_SIZE(${chunk}) が AI_SINGLE_LIMIT(${single}) より大きい。` +
        '分割した断片が1回で扱う上限を超えます。'
    );
  }
  const maxDoc = n('AI_MAX_DOC_CHARS');
  for (const plan of ['PLAN_FREE_DOC_CHARS', 'PLAN_PRO_DOC_CHARS']) {
    const v = n(plan);
    if (maxDoc !== null && v !== null && v > maxDoc) {
      warnings.push(`${plan}(${v}) が AI_MAX_DOC_CHARS(${maxDoc}) を超えています。全体の上限が先に効きます。`);
    }
  }
  // temperature は推論を切っているときしか送られない（ai.js の paramsFor 参照）。
  if (raw('AI_TEMPERATURE') !== null && raw('AI_REASONING_EFFORT') !== 'none') {
    warnings.push('AI_TEMPERATURE は AI_REASONING_EFFORT=none のときだけ効きます。いまは無視されます。');
  }

  // --- 無くても動くが、知らせておきたいこと ---
  if (!hasEnv) warnings.push(`.env が見つかりません（${envPath} を見ています）。`);

  const key = raw('OPENAI_API_KEY');
  if (key === null) {
    warnings.push(
      'OPENAI_API_KEY がありません。AI 整理と意味ベクトルは動きません' +
        '（取り込みは、変換したテキストだけでノートを作ります）。'
    );
  } else if (key === SAMPLES.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY が .env.example のサンプルのままです。実際のキーに書き替えてください。');
  } else if (!key.startsWith('sk-')) {
    warnings.push('OPENAI_API_KEY が sk- で始まっていません。値を取り違えていないか確かめてください。');
  }

  const secret = raw('SESSION_SECRET');
  if (secret === SAMPLES.SESSION_SECRET) {
    warnings.push('SESSION_SECRET が .env.example のサンプルのままです。長い乱数に書き替えてください。');
  } else if (secret !== null && secret.length < 16) {
    warnings.push(`SESSION_SECRET が ${secret.length} 文字しかありません。32 文字以上を勧めます。`);
  }
  // 外向きに開くのに署名鍵が弱いと、cookie を偽造される。
  if (host === '0.0.0.0' && (secret === null || secret === SAMPLES.SESSION_SECRET)) {
    warnings.push('HOST=0.0.0.0 で外に開いているのに SESSION_SECRET が既定のままです。');
  }
  // secure cookie は「HTTPS で来た」と判定できて初めて付く。
  if (raw('COOKIE_SECURE') === '1' && raw('TRUST_PROXY') !== '1') {
    warnings.push('COOKIE_SECURE=1 ですが TRUST_PROXY が未設定です。プロキシ配下では cookie が付きません。');
  }

  // --- 出力 ---
  if (warnings.length) {
    for (const w of warnings) console.warn(`[config] ※ ${w}`);
  }
  if (errors.length) {
    console.error('[config] .env に問題があるため起動を中止しました。');
    for (const e of errors) console.error(`  ・${e}`);
    console.error(`  読んだ .env: ${hasEnv ? envPath : '(見つかりません)'}`);
    process.exit(1);
  }
  if (hasEnv) console.log(`[config] .env を読みました（${envPath}）`);
}

module.exports = { check, REQUIRED };
