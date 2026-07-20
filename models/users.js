// ユーザー（アカウント）の永続化。パスワードは bcrypt でハッシュ、
// OpenAI キーは crypto.js で AES-256-GCM 暗号化して保存する。
const bcrypt = require('bcryptjs');
const { run, get } = require('./db');
const crypto = require('../services/crypto');

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
  return get('SELECT id, username, api_model, created_at FROM users WHERE id = ?', [id]);
}

function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// API キーを暗号化して保存（key が空なら NULL でクリア）。
async function setApiKey(userId, key, model) {
  const enc = key ? crypto.encrypt(key) : null;
  await run('UPDATE users SET api_key_enc = ?, api_model = ? WHERE id = ?', [
    enc,
    model || 'gpt-4o-mini',
    userId,
  ]);
}

// 復号した API キーとモデルを返す（未設定なら key: null）。
async function getApiKey(userId) {
  const u = await get('SELECT api_key_enc, api_model FROM users WHERE id = ?', [userId]);
  const model = (u && u.api_model) || 'gpt-4o-mini';
  if (!u || !u.api_key_enc) return { key: null, model };
  return { key: crypto.decrypt(u.api_key_enc), model };
}

async function hasApiKey(userId) {
  const u = await get('SELECT api_key_enc FROM users WHERE id = ?', [userId]);
  return !!(u && u.api_key_enc);
}

module.exports = { create, findByUsername, findById, verifyPassword, setApiKey, getApiKey, hasApiKey };
