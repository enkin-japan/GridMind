// 提出資料（企画書・UI仕様書・画面一覧・発表資料）に貼る画面写真を撮る。
//
//   node tools/doc_shots.js                              … 通常の画面をひととおり
//   LIVE_FILE=<資料> node tools/doc_shots.js --live       … 取り込みの実演も撮る
//   LIVE_FILE=<資料> node tools/doc_shots.js --live-only  … 実演だけ撮り直す
//   node tools/doc_shots.js --force                      … 既にある写真も撮り直す
//
// tools/shots.js が「見た目の作り込みを確かめる」ためのものなのに対し、
// こちらは「資料に貼る1枚」を撮るためのもの。明るい方だけ・決まった名前で出す。
//
// 【途中で落ちても撮り直しにならないようにしてある】
// 撮影中にブラウザが落ちることがある（機械のメモリが逼迫すると OS に止められる）。
// --live は実際に API を呼ぶ＝お金がかかるので、すでにある写真は撮らずに飛ばし、
// 落ちた続きから拾えるようにする。撮り直したいときだけ --force を付ける。
function loadPlaywright() {
  for (const t of ['playwright-core', 'playwright', process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
    try { return require(t); } catch (e) { /* 次を試す */ }
  }
  console.error('playwright-core が見つかりません。`npm i -D playwright-core` を実行してください。');
  process.exit(1);
}
const { chromium } = loadPlaywright();
const fs = require('fs');
const path = require('path');

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:3999';
const OUT = process.env.SHOT_OUT || path.join(__dirname, '..', 'screenshots');
const USER = { username: 'demo', password: 'demo1234' };
const LIVE_ONLY = process.argv.includes('--live-only');
const GATE_ONLY = process.argv.includes('--gate-only');
const LIVE = process.argv.includes('--live') || LIVE_ONLY || GATE_ONLY;
const FORCE = process.argv.includes('--force');
const W = 1400;
const H = 940;

fs.mkdirSync(OUT, { recursive: true });

// すでに撮ってあるものは飛ばす（落ちたときの撮り直しを減らすため）。
function done(name) {
  return !FORCE && fs.existsSync(path.join(OUT, name + '.png'));
}

async function login(ctx) {
  const p = await ctx.newPage();
  await p.goto(BASE + '/login');
  await p.fill('input[name="username"]', USER.username);
  await p.fill('input[name="password"]', USER.password);
  await p.click('button[type="submit"]');
  await p.waitForURL(BASE + '/');
  await p.close();
}

async function shot(page, name, full = false) {
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full });
  console.log('  ', name + '.png');
}

async function grab(ctx, name, url, opts) {
  const o = opts || {};
  if (done(name)) { console.log('   -', name + '.png（既にあり）'); return; }
  const page = await ctx.newPage();
  await page.setViewportSize({ width: W, height: o.h || H });
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (o.prep) await o.prep(page);
  await shot(page, name, !!o.full);
  await page.close();
}

function ctxOpts(extra) {
  return Object.assign({
    viewport: { width: W, height: H },
    colorScheme: 'light',
    locale: 'ja-JP',        // 画面の言語を機械まかせにしない
    deviceScaleFactor: 2,
  }, extra || {});
}

// cookie で画面の言語を切りかえる（アカウント側の ui_lang が空のときだけ効く）。
function langCookies(lang) {
  return [{ name: 'gm_lang', value: lang, url: BASE }];
}

// メモリを使いすぎない起動指定。無頭でも既定では GPU まわりを抱えるので落としておく。
function launch() {
  return chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions', '--mute-audio'],
  });
}


// 遷移を待つ。page.waitForURL は使わない。
//
// 【なぜ自前で待つか】
// 取り込みの最中（NDJSON を受けている間）に waitForURL で黙って待つと、
// 画面が切りかわる瞬間に無頭 Chrome ごと落ちることがある——実測で3回連続。
// 一方、1〜3秒おきに page.evaluate を投げながら待つと通る（実測2回とも成功）。
// CDP に何も流れない時間を作らないのが要点なので、心拍を打ちながら待つ。
async function waitUrl(page, match, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1500);
    try {
      await page.evaluate(() => document.readyState);   // 心拍
    } catch (e) { /* 遷移の最中は届かないことがある */ }
    const u = page.url();
    const hit = match instanceof RegExp ? match.test(u) : u.indexOf(match) >= 0;
    if (hit) {
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(600);
      return u;
    }
  }
  throw new Error('遷移を待ちきれませんでした: ' + page.url());
}

