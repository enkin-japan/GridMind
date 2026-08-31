// 見た目の確認用。無頭の Chrome で画面を撮る（アプリの一部ではない）。
//
//   node tools/shots.js            … 明暗そろえて撮る
//   node tools/shots.js --dark     … 暗い方だけ
//   SHOT_W=390 node tools/shots.js … 幅を変える（細い画面の確認）
//
// Playwright のブラウザは落とさず、入っている Chrome をそのまま動かす。
// playwright-core は devDependencies に入っているので npm i だけでよい。
//   置き場所を選ばないよう、いくつか探してから読みこむ。
function loadPlaywright() {
  const tries = ['playwright-core', 'playwright', process.env.PLAYWRIGHT_PATH].filter(Boolean);
  for (const t of tries) {
    try { return require(t); } catch (e) { /* 次を試す */ }
  }
  console.error('playwright-core が見つかりません。`npm i -D playwright-core` を実行してください。');
  console.error('別の場所に入れてある場合は PLAYWRIGHT_PATH にその絶対パスを渡してください。');
  process.exit(1);
}
const { chromium } = loadPlaywright();

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:3999';
const OUT = process.env.SHOT_OUT || '/tmp/shots';
const W = Number(process.env.SHOT_W) || 1280;
const H = Number(process.env.SHOT_H) || 900;
const USER = { username: 'demo', password: 'demo1234' };

const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

async function shoot(ctx, name, url, prep) {
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  if (prep) await prep(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  await page.close();
  console.log('  ', name + '.png');
}

// ゲート（取り込み中）の見た目を、費用をかけずに再現する。
function fakeGate(open) {
  const ing = document.getElementById('ingest');
  if (!ing) return;
  ing.hidden = false;
  document.getElementById('ingest-fill').style.width = '62%';
  document.getElementById('ingest-gate').style.left = '62%';
  document.getElementById('ingest-stage').textContent = '本文を書いています';
  document.getElementById('ingest-meta').textContent = '62';
  const inv = document.getElementById('ingest-inv');
  inv.hidden = false;
  inv.open = !!open;
  document.getElementById('ingest-inv-n').textContent = '61 件';
  document.getElementById('ingest-inv-list').innerHTML =
    ['リーダーシップの4種類', 'メンバーシップの役割', '意思決定の責任者の明確化', '報連相の位置づけ']
      .map((t) => `<li>${t}</li>`).join('');
  const pv = document.getElementById('ingest-preview');
  pv.hidden = false;
  pv.textContent =
    '## チームマネジメントの基礎\n'
    + '- リーダーシップに決まった形はなく、自分らしさの先にある。4種類が知られている。\n'
    + '- メンバーシップは、良い意思決定をしても実行されなければ成果にならないという前提に立つ役割で、';
  const b = document.getElementById('import-submit');
  if (b) { b.setAttribute('disabled', ''); b.textContent = '処理中…'; }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const scheme of (process.argv.includes('--dark') ? ['dark'] : ['light', 'dark'])) {
    console.log(`--- ${scheme} (${W}x${H}) ---`);
    const ctx = await browser.newContext({
      viewport: { width: W, height: H },
      colorScheme: scheme,
      deviceScaleFactor: 2,
    });
    const s = (n, u, p) => shoot(ctx, `${scheme}-${n}`, u, p);

    // ログイン前の画面を先に撮る
    await s('login', '/login');

    // ログイン（セッションを ctx 全体で使いまわす）
    const login = await ctx.newPage();
    await login.goto(BASE + '/login');
    await login.fill('input[name="username"]', USER.username);
    await login.fill('input[name="password"]', USER.password);
    await login.click('button[type="submit"]');
    await login.waitForURL(BASE + '/');
    await login.close();

    await s('home', '/');
    await s('home-hover', '/', async (page) => {
      const f = page.locator('.frame').first();
      if (await f.count()) await f.hover();
      await page.waitForTimeout(200);
    });
    await s('detail', '/', async (page) => {
      const f = page.locator('.frame').first();
      if (await f.count()) { await f.click(); await page.waitForLoadState('networkidle'); }
    });
    await s('new', '/notes/new');
    await s('settings', '/settings');
    await s('import', '/notes/import');
    await s('gate', '/notes/import', async (page) => {
      await page.evaluate(fakeGate, true);
      await page.locator('#ingest').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });

    // 焦点表示：輪郭が出ているところを撮る
    await s('focus', '/notes/new', async (page) => {
      await page.locator('input[name="title"]').focus();
    });

    // 状態を1枚にまとめて確認する
    await s('states', '/notes/import', async (page) => {
      await page.evaluate(() => {
        const box = document.createElement('div');
        box.style.cssText = 'display:flex;flex-direction:column;gap:14px;margin-bottom:24px;';
        box.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn primary">主ボタン</button>
            <button class="btn primary" disabled>処理中…</button>
            <button class="btn">既定</button>
            <button class="btn danger">削除</button>
            <button class="btn ghost">リンクせず保存</button>
            <span class="badge">利用中</span>
            <span class="ctr"><span>12</span><span class="sep">/</span><span>30</span><span class="unit">回</span></span>
          </div>
          <p class="notice ok">出力言語を保存しました。</p>
          <p class="notice warn">プロプランの受付は準備中です。</p>
          <ul class="errors"><li>タイトルは必ず入力してください。</li></ul>
          <div class="pager"><a class="page" href="#">1</a><a class="page active" href="#">2</a><a class="page" href="#">3</a></div>
          <div class="tape-row" style="margin:0"><a class="tape" href="#">JavaScript <span class="count">7</span></a><a class="tape active" href="#">IoT <span class="count">3</span></a></div>`;
        document.querySelector('.container').prepend(box);
      });
      await page.waitForTimeout(300);
    });

    await ctx.close();
  }

  await browser.close();
  console.log('\n→', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
