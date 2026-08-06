// GridMind クライアント JS
(function () {
  'use strict';

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
      btn.innerHTML = '処理中…';
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
  var BTN_LABEL = btn.textContent;

  function currentLang() { return langInput ? langInput.value : 'auto'; }

  function lock(msg) { btn.disabled = true; btn.textContent = '処理中…'; statusEl.textContent = msg; }
  function unlock(msg) { btn.disabled = false; btn.textContent = BTN_LABEL; if (msg) statusEl.textContent = msg; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;                                       // 二重送信ブロック
    var files = fileInput.files;
    var text = (textInput.value || '').trim();
    if (!files.length && !text) { statusEl.textContent = 'ファイルかテキストを入力してください。'; return; }

    if (files.length > 1) runBatch(files);
    else runSingle(files.length ? files[0] : null, files.length ? null : text);
  });

  // 単発：ファイル1つ or テキスト。関連が高ければ確認画面へ。
  function runSingle(file, text) {
    lock('AI が整理中…（長い資料は分けて読むため、少し時間がかかります）');
    var fd = new FormData();
    if (file) fd.append('file', file); else fd.append('text', text);
    fd.append('lang', currentLang());
    fetch('/notes/ingest', { method: 'POST', body: fd })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || '取り込みに失敗しました。');
        if (res.j.reconcile) { window.location.href = res.j.url; return; }
        if (res.j.aiUsed === false) { statusEl.textContent = 'APIキー未設定のため AI 整理はスキップし、変換テキストで保存しました。'; }
        window.location.href = '/notes/' + res.j.id;
      })
      .catch(function (err) { unlock('エラー: ' + err.message); });
  }

  // 複数：1ファイルずつ順番に送る（batch=1 で確認画面は出さず自動保存＋自動リンク）。
  function runBatch(files) {
    btn.disabled = true;
    btn.textContent = '処理中…';
    var ok = 0, fail = 0, n = files.length;
    var i = 0;
    var lastError = null;
    function next() {
      if (i >= n) {
        statusEl.textContent =
          '完了：' + ok + ' 件を取り込みました' + (fail ? '（' + fail + ' 件は失敗）' : '') +
          (lastError ? '　' + lastError : '') + '　ホームに移動します…';
        setTimeout(function () { window.location.href = '/'; }, lastError ? 4000 : 1400);
        return;
      }
      statusEl.textContent = '処理中… (' + (i + 1) + '/' + n + ')　' + files[i].name;
      var fd = new FormData();
      fd.append('file', files[i]);
      fd.append('batch', '1');
      fd.append('lang', currentLang());
      fetch('/notes/ingest', { method: 'POST', body: fd })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok && res.j.id) { ok++; return; }
          fail++;
          // 上限に達した場合は、残りを続けても無駄なのでここで止める。
          if (res.j && (res.j.reason === 'MONTHLY_LIMIT')) { lastError = res.j.error; i = n; }
        })
        .catch(function () { fail++; })
        .then(function () { i++; next(); });
    }
    next();
  }
})();
