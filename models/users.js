// ユーザー（アカウント）の永続化。パスワードは bcrypt でハッシュして保存する。
//
// OpenAI の API キーはサービス側（サーバの環境変数）が持ち、利用者には見せない。
// 利用者が管理するのは、プラン・既定の出力言語・見た目の設定（画面の言語・明暗・
// フィルム・密度・送り穴）の3系統。
const bcrypt = require('bcryptjs');
const { run, get } = require('./db');

async function create(username, password) {
  const hash = await bcrypt.hash(password, 10);
  const res = await run(
    'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
    [username, hash, new Date().toISOString()]
  );
  return res.lastID;
}

function findByUsername(username) {
  return get('SELECT * FROM users WHERE username = ?', [username]);
}

function findById(id) {
  return get('SELECT id, username, plan, out_lang, ui_lang, theme, stock, density, perf, created_at FROM users WHERE id = ?', [id]);
}

function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// 既定の出力言語を保存する（'auto' | 'ja' | 'en' | 'zh' | 'zh-TW' | 'ko'）。
async function setOutLang(userId, lang) {
  await run('UPDATE users SET out_lang = ? WHERE id = ?', [lang || 'auto', userId]);
}

// 画面の言語と表示テーマを保存する。null / 'auto' は「決め打ちしない」の意。
async function setDisplay(userId, { uiLang, theme, stock, density, perf }) {
  await run(
    'UPDATE users SET ui_lang = ?, theme = ?, stock = ?, density = ?, perf = ? WHERE id = ?',
    [uiLang || null, theme || 'auto', stock || 'standard', density || 'comfortable', perf || 'on', userId]
  );
}

// プランを変更する（'free' | 'pro'）。
async function setPlan(userId, plan) {
  await run('UPDATE users SET plan = ? WHERE id = ?', [plan === 'pro' ? 'pro' : 'free', userId]);
}

module.exports = { create, findByUsername, findById, verifyPassword, setOutLang, setDisplay, setPlan };
