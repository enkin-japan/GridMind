// デモ用シードデータ。API を使わず整形済みノートを直接投入する。
// デモアカウント（demo / demo1234）を作り、その配下に相互リンクした例ノートを入れる。
// 既存の user_id 無しノートはデモに引き取る。使い方: npm run seed
require('dotenv').config();
const db = require('../models/db');
const users = require('../models/users');
const notes = require('../models/notes');
const { run, get } = require('../models/db');

const DEMO = { username: 'demo', password: 'demo1234' };

const demoNotes = [
  {
    title: '機械学習の概要',
    summary: '機械学習の3分類（教師あり・教師なし・強化学習）を整理したノート。',
    tagNames: ['機械学習', 'AI', '入門'],
    body_md: [
      '# 機械学習の概要', '',
      'データからパターンを学習する手法の総称。大きく3種類に分けられる。', '',
      '## 分類',
      '- [[教師あり学習]]：入力と正解ラベルのペアで学習する',
      '- 教師なし学習：ラベルなしデータから構造を見つける',
      '- 強化学習：報酬を最大化する行動を学習する', '',
      '## 基礎となる数学',
      '- [[線形代数]]：ベクトル・行列の演算が土台になる',
    ].join('\n'),
  },
  {
    title: '教師あり学習',
    summary: '回帰と分類の違いをまとめたノート。',
    tagNames: ['機械学習', '教師あり学習'],
    body_md: [
      '# 教師あり学習', '',
      '入力 `x` と正解 `y` のペアから、`x → y` の対応を学習する。', '',
      '| 種類 | 出力 | 例 |', '| --- | --- | --- |',
      '| 回帰 | 連続値 | 価格の予測 |', '| 分類 | カテゴリ | スパム判定 |', '',
      '前提となる数学は [[線形代数]] を参照。',
    ].join('\n'),
  },
  {
    title: '線形代数',
    summary: '機械学習で使うベクトル・行列の基礎。',
    tagNames: ['数学', '線形代数'],
    body_md: [
      '# 線形代数', '',
      'ベクトルと行列を扱う数学。機械学習のほぼ全てのアルゴリズムの土台。', '',
      '- ベクトル：数値の並び',
      '- 行列：ベクトルの並び。線形変換を表す', '',
      '応用先は [[機械学習の概要]] を参照。',
    ].join('\n'),
  },
];

(async () => {
  try {
    await db.init();

    let u = await users.findByUsername(DEMO.username);
    const demoId = u ? u.id : await users.create(DEMO.username, DEMO.password);

    // API キーはサービス側（.env）が持つので、アカウントごとの設定は不要。
    if (!process.env.OPENAI_API_KEY) {
      console.warn('※ .env に OPENAI_API_KEY がありません。AI 整理は動きません。');
    }

    // 既存の所有者なしノートをデモに引き取る
    const orphan = await run('UPDATE notes SET user_id = ? WHERE user_id IS NULL', [demoId]);
    if (orphan.changes) console.log(`所有者なしノート ${orphan.changes} 件を demo に移管`);

    // デモがまだノートを持っていなければ例ノートを投入
    const cnt = await get('SELECT COUNT(*) AS c FROM notes WHERE user_id = ?', [demoId]);
    if (cnt.c === 0) {
      for (const n of demoNotes) {
        await notes.create({ ...n, source_type: 'paste', userId: demoId });
        console.log('seeded:', n.title);
      }
    } else {
      console.log(`demo は既に ${cnt.c} 件のノートを持つため、例ノートの投入はスキップ`);
    }

    console.log('done. ログイン: demo / demo1234 →  npm start');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
