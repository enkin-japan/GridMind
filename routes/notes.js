// ノートの Controller（追加・取り込み・詳細・編集・削除）。すべて本人のノートに限定。
// 更新系は POST（PUT/DELETE は使わない）。ログイン必須（app.js で requireAuth を適用）。
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const notes = require('../models/notes');
const links = require('../services/links');
const ai = require('../services/ai');
const ingest = require('../services/ingest');
const relate = require('../services/relate');
const quota = require('../services/quota');
const embed = require('../services/embed');
const { renderMarkdown } = require('../services/render');

// 実測では図の多い講義資料が 15MB 近くまで行く（1件は上限まで残り 3KB だった）。
// 余裕を持たせつつ、際限なく受けないよう上限は残す。
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 40;
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

// multer 自身のエラー（サイズ超過など）を JSON で返す。
// 取り込みは fetch から呼ばれるため、HTML のエラーページを返すと表示できない。
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `ファイルが大きすぎます（上限 ${MAX_UPLOAD_MB}MB）。`,
        reason: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({ error: 'ファイルを受け取れませんでした。' });
  });
}

function parseTags(str = '') {
  return String(str).split(/[,、]/).map((s) => s.trim()).filter(Boolean);
}

const validate = [body('title', 'タイトルは必ず入力してください。').trim().notEmpty()];

// --- 追加フォーム ---
router.get('/new', (req, res) => {
  res.render('notes/form', { title: '新規ノート', mode: 'new', note: null, errors: [] });
});

// --- 作成 ---
router.post('/new', validate, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('notes/form', { title: '新規ノート', mode: 'new', note: req.body, errors: errors.array() });
  }
  try {
    const id = await notes.create({
      title: req.body.title,
      body_md: req.body.body_md || '',
      source_type: 'paste',
      tagNames: parseTags(req.body.tags),
      userId: req.session.userId,
    });
    res.redirect(`/notes/${id}`);
  } catch (e) {
    next(e);
  }
});

// --- 取り込み画面 ---
router.get('/import', async (req, res, next) => {
  try {
    const user = res.locals.user;
    const q = await quota.check(user, 0);
    res.render('notes/import', {
      title: '取り込み',
      plan: q.plan,
      usage: q.usage,
      languages: ai.LANGUAGES,
      defaultLang: user.out_lang || 'auto',
    });
  } catch (e) {
    next(e);
  }
});

