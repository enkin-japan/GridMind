// ファイル → Markdown 変換。Python ブリッジ（tools/md_convert.py）を child_process で呼ぶ。
// course 第11章の「外部プロセス/外部データを非同期で取り込む」パターンの応用。
const { spawn } = require('child_process');
const path = require('path');

const PYTHON = process.env.PYTHON || 'python3';
const SCRIPT = path.join(__dirname, '..', 'tools', 'md_convert.py');

// ファイルパスを渡すと markitdown が変換した Markdown を返す。
// 失敗・タイムアウト時は reject（呼び出し側でフォールバックする）。
function fileToMarkdown(filePath, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON, [SCRIPT, filePath]);
    let out = '';
    let err = '';

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('BRIDGE_TIMEOUT'));
    }, timeoutMs);

    proc.stdout.on('data', (d) => (out += d));
    proc.stderr.on('data', (d) => (err += d));
    proc.on('error', (e) => {
      clearTimeout(timer);
      reject(new Error('BRIDGE_SPAWN_FAILED: ' + e.message));
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error('BRIDGE_FAILED: ' + err.slice(0, 300)));
    });
  });
}

module.exports = { fileToMarkdown };
