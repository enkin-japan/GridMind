// アップロード一時ファイルの掃除係。
//
// 取り込み処理は変換が終わった時点で元ファイルを必ず消している（routes/notes.js）。
// ただし次の場合は消し残りが出る：
//   ・アップロードの途中で通信が切れた
//   ・サイズ上限を超えて multer が受け取りを中断した
//   ・変換中にサーバが落ちた
// 放置するとディスクを圧迫し、元の資料がサーバに残り続けてしまう（プライバシー面でも良くない）。
// そのため一定時間より古いファイルを定期的に削除する。
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
// この時間より古いものは「取り残し」とみなす（処理中のファイルを消さないよう長めに取る）。
const MAX_AGE_MS = Number(process.env.UPLOAD_MAX_AGE_MS) || 30 * 60 * 1000; // 30分
const INTERVAL_MS = Number(process.env.UPLOAD_SWEEP_MS) || 10 * 60 * 1000; // 10分ごと

function sweepOnce() {
  let removed = 0;
  let files;
  try {
    files = fs.readdirSync(UPLOAD_DIR);
  } catch (e) {
    return 0; // ディレクトリが無ければ何もしない
  }
  const now = Date.now();
  for (const name of files) {
    if (name === '.gitkeep' || name.startsWith('.')) continue;
    const full = path.join(UPLOAD_DIR, name);
    try {
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      if (now - st.mtimeMs < MAX_AGE_MS) continue;
      fs.unlinkSync(full);
      removed += 1;
    } catch (e) {
      /* 他の処理と競合して消えた場合などは無視 */
    }
  }
  if (removed) console.log(`[janitor] 取り残しの一時ファイルを ${removed} 件削除しました`);
  return removed;
}

// 起動時に一度掃除し、その後は定期実行する。
function start() {
  sweepOnce();
  const t = setInterval(sweepOnce, INTERVAL_MS);
  t.unref(); // このタイマーだけでプロセスを生かし続けない
  return t;
}

module.exports = { start, sweepOnce, UPLOAD_DIR, MAX_AGE_MS };
