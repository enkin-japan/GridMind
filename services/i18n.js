// 画面の言語。テンプレートに文字列を直接書かないための土台。
//
// 決めかたは3段：ユーザーの設定 → cookie（ログイン前でも効かせるため）→
// ブラウザの Accept-Language。どれも当たらなければ日本語。
// 語が足りない言語は日本語へ落ちる（空欄で出すより、読める字が出るほうがまし）。
const LOCALES = {
  ja: require('../locales/ja'),
  en: require('../locales/en'),
  zh: require('../locales/zh'),
};

const DEFAULT = 'ja';
const CODES = Object.keys(LOCALES);

// 選択肢として画面に出す一覧（自称の表記のまま並べる）。
const UI_LANGS = CODES.map((code) => ({ code, label: LOCALES[code]['lang.name'] }));

const THEMES = ['auto', 'light', 'dark'];

function isLang(v) { return CODES.indexOf(v) >= 0; }
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
    if (isLang(tag)) return tag;
    const base = tag.split('-')[0];
    if (isLang(base)) return base;
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
  if (user && isLang(user.ui_lang)) return user.ui_lang;
  const c = cookie(req, 'gm_lang');
  if (isLang(c)) return c;
  return fromHeader(req.headers['accept-language']) || DEFAULT;
}

function pickTheme(req, user) {
  if (user && isTheme(user.theme)) return user.theme;
  const c = cookie(req, 'gm_theme');
  if (isTheme(c)) return c;
  return 'auto';
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

module.exports = { LOCALES, CODES, DEFAULT, UI_LANGS, THEMES, isLang, isTheme, pickLang, pickTheme, t, fill, clientDict };
