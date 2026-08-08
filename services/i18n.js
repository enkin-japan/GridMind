// 画面の言語。テンプレートに文字列を直接書かないための土台。
//
// 決めかたは3段：ユーザーの設定 → cookie（ログイン前でも効かせるため）→
// ブラウザの Accept-Language。どれも当たらなければ日本語。
// 語が足りない言語は日本語へ落ちる（空欄で出すより、読める字が出るほうがまし）。
const LOCALES = {
  ja: require('../locales/ja'),
  en: require('../locales/en'),
  zh: require('../locales/zh'),
  'zh-TW': require('../locales/zh-TW'),
  ko: require('../locales/ko'),
};

const DEFAULT = 'ja';
const CODES = Object.keys(LOCALES);

// 選択肢として画面に出す一覧（自称の表記のまま並べる）。
const UI_LANGS = CODES.map((code) => ({ code, label: LOCALES[code]['lang.name'] }));

const THEMES = ['auto', 'light', 'dark'];

// 見た目の好み。値と既定を1か所にまとめ、ここを増やせば設定画面も cookie も追従する。
// 片基（配色）は増えても構造は変えない。世界そのものは選択肢にしない。
const LOOK = {
  stock:   { values: ['standard', 'tungsten', 'daylight', 'contrast'], def: 'standard', attr: 'data-stock' },
  density: { values: ['comfortable', 'compact'], def: 'comfortable', attr: 'data-density' },
  perf:    { values: ['on', 'off'], def: 'on', attr: 'data-perf' },
};
const LOOK_KEYS = Object.keys(LOOK);

function isLook(kind, v) { return LOOK[kind] && LOOK[kind].values.indexOf(v) >= 0; }

// 表記ゆれを1つに寄せる。ブラウザは zh-Hant-TW のような書きかたもしてくる。
const CANON = {};
for (const c of CODES) CANON[c.toLowerCase()] = c;
Object.assign(CANON, {
  'zh-hant': 'zh-TW', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW',   // 繁体を使う地域
  'zh-hans': 'zh', 'zh-cn': 'zh', 'zh-sg': 'zh',
});

// 正式なコードに直す。知らない言語なら null。
function canon(v) { return v ? CANON[String(v).toLowerCase()] || null : null; }
function isLang(v) { return canon(v) !== null; }
function isTheme(v) { return THEMES.indexOf(v) >= 0; }

// Accept-Language から、こちらが持っている言語を1つ選ぶ。
// 品質値の順に見て、最初に当たったものを採る（zh-CN → zh のように前半だけでも見る）。
function fromHeader(header = '') {
  const wanted = String(header)
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: q === undefined ? 1 : Number(q) || 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    // 後ろから1段ずつ落として当てる：zh-Hant-TW → zh-Hant → zh
    const parts = tag.split('-');
    for (let n = parts.length; n > 0; n--) {
      const hit = canon(parts.slice(0, n).join('-'));
      if (hit) return hit;
    }
  }
  return null;
}

// cookie は express 標準では解かれないので、必要な2つだけ自前で取り出す。
function cookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return null; }
  }
  return null;
}

function pickLang(req, user) {
  const own = user && canon(user.ui_lang);
  if (own) return own;
  const c = canon(cookie(req, 'gm_lang'));
  if (c) return c;
  return fromHeader(req.headers['accept-language']) || DEFAULT;
}

function pickTheme(req, user) {
  if (user && isTheme(user.theme)) return user.theme;
  const c = cookie(req, 'gm_theme');
  if (isTheme(c)) return c;
  return 'auto';
}

// 片基・密度・送り穴。アカウント → cookie → 既定。
function pickLook(req, user) {
  const out = {};
  for (const kind of LOOK_KEYS) {
    const own = user && user[kind];
    if (isLook(kind, own)) { out[kind] = own; continue; }
    const c = cookie(req, 'gm_' + kind);
    out[kind] = isLook(kind, c) ? c : LOOK[kind].def;
  }
  return out;
}

// <html> に付ける属性。既定のものは付けない（既定は素の :root が持っている）。
function lookAttrs(look) {
  return LOOK_KEYS
    .filter((k) => look[k] && look[k] !== LOOK[k].def)
    .map((k) => ` ${LOOK[k].attr}="${look[k]}"`)
    .join('');
}

// {name} を差しこむ。値が無いキーはそのまま残す（消すと文が壊れて原因が見えない）。
function fill(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

function t(lang, key, vars) {
  const table = LOCALES[lang] || LOCALES[DEFAULT];
  const str = table[key] !== undefined ? table[key] : LOCALES[DEFAULT][key];
  if (str === undefined) return key;      // 訳が無いことを隠さない
  return fill(str, vars);
}

// 画面側へ渡すぶんだけ取り出す（js. と stage. の2群）。
function clientDict(lang) {
  const table = LOCALES[lang] || LOCALES[DEFAULT];
  const base = LOCALES[DEFAULT];
  const out = {};
  for (const key of Object.keys(base)) {
    if (key.indexOf('js.') !== 0 && key.indexOf('stage.') !== 0 && key !== 'import.nfiles') continue;
    out[key] = table[key] !== undefined ? table[key] : base[key];
  }
  return out;
}

module.exports = { LOCALES, CODES, DEFAULT, UI_LANGS, THEMES, LOOK, LOOK_KEYS,
  canon, isLang, isTheme, isLook, pickLang, pickTheme, pickLook, lookAttrs, t, fill, clientDict };