// --- 取り込み実行（fetch から呼ばれ JSON を返す）---
// API キーはサービス側が持つ。利用者はプランの範囲内で使う。
router.post('/ingest', uploadSingle, async (req, res, next) => {
  const user = res.locals.user;
  const userId = user.id;
  try {
    // 1) 回数の上限を先に見る（変換の費用を払う前に断る）。
    const pre = await quota.check(user, 0);
    if (!pre.ok) return res.status(429).json({ error: pre.message, reason: pre.reason });

    // 2) ファイル → Markdown（元ファイルは必ず消す）。
    let markdown = '';
    if (req.file) {
      try {
        markdown = await ingest.fileToMarkdown(req.file.path);
      } catch (e) {
        if (e.message === 'BRIDGE_BUSY') {
          return res.status(503).json({ error: 'ただいま混み合っています。少し待ってからお試しください。' });
        }
        return res.status(422).json({ error: 'このファイルは読み取れませんでした。' });
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } else {
      markdown = req.body.text || '';
    }
    if (!markdown.trim()) return res.status(400).json({ error: '内容が空です。' });

    // 3) 文字数の上限を見る（変換してからでないと本当の長さが分からない）。
    const post = await quota.check(user, markdown.length);
    if (!post.ok) return res.status(413).json({ error: post.message, reason: post.reason });

    // 4) AI 整理。出力言語は指定があればそれ、無ければアカウントの既定。
    const lang = req.body.lang || user.out_lang || 'auto';
    let data;
    let aiUsed = false;
    try {
      data = await ai.structure(markdown, { lang });
      aiUsed = true;
    } catch (e) {
      console.error('[ingest] AI 整理に失敗:', e.message);
      data = null;
    }
    // 使用量の記録は AI 整理とは切り離す。
    // ここを同じ try に入れていたため、記録の失敗で整理済みの結果まで
    // 捨てられ、しかも「AI 整理に失敗」と表示されて原因が見えなくなっていた。
    if (data) {
      try {
        await quota.record(userId, { kind: 'ingest', docChars: markdown.length, usage: data.usage });
      } catch (e) {
        console.error('[ingest] 使用量の記録に失敗（整理結果は保存します）:', e.message);
      }
    }
    if (!data || !data.body_md) {
      // AI が使えない／知識が無いと判断された場合は、変換したテキストをそのまま残す。
      const firstLine = markdown.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 60);
      data = { title: firstLine || '無題', body_md: markdown, summary: null, tags: [] };
      aiUsed = false;
    }

    const staged = {
      title: data.title,
      body_md: data.body_md,
      summary: data.summary,
      tags: data.tags || [],
      source_type: req.file ? 'upload' : 'paste',
      body_text: notes.toPlainText(data.body_md),
    };

    // 意味ベクトルはここで1回だけ作り、関連づけと保存の両方で使いまわす。
    // （ベクトルはセッションに入れると大きすぎるので staged には持たせない）
    let stagedEmb = null;
    try {
      stagedEmb = await embed.embed(
        embed.textForNote({ title: staged.title, summary: staged.summary, body_text: staged.body_text, tags: staged.tags })
      );
    } catch (e) {
      console.error('[ingest] ベクトル生成に失敗:', e.message);
    }

    // 二次整理：関連する既存ノートを探す
    const isBatch = String(req.body.batch || '') === '1'; // 複数ファイルの一括処理は非対話
    const related = await relate.findRelated(userId, staged, { vec: stagedEmb ? stagedEmb.vec : null });
    const top = related[0];

    if (!isBatch && top && top.score >= relate.HIGH) {
      // 高関連（単発のみ）→ session に退避して対照ページへ
      req.session.pending = {
        note: staged, aiUsed, topId: top.id,
        autoLink: related.slice(1).map((r) => r.title),
      };
      return res.json({ reconcile: true, url: '/notes/reconcile' });
    }

    // バッチ時は確認画面を出さず、関連（中以上）を自動リンクして保存する。
    // 単発の中関連 → 自動リンク／低関連 → そのまま保存。
    let body = staged.body_md;
    const mediums = related.filter((r) => r.score >= relate.MEDIUM);
    if (mediums.length) body = relate.addRelatedLinks(body, mediums.map((r) => r.title));

    const id = await notes.create({
      title: staged.title, body_md: body, summary: staged.summary,
      source_type: staged.source_type, tagNames: staged.tags, userId,
      embedding: stagedEmb,
    });
    res.json({ id, aiUsed, linked: mediums.map((r) => r.title) });
  } catch (e) {
    next(e);
  }
});

// --- 二次整理：対照ページ（高関連の新旧を並べて確認）---
router.get('/reconcile', async (req, res, next) => {
  const userId = req.session.userId;
  const p = req.session.pending;
  if (!p) return res.redirect('/');
  try {
    const old = await notes.findById(p.topId, userId);
    if (!old) {
      // 相手が消えていたらそのまま保存
      const id = await notes.create({
        title: p.note.title, body_md: p.note.body_md, summary: p.note.summary,
        source_type: p.note.source_type, tagNames: p.note.tags, userId,
      });
      req.session.pending = null;
      return res.redirect('/notes/' + id);
    }
    const newHtml = await renderMarkdown(p.note.body_md, userId);
    const oldHtml = await renderMarkdown(old.body_md, userId);
    res.render('notes/reconcile', { title: '関連の確認', staged: p.note, old, newHtml, oldHtml });
  } catch (e) {
    next(e);
  }
});

// 関連づけて保存（新ノートを作り、旧ノートへ [[リンク]]）
router.post('/reconcile/link', async (req, res, next) => {
  const userId = req.session.userId;
  const p = req.session.pending;
  if (!p) return res.redirect('/');
  try {
    const old = await notes.findById(p.topId, userId);
    const titles = [old ? old.title : null, ...(p.autoLink || [])].filter(Boolean);
    const body = relate.addRelatedLinks(p.note.body_md, titles);
    const id = await notes.create({
      title: p.note.title, body_md: body, summary: p.note.summary,
      source_type: p.note.source_type, tagNames: p.note.tags, userId,
    });
    req.session.pending = null;
    res.redirect('/notes/' + id);
  } catch (e) {
    next(e);
  }
});