// 取り込みの実演。実際に資料を1件流して、進捗・対照・統合を撮る。
async function liveRun(ctx) {
  const src = process.env.LIVE_FILE;
  if (!src) { console.error('--live には LIVE_FILE（資料のパス）が要ります。'); process.exit(1); }

  const page = await ctx.newPage();
  await page.setViewportSize({ width: W, height: 1040 });
  await page.goto(BASE + '/notes/import', { waitUntil: 'networkidle' });
  await page.setInputFiles('#import-file', src);
  await page.waitForTimeout(300);
  if (!done('06_import_picked')) await shot(page, '06_import_picked');
  await page.click('#import-submit');

  // 進捗が出ているところを撮る。ゲートは頁の下の方にあるので、画面に入れてから撮る。
  await page.waitForSelector('#ingest:not([hidden])', { timeout: 20000 });
  const gate = page.locator('#ingest');
  await gate.scrollIntoViewIfNeeded();
  await page.waitForTimeout(8500);
  await gate.scrollIntoViewIfNeeded();
  await shot(page, '07_gate_early');

  // 知識項目の一覧を開き、本文が流れているところをもう1枚。
  await page.waitForTimeout(11000);
  const inv = page.locator('#ingest-inv');
  if (await inv.count()) await inv.evaluate((el) => { el.open = true; });
  await page.waitForTimeout(600);
  await gate.scrollIntoViewIfNeeded();
  await shot(page, '07_gate');
  await gate.screenshot({ path: path.join(OUT, '07_gate_zoom.png') });
  console.log('   07_gate_zoom.png');

  // 進捗だけ撮りたいときは、ここで切り上げる（取り込み自体はサーバ側で走りきる）。
  if (GATE_ONLY) { await page.close(); return; }

  // 対照ページへ移るのを待つ。
  await waitUrl(page, '/notes/reconcile', 240000);
  await page.setViewportSize({ width: W, height: 1100 });
  if (!done('08_reconcile')) await shot(page, '08_reconcile');

  // まとめプレビュー（ここでは保存しない＝データは増やさない）。
  //
  // 【なぜフォーム送信で待たないか】
  // 統合は AI を呼ぶので応答まで20〜40秒かかる。その間ずっと「遷移の最中」になり、
  // 心拍（page.evaluate）が一度も通らない。この状態が続くと無頭 Chrome ごと落ちる
  // ——実測で3回連続。対照ページ側は遷移中ではないので心拍が通り、落ちなかった。
  // そこで画面の中から fetch し、返ってきた HTML をそのまま描き直す。
  // 出てくるものはサーバの応答そのものなので、写真としては同じ。
  await page.evaluate(() => {
    window.__merge = null;
    window.__mergeErr = null;
    fetch('/notes/reconcile/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    })
      .then((r) => r.text())
      .then((t) => { window.__merge = t; })
      .catch((e) => { window.__mergeErr = String(e); });
  });

  let html = null;
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ h: window.__merge, e: window.__mergeErr }));
    if (r.e) throw new Error('統合の取得に失敗: ' + r.e);
    if (r.h) { html = r.h; break; }
  }
  if (!html) throw new Error('統合プレビューを待ちきれませんでした');

  await page.evaluate((h) => { document.open(); document.write(h); document.close(); }, html);
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: W, height: 1100 });
  await shot(page, '09_merge');
  await page.close();
}

(async () => {
  let browser = await launch();

  // --- ログイン前 ---
  if (!LIVE_ONLY) {
    const c = await browser.newContext(ctxOpts());
    await c.addCookies(langCookies('ja'));
    await grab(c, '01_login', '/login');
    await grab(c, '02_register', '/register');
    await c.close();
  }

  // --- ログイン後の主要画面（日本語・明るい方）---
  let ctx = await browser.newContext(ctxOpts());
  await ctx.addCookies(langCookies('ja'));
  await login(ctx);

  if (!LIVE_ONLY) {
    await grab(ctx, '03_home', '/');
    await grab(ctx, '04_detail', '/notes/116', { h: 1180 });
    await grab(ctx, '05_new', '/notes/new');
    await grab(ctx, '06_import', '/notes/import', { h: 1040 });
    await grab(ctx, '10_settings', '/settings', { h: 1400 });
    await grab(ctx, '14_tags', '/', {
      prep: async function (page) {
        const d = page.locator('details.tags');
        if (await d.count()) { await d.locator('summary').click(); await page.waitForTimeout(250); }
      },
    });

    // --- 画面の言語 4種（日本語は 03_home が兼ねる）---
    // context は1つずつ開いて閉じる（同時に何本も持たない）。
    const LANGS = [['en', '11_lang_en'], ['zh', '11_lang_zh'], ['zh-TW', '11_lang_zhTW'], ['ko', '11_lang_ko']];
    for (const pair of LANGS) {
      if (done(pair[1])) { console.log('   -', pair[1] + '.png（既にあり）'); continue; }
      const c = await browser.newContext(ctxOpts());
      await c.addCookies(langCookies(pair[0]));
      await login(c);
      await grab(c, pair[1], '/');
      await c.close();
    }

    // --- 暗い方 ---
    if (!done('12_dark_home') || !done('12_dark_detail')) {
      const c = await browser.newContext(ctxOpts({ colorScheme: 'dark' }));
      await c.addCookies(langCookies('ja'));
      await login(c);
      await grab(c, '12_dark_home', '/');
      await grab(c, '12_dark_detail', '/notes/116', { h: 1180 });
      await c.close();
    }
  }

  // --- 取り込みの実演 ---
  // 【なぜやり直すか】
  // 取り込みが終わって画面が切りかわる瞬間に、無頭 Chrome が落ちることがある。
  // 実測では同じ手順で4回中3回落ち、1回は最後まで通った＝時々起きるすれ違い。
  // アプリ側は毎回ちゃんと終わっている（サーバの記録も対照ページの用意も残る）ので、
  // 撮影の側で立て直して撮り直す。撮れた写真は残るので、やり直しても無駄にならない。
  if (LIVE && (GATE_ONLY || FORCE || !done('08_reconcile') || !done('09_merge'))) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await liveRun(ctx);
        break;
      } catch (e) {
        const msg = e.message.split('\n')[0];
        console.error(`   実演の撮影に失敗（${attempt}回目）: ${msg}`);
        if (attempt === 3) throw e;
        try { await ctx.close(); } catch (_) { /* もう死んでいる */ }
        try { await browser.close(); } catch (_) { /* 同上 */ }
        browser = await launch();
        ctx = await browser.newContext(ctxOpts());
        await ctx.addCookies(langCookies('ja'));
        await login(ctx);
      }
    }
  }

  await ctx.close();
  await browser.close();
  console.log('\n→', OUT);
})().catch(function (e) { console.error(e); process.exit(1); });
