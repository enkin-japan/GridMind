// 既存ノートの意味ベクトルをまとめて作る。
//
// 使いどころ:
//   ・ベクトル機能を入れる前から在るノート
//   ・EMBEDDING_MODEL を変えたあと（古いモデルの行は使われなくなるため）
// 実行: npm run embed:backfill
//
// 何度実行しても安全（すでにベクトルがある分は飛ばす）。
require('dotenv').config();
const db = require('../models/db');
const embeddings = require('../models/embeddings');
const embed = require('../services/embed');

const BATCH = 64;

(async () => {
  try {
    await db.init();

    if (!embed.ENABLED) {
      console.log('EMBEDDING_ENABLED=0 のため何もしません。');
      process.exit(0);
    }

    const rows = await embeddings.missing();
    if (!rows.length) {
      console.log(`ベクトルが必要なノートはありません（モデル: ${embed.MODEL}）。`);
      process.exit(0);
    }
    console.log(`${rows.length} 件のノートにベクトルを作ります（モデル: ${embed.MODEL}）…`);

    let done = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const texts = slice.map((n) =>
        embed.textForNote({ title: n.title, summary: n.summary, body_text: n.body_text })
      );
      const vecs = await embed.embedMany(texts);
      for (let j = 0; j < slice.length; j += 1) {
        if (vecs[j]) {
          await embeddings.save(slice[j].id, slice[j].user_id, vecs[j]);
          done += 1;
        } else {
          failed += 1;
        }
      }
      console.log(`  ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }

    console.log(`完了：${done} 件を作成${failed ? `（${failed} 件は失敗）` : ''}。`);
    process.exit(0);
  } catch (e) {
    console.error('失敗:', e);
    process.exit(1);
  }
})();
