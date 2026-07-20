// ユーザーの OpenAI API キーを DB に保存するための暗号化ユーティリティ（AES-256-GCM）。
// キーは復元して OpenAI 呼び出しに使う必要があるため、ハッシュではなく可逆暗号で保存する。
// 暗号鍵は APP_ENCRYPTION_KEY（.env・git 管理外）から導出し、DB には入れない。
// → DB 単体が漏れても、サーバの鍵が無ければ復号できない。
const crypto = require('crypto');

function getKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || raw === 'change-me-to-a-long-random-string') {
    throw new Error('APP_ENCRYPTION_KEY が未設定です（.env に固有のランダム値を設定してください）');
  }
  // 64桁hex ならそのまま 32バイト。それ以外の文字列は sha256 で 32バイトに畳む。
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  return crypto.createHash('sha256').update(raw).digest();
}

// plaintext → "ivB64:tagB64:cipherB64"
function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

function decrypt(blob) {
  const [ivB64, tagB64, encB64] = String(blob).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
