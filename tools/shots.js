// 見た目の確認用。無頭の Chrome で画面を撮る（アプリの一部ではない・git 管理外）。
//
//   node tools/shots.js            … 明暗そろえて撮る
//   node tools/shots.js --dark     … 暗い方だけ
//
// Playwright のブラウザは落とさず、入っている Chrome をそのまま動かす。
// 使う前に: npm i -D playwright-core
//   ブラウザ本体は落とさない（channel:'chrome' で入っている Chrome を動かす）。
//   置き場所を選ばないよう、いくつか探してから読みこむ。
const path = require('path');
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

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  for (const scheme of (process.argv.includes('--dark') ? ['dark'] : ['light', 'dark'])) {
    console.log(`--- ${scheme} ---`);
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: scheme,
      deviceScaleFactor: 2,
    });

    // ログイン（セッションを ctx 全体で使いまわす）
    const login = await ctx.newPage();
    await login.goto(BASE + '/login');
    await login.fill('input[name="username"]', USER.username);
    await login.fill('input[name="password"]', USER.password);
    await login.click('button[type="submit"]');
    await login.waitForURL(BASE + '/');
    await login.close();

    const s = (n, u, p) => shoot(ctx, `${scheme}-${n}`, u, p);

    await s('home', '/');
    await s('detail', '/', async (page) => {
      const card = page.locator('.card').first();
      if (await card.count()) { await card.click(); await page.waitForLoadState('networkidle'); }
    });
    await s('settings', '/settings');
    await s('import', '/notes/import');

    // 焦点表示：Tab を送って、輪郭が出ているところを撮る
    await s('focus-button', '/notes/import', async (page) => {
      await page.locator('#import-submit').focus();
    });
    await s('focus-input', '/notes/new', async (page) => {
      await page.locator('input[name="title"]').focus();
    });

    // 無効・hover・通知・エラー欄を1枚にまとめて確認する
    await s('states', '/notes/import', async (page) => {
      await page.evaluate(() => {
        const box = document.createElement('div');
        box.style.cssText = 'display:flex;flex-direction:column;gap:14px;margin:20px 0;';
        box.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button class="btn primary">主ボタン</button>
            <button class="btn primary" disabled>処理中…</button>
            <button class="btn">既定</button>
            <button class="btn danger">削除</button>
            <button class="btn ghost">リンクせず保存</button>
            <span class="badge">利用中</span>
          </div>
          <p class="notice ok">出力言語を保存しました。</p>
          <p class="notice warn">プロプランの受付は準備中です。</p>
          <div class="errors">タイトルは必ず入力してください。</div>
          <div class="pager"><a class="page" href="#">1</a><a class="page active" href="#">2</a><a class="page" href="#">3</a></div>
          <div class="tag-cloud"><a class="tag-chip" href="#">JavaScript <span class="count">7</span></a><a class="tag-chip active" href="#">IoT <span class="count">3</span></a></div>`;
        document.querySelector('.container').prepend(box);
        // 取り込み中の進捗も、費用をかけずに見た目だけ再現する
        const ing = document.getElementById('ingest');
        if (ing) {
          ing.hidden = false;
          document.getElementById('ingest-fill').style.width = '62%';
          document.getElementById('ingest-stage').textContent = '本文を書いています';
          document.getElementById('ingest-meta').textContent = '62%';
          const inv = document.getElementById('ingest-inv');
          inv.hidden = false;
          document.getElementById('ingest-inv-n').textContent = '(61件)';
          document.getElementById('ingest-inv-list').innerHTML =
            ['リーダーシップの4種類', 'メンバーシップの役割', '意思決定の責任者の明確化']
              .map((t) => `<li>${t}</li>`).join('');
          const pv = document.getElementById('ingest-preview');
          pv.hidden = false;
          pv.textContent = '## チームマネジメントの基礎\n- リーダーシップに決まった形はなく、自分らしさの先にある。4種類が知られている。\n- メンバーシップは、良い意思決定をしても実行されなければ成果にならない';
        }
      });
      await page.waitForTimeout(300);
    });

    // 取り込み中の進捗だけを、費用をかけずに見た目で確かめる
    await s('ingest', '/notes/import', async (page) => {
      await page.evaluate(() => {
        document.getElementById('ingest').hidden = false;
        document.getElementById('ingest-fill').style.width = '62%';
        document.getElementById('ingest-stage').textContent = '本文を書いています';
        document.getElementById('ingest-meta').textContent = '62%';
        const inv = document.getElementById('ingest-inv');
        inv.hidden = false;
        inv.open = true;
        document.getElementById('ingest-inv-n').textContent = '(61件)';
        document.getElementById('ingest-inv-list').innerHTML =
          ['リーダーシップの4種類', 'メンバーシップの役割', '意思決定の責任者の明確化', '報連相の位置づけ']
            .map((t) => `<li>${t}</li>`).join('');
        const pv = document.getElementById('ingest-preview');
        pv.hidden = false;
        pv.textContent =
          '## チームマネジメントの基礎\n'
          + '- リーダーシップに決まった形はなく、自分らしさの先にある。4種類が知られている。\n'
          + '- メンバーシップは、良い意思決定をしても実行されなければ成果にならないという前提に立つ役割で、';
        document.getElementById('ingest-submit') || document.getElementById('import-submit').setAttribute('disabled', '');
        document.getElementById('import-submit').textContent = '処理中…';
      });
      await page.locator('#ingest').scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    });

    await ctx.close();
  }

  await browser.close();
  console.log('\n→', OUT);
})().catch((e) => { console.error(e); process.exit(1); });