// リンクせずそのまま保存
router.post('/reconcile/plain', async (req, res, next) => {
  const userId = req.session.userId;
  const p = req.session.pending;
  if (!p) return res.redirect('/');
  try {
    const id = await notes.create({
      title: p.note.title, body_md: p.note.body_md, summary: p.note.summary,
      source_type: p.note.source_type, tagNames: p.note.tags, userId,
    });
    req.session.pending = null;
    res.redirect('/notes/' + id);
  } catch (e) {
    next(e);
  }
});

// 統合（LLM で統合案を作りプレビュー）
router.post('/reconcile/merge', async (req, res, next) => {
  const userId = req.session.userId;
  const p = req.session.pending;
  if (!p) return res.redirect('/');
  try {
    const old = await notes.findById(p.topId, userId);
    if (!old) return res.redirect('/notes/reconcile');
    let merged = null;
    try {
      merged = await ai.merge(old, p.note, { lang: res.locals.user.out_lang || 'auto' });
      await quota.record(userId, { kind: 'merge', docChars: 0, usage: merged.usage });
    } catch (e) {
      console.error('[merge] 統合に失敗:', e.message);
      merged = null;
    }
    if (!merged) {
      // フォールバック：単純連結
      merged = {
        title: old.title,
        markdown: String(old.body_md).trimEnd() + '\n\n---\n\n' + p.note.body_md,
        summary: old.summary,
        tags: [...new Set([...(old.tags || []), ...(p.note.tags || [])])],
      };
    }
    req.session.pendingMerge = { oldId: old.id, ...merged };
    res.render('notes/merge_preview', { title: '統合プレビュー', old, merged });
  } catch (e) {
    next(e);
  }
});

// 統合を確定（編集後の内容で旧ノートを更新。新ノートは作らない）
router.post('/reconcile/merge/commit', async (req, res, next) => {
  const userId = req.session.userId;
  const m = req.session.pendingMerge;
  if (!m) return res.redirect('/');
  try {
    await notes.update(
      m.oldId,
      {
        title: req.body.title,
        body_md: req.body.body_md || '',
        summary: req.body.summary || null,
        tagNames: parseTags(req.body.tags),
      },
      userId
    );
    req.session.pending = null;
    req.session.pendingMerge = null;
    res.redirect('/notes/' + m.oldId);
  } catch (e) {
    next(e);
  }
});

// --- 詳細 ---
router.get('/:id', async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const note = await notes.findById(req.params.id, userId);
    if (!note) return res.status(404).render('error', { title: '404', message: 'ノートが見つかりません。' });
    const html = await renderMarkdown(note.body_md || '', userId);
    const back = await links.backlinks(note.id, userId);
    res.render('notes/detail', { title: note.title, note, html, backlinks: back });
  } catch (e) {
    next(e);
  }
});

// --- 編集フォーム ---
router.get('/:id/edit', async (req, res, next) => {
  const userId = req.session.userId;
  try {
    const note = await notes.findById(req.params.id, userId);
    if (!note) return res.status(404).render('error', { title: '404', message: 'ノートが見つかりません。' });
    note.tags_str = (note.tags || []).join(', ');
    res.render('notes/form', { title: '編集', mode: 'edit', note, errors: [] });
  } catch (e) {
    next(e);
  }
});

// --- 更新 ---
router.post('/:id/edit', validate, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('notes/form', {
      title: '編集', mode: 'edit',
      note: { id: req.params.id, ...req.body, tags_str: req.body.tags }, errors: errors.array(),
    });
  }
  try {
    const ok = await notes.update(
      req.params.id,
      { title: req.body.title, body_md: req.body.body_md || '', tagNames: parseTags(req.body.tags) },
      req.session.userId
    );
    if (!ok) return res.status(404).render('error', { title: '404', message: 'ノートが見つかりません。' });
    res.redirect(`/notes/${req.params.id}`);
  } catch (e) {
    next(e);
  }
});

// --- 削除 ---
router.post('/:id/delete', async (req, res, next) => {
  try {
    await notes.remove(req.params.id, req.session.userId);
    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
