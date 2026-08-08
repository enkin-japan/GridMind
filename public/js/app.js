// GridMind クライアント JS
(function () {
  'use strict';

  // 画面の文言。footer が埋めた JSON から読む（ここに直接書かない）。
  var DICT = {};
  try { DICT = JSON.parse(document.getElementById('i18n').textContent); } catch (e) { DICT = {}; }
  function T(key, vars) {
    var s = DICT[key];
    if (s === undefined) return key;                 // 訳が無いことを隠さない
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] === undefined ? m : String(vars[k]);
    });
  }

  // ===== 汎用：POST フォームの二重送信防止 ＋「処理中…」表示 =====
  // 送信ボタンを押したら無効化し、ラベルを「処理中…」にする。
  // 通常フォームはレスポンスで画面遷移するので、その時にリセットされる。
  document.querySelectorAll('form').forEach(function (form) {
    if (form.id === 'import-form') return;                          // 取り込みは専用処理
    if ((form.method || 'get').toLowerCase() !== 'post') return;    // 検索(GET)などは対象外
    form.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;                               // confirm キャンセル等
      var btn = form.querySelector('button[type="submit"], button:not([type])');
      if (!btn) return;
      if (btn.dataset.busy) { e.preventDefault(); return; }         // 二重送信ブロック
      btn.dataset.busy = '1';
      btn.dataset.label = btn.innerHTML;
      btn.innerHTML = T('js.processing');
      setTimeout(function () { btn.disabled = true; }, 0);          // 送信開始後に無効化
    });
  });

  // ===== 取り込みフォーム（単発 or 複数ファイルの分割処理）=====
  var form = document.getElementById('import-form');
  if (!form) return;
  var statusEl = document.getElementById('import-status');
  var fileInput = document.getElementById('import-file');
  var textInput = document.getElementById('import-text');
  var langInput = document.getElementById('import-lang');
  var btn = document.getElementById('import-submit');
  var BTN_LABEL = btn.innerHTML;   // アイコンごと控える（textContent だと絵が消える）

  // ゲート（進捗表示）の部品
  var panel = document.getElementById('ingest');
  var barEl = document.getElementById('ingest-bar');
  var fillEl = document.getElementById('ingest-fill');
  var gateEl = document.getElementById('ingest-gate');
  var stageEl = document.getElementById('ingest-stage');
  var metaEl = document.getElementById('ingest-meta');
  var invEl = document.getElementById('ingest-inv');
  var invNEl = document.getElementById('ingest-inv-n');
  var invListEl = document.getElementById('ingest-inv-list');
  var previewEl = document.getElementById('ingest-preview');

  function currentLang() { return langInput ? langInput.value : 'auto'; }

  // 選んだファイル名を自前で出す（ネイティブの表示はブラウザの言語で出るため隠してある）。
  var fileNameEl = document.getElementById('import-file-name');
  if (fileInput && fileNameEl) {
    fileInput.addEventListener('change', function () {
      var n = fileInput.files.length;
      if (!n) { fileNameEl.textContent = fileInput.dataset.nofile; return; }
      if (n === 1) { fileNameEl.textContent = fileInput.files[0].name; return; }
      fileNameEl.textContent = T('import.nfiles', { n: n });
    });
  }

  function say(msg, bad) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('warn', !!bad);
  }
  function lock(msg) { btn.disabled = true; btn.textContent = T('js.processing'); say(msg); }
  function unlock(msg, bad) { btn.disabled = false; btn.innerHTML = BTN_LABEL; if (msg) say(msg, bad); }

  // ---------------------------------------------------------------------------
  // 進捗計。
  //
  // 見積もり（サーバが最初に送ってくる段階ごとの想定時間）で滑らかに進めつつ、
  // 実際の段階の切りかわりが来たらそこへ合わせ直す。守るのは2つだけ:
  //   ・決して戻さない
  //   ・次の目盛りを、実際にそこへ着く前に越えさせない
  // 見積もりが外れても、表示が嘘になるのはせいぜい「少し遅く見える」程度で済む。
  // ---------------------------------------------------------------------------
  function Meter() {
    this.stages = [];
    this.bounds = [];      // 各段階の [開始, 終了] を 0〜1 で持つ
    this.at = 0;           // いま表示している進捗
    this.idx = -1;
    this.stageStart = 0;
    this.timer = null;
  }

  Meter.prototype.plan = function (stages) {
    // 保存・関連づけのぶんとして最後の 6% を空けておく。
    var SAVE = 0.06;
    var total = stages.reduce(function (s, x) { return s + x.ms; }, 0) || 1;
    var acc = 0;
    this.stages = stages;
    this.bounds = stages.map(function (x) {
      var from = (acc / total) * (1 - SAVE);
      acc += x.ms;
      return [from, (acc / total) * (1 - SAVE)];
    });
    var self = this;
    this.timer = setInterval(function () { self.tick(); }, 250);
  };

  Meter.prototype.enter = function (key, label) {
    var i = -1;
    for (var k = 0; k < this.stages.length; k++) if (this.stages[k].key === key) i = k;
    if (i < 0 || i < this.idx) return;                 // 知らない段階・戻りは無視
    this.idx = i;
    this.stageStart = Date.now();
    this.set(this.bounds[i][0]);                       // 目盛りへ合わせ直す
    stageEl.textContent = label || T('stage.' + this.stages[i].key);
  };

  // 段階の中の進み具合を、あらかじめ分かっている割合で直接指定する
  // （分割経路の「断片 3/5」のように、本当に数えられるとき用）。
  Meter.prototype.within = function (ratio) {
    if (this.idx < 0) return;
    var b = this.bounds[this.idx];
    this.set(b[0] + (b[1] - b[0]) * Math.min(1, Math.max(0, ratio)));
  };

  Meter.prototype.tick = function () {
    if (this.idx < 0) return;
    var b = this.bounds[this.idx];
    var est = this.stages[this.idx].ms || 1;
    var r = (Date.now() - this.stageStart) / est;
    // 見積もりを超えても段階の終わりには着かせない（着いた事にしてはいけない）。
    // 残りを少しずつ詰めるだけにして、止まって見えないようにする。
    var eased = r < 1 ? r * 0.9 : 0.9 + 0.1 * (1 - Math.exp(-(r - 1)));
    this.set(b[0] + (b[1] - b[0]) * eased);
  };

  Meter.prototype.set = function (v) {
    if (v <= this.at) return;                          // 決して戻さない
    this.at = Math.min(v, 1);
    var pct = (this.at * 100).toFixed(1);
    fillEl.style.width = pct + '%';                    // 露光済みのフィルム
    gateEl.style.left = pct + '%';                     // ゲート印はその先端に立つ
    metaEl.textContent = Math.round(this.at * 100);
    barEl.setAttribute('aria-valuenow', Math.round(this.at * 100));
  };

  Meter.prototype.finish = function () {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.at = 0.999;                                   // set の単調性をすり抜けるため
    this.set(1);
  };

  // ---------------------------------------------------------------------------
  // NDJSON を読みながらイベントを配る。
  // 断れる段階（上限超過・読み取り失敗）はふつうの JSON で返ってくるので、
  // Content-Type を見て振り分ける。
  // ---------------------------------------------------------------------------
  function runIngest(fd, on) {
    return fetch('/notes/ingest', { method: 'POST', body: fd }).then(function (res) {
      var ct = res.headers.get('Content-Type') || '';
      if (ct.indexOf('ndjson') < 0) {
        return res.json().then(function (j) {
          if (!res.ok) {
            var e = new Error(j.error || T('js.error', { msg: res.status }));
            e.quota = j.reason === 'MONTHLY_LIMIT' || j.reason === 'DOC_TOO_LARGE';
            throw e;
          }
          return j;                                    // 流さずに終わった場合（保険）
        });
      }
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      var last = null;
      function pump() {
        return reader.read().then(function (r) {
          buf += dec.decode(r.value || new Uint8Array(), { stream: !r.done });
          var lines = buf.split('\n');
          buf = r.done ? '' : lines.pop();             // 最後の1本は途中かもしれない
          lines.forEach(function (line) {
            if (!line.trim()) return;
            var ev;
            try { ev = JSON.parse(line); } catch (e) { return; }
            last = on(ev) || last;
          });
          if (r.done) return last;
          return pump();
        });
      }
      return pump();
    });
  }

  // 拾い出した知識点を、トリムビンに1本ずつ吊るす。
  function hangTrims(items, count) {
    invNEl.textContent = count + ' ' + T('js.unit');
    invListEl.innerHTML = '';
    items.forEach(function (t, i) {
      var li = document.createElement('li');
      li.textContent = t;
      li.style.animationDelay = Math.min(i * 40, 600) + 'ms';
      invListEl.appendChild(li);
    });
    invEl.hidden = false;
  }

  // 1件ぶんの進捗表示をまとめて面倒みる。戻り値は最後の結果イベント。
  function withProgress(fd, opts) {
    var meter = new Meter();
    var body = '';
    var showBody = !opts || opts.showBody !== false;
    panel.hidden = false;
    invEl.hidden = true;
    invEl.open = false;
    invListEl.innerHTML = '';
    previewEl.hidden = true;
    previewEl.textContent = '';
    previewEl.classList.remove('done');
    fillEl.style.width = '0%';
    gateEl.style.left = '0%';
    stageEl.textContent = T('js.reading');
    metaEl.textContent = '0';
    // 押した場所から離れた下の方に出るので、見えるところまで運んでやる。
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    var result = null;
    return runIngest(fd, function (ev) {
      if (ev.type === 'plan') {
        meter.plan(ev.stages);
        meter.enter(ev.stages[0].key);
        if (ev.route === 'chunked') {
          stageEl.textContent = T('js.chunked', { label: T('stage.' + ev.stages[0].key), n: ev.chunks });
        }
      } else if (ev.type === 'stage') {
        if (ev.phase === 'start') meter.enter(ev.stage);
        if (ev.stage === 'extract' && ev.phase === 'done') {
          meter.within(ev.index / ev.total);
          stageEl.textContent = T('js.extract', { i: ev.index, n: ev.total });
        }
        if (ev.stage === 'inventory' && ev.phase === 'done' && ev.items && ev.items.length) {
          hangTrims(ev.items, ev.count);
        }
        if (ev.stage === 'relate') stageEl.textContent = T('js.relate');
      } else if (ev.type === 'delta') {
        if (!showBody) return;
        body += ev.text;
        previewEl.hidden = false;
        // 下端に貼りついている間だけ自動で追う（読み返している人の邪魔をしない）。
        var stick = previewEl.scrollTop + previewEl.clientHeight >= previewEl.scrollHeight - 24;
        previewEl.textContent = body;
        if (stick) previewEl.scrollTop = previewEl.scrollHeight;
      } else if (ev.type === 'done' || ev.type === 'reconcile' || ev.type === 'error') {
        meter.finish();
        previewEl.classList.add('done');
        result = ev;
        return ev;
      }
      return result;
    }).then(function (ev) {
      meter.finish();
      return ev || result;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;                                       // 二重送信ブロック
    var files = fileInput.files;
    var text = (textInput.value || '').trim();
    if (!files.length && !text) { say(T('js.need_input'), true); return; }

    if (files.length > 1) runBatch(files);
    else runSingle(files.length ? files[0] : null, files.length ? null : text);
  });

  // 単発：ファイル1つ or テキスト。関連が高ければ確認画面へ。
  function runSingle(file, text) {
    lock('');
    var fd = new FormData();
    if (file) fd.append('file', file); else fd.append('text', text);
    fd.append('lang', currentLang());
    withProgress(fd)
      .then(function (ev) {
        if (!ev) throw new Error(T('js.error', { msg: '' }));
        if (ev.type === 'error') throw new Error(ev.error);
        if (ev.type === 'reconcile') { stageEl.textContent = T('js.similar'); window.location.href = ev.url; return; }
        stageEl.textContent = T('js.done');
        if (ev.aiUsed === false) say(T('js.ai_skipped'), true);
        window.location.href = '/notes/' + ev.id;
      })
      .catch(function (err) { panel.hidden = true; unlock(T('js.error', { msg: err.message }), true); });
  }

  // 複数：1ファイルずつ順番に送る（batch=1 で確認画面は出さず自動保存＋自動リンク）。
  // 本文の流し見はしない（次々に切り替わって落ち着かないため）。進捗バーだけ出す。
  function runBatch(files) {
    btn.disabled = true;
    btn.textContent = T('js.processing');
    var ok = 0, fail = 0, n = files.length;
    var i = 0;
    var lastError = null;
    function next() {
      if (i >= n) {
        panel.hidden = true;
        say(T('js.batch.done', { ok: ok }) + (fail ? T('js.batch.failed', { n: fail }) : '') +
            (lastError ? '　' + lastError : '') + T('js.batch.goto'), !!fail);
        setTimeout(function () { window.location.href = '/'; }, lastError ? 4000 : 1400);
        return;
      }
      say('(' + (i + 1) + '/' + n + ')　' + files[i].name);
      var fd = new FormData();
      fd.append('file', files[i]);
      fd.append('batch', '1');
      fd.append('lang', currentLang());
      withProgress(fd, { showBody: false })
        .then(function (ev) {
          if (ev && ev.type === 'done' && ev.id) { ok++; return; }
          fail++;
          if (ev && ev.type === 'error') lastError = ev.error;
        })
        .catch(function (err) {
          fail++;
          // 上限に達した場合は、残りを続けても無駄なのでここで止める。
          // 文面ではなく、サーバが付けた理由で判断する（言語が変わっても効くように）。
          if (err.quota) { lastError = err.message; i = n; }
        })
        .then(function () { i++; next(); });
    }
    next();
  }
})();
