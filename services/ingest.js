// ファイル → Markdown 変換（常駐ワーカープール方式）。
//
// 【なぜプールにするか】
//  1) 冷起動の削減：以前はリクエストのたびに Python を起動し、毎回 `import markitdown`
//     に約0.50秒かかっていた（変換本体は0.25〜0.55秒）。ワーカーを常駐させることで
//     この分がまるごと無くなる。
//  2) 同時実行の制御：変換は CPU を1コア使い切る重い処理なので、無制限に並行させると
//     メモリと CPU を食いつぶす。同時に動く本数を上限つきで固定し、あふれた分は待たせる。
//
// 1本のワーカー（tools/md_worker.py）は「1行1リクエスト」の JSON をやり取りする。
// 応答が返らない・落ちた場合は、そのワーカーを捨てて新しく立て直す。
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PYTHON = process.env.PYTHON || 'python3';
const SCRIPT = path.join(__dirname, '..', 'tools', 'md_worker.py');

// 同時変換数。既定は「CPU コア数 - 1」を上限4本におさえる（Node 本体の分を残す）。
const POOL_SIZE = Math.max(
  1,
  Number(process.env.MD_WORKERS) || Math.min(4, Math.max(1, os.cpus().length - 1))
);
// 1件あたりの制限時間。壊れた PDF などで固まったワーカーを切り離すために使う。
const REQUEST_TIMEOUT = Number(process.env.MD_TIMEOUT_MS) || 60000;
// 待ち行列の上限。これを超える同時アクセスは待たせずに断る（サーバを守るため）。
const MAX_QUEUE = Number(process.env.MD_MAX_QUEUE) || 50;
// ワーカーが落ちたときの再起動待ち（連続クラッシュで暴走しないように）。
const RESPAWN_DELAY = 500;

let seq = 0;                 // リクエスト通し番号
const queue = [];            // 待ち行列（{ id, filePath, resolve, reject, enqueuedAt }）
const workers = [];          // ワーカー一覧
let started = false;
let everReady = false;       // 一度でも起動に成功したか（環境不備の判定に使う）
let bootFailures = 0;        // 準備完了前に落ちた回数

class Worker {
  constructor() {
    this.proc = null;
    this.buf = '';
    this.ready = false;
    this.job = null;
    this.timer = null;
    this.start();
  }

  get busy() {
    return this.job !== null;
  }

  start() {
    const proc = spawn(PYTHON, [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc = proc;
    this.buf = '';
    this.ready = false;
    this.stderr = '';

    proc.stdout.on('data', (chunk) => this.onData(chunk));
    proc.stderr.on('data', (d) => {
      this.stderr = (this.stderr + d).slice(-500);
    });
    proc.on('error', (e) => this.onExit('SPAWN_FAILED: ' + e.message));
    proc.on('close', () => this.onExit('WORKER_EXITED: ' + (this.stderr || 'no output')));
    // stdin が閉じた相手に書いても落ちないようにする。
    proc.stdin.on('error', () => {});
  }

  // 標準出力を1行ずつに切り出す（JSON なので改行は必ず区切りになる）。
  onData(chunk) {
    this.buf += chunk;
    let nl;
    while ((nl = this.buf.indexOf('\n')) !== -1) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (line) this.onLine(line);
    }
  }

  onLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      return; // 壊れた行は無視
    }

    // 起動完了の合図
    if (msg.ready) {
      this.ready = true;
      everReady = true;
      bootFailures = 0;
      dispatch();
      return;
    }

    // 変換結果
    const job = this.job;
    if (!job || msg.id !== job.id) return; // 期限切れなどで持ち主のいない応答
    this.finishJob();
    if (msg.ok) job.resolve(String(msg.text || ''));
    else job.reject(new Error('BRIDGE_FAILED: ' + String(msg.error || '').slice(0, 300)));
    dispatch();
  }

  onExit(reason) {
    const job = this.job;
    this.finishJob();
    this.ready = false;
    if (job) job.reject(new Error(reason));
    if (!everReady) bootFailures += 1;

    // 環境自体が壊れている（python や markitdown が無い）場合は、
    // 待っている全員をいつまでも待たせずに、まとめて失敗させる。
    if (!everReady && bootFailures >= POOL_SIZE * 2) {
      const err = new Error('BRIDGE_UNAVAILABLE: ' + reason);
      while (queue.length) queue.shift().reject(err);
    }

    setTimeout(() => {
      this.start();
    }, RESPAWN_DELAY);
  }

  finishJob() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.job = null;
  }

  send(job) {
    this.job = job;
    this.timer = setTimeout(() => {
      // 応答が返らない＝固まっている。ワーカーごと捨てて立て直す。
      // （close イベントが job を reject し、再起動も行う）
      try {
        this.proc.kill('SIGKILL');
      } catch (e) {
        /* すでに死んでいる */
      }
    }, REQUEST_TIMEOUT);

    try {
      this.proc.stdin.write(JSON.stringify({ id: job.id, path: job.filePath }) + '\n');
    } catch (e) {
      this.finishJob();
      job.reject(new Error('BRIDGE_WRITE_FAILED: ' + e.message));
    }
  }
}

function ensureStarted() {
  if (started) return;
  started = true;
  for (let i = 0; i < POOL_SIZE; i += 1) workers.push(new Worker());
}

// 空いているワーカーへ、待ち行列の先頭から順に割り当てる。
function dispatch() {
  for (const w of workers) {
    if (!queue.length) return;
    if (w.ready && !w.busy) w.send(queue.shift());
  }
}

// ファイルパスを渡すと markitdown が変換した Markdown を返す。
// 失敗・タイムアウト・混雑時は reject（呼び出し側でフォールバックする）。
function fileToMarkdown(filePath) {
  ensureStarted();
  return new Promise((resolve, reject) => {
    if (queue.length >= MAX_QUEUE) {
      reject(new Error('BRIDGE_BUSY'));
      return;
    }
    seq += 1;
    queue.push({ id: seq, filePath, resolve, reject, enqueuedAt: Date.now() });
    dispatch();
  });
}

// 監視用（管理画面やログから今の混み具合を見るために使う）。
function stats() {
  return {
    poolSize: POOL_SIZE,
    ready: workers.filter((w) => w.ready).length,
    busy: workers.filter((w) => w.busy).length,
    queued: queue.length,
  };
}

// サーバ終了時に子プロセスを残さない。
function shutdown() {
  for (const w of workers) {
    try {
      w.proc.kill();
    } catch (e) {
      /* 無視 */
    }
  }
}
process.on('exit', shutdown);
process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

module.exports = { fileToMarkdown, stats, POOL_SIZE };
