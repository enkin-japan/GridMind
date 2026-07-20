// ノートの Controller（追加・取り込み・詳細・編集・削除）。すべて本人のノートに限定。
// 更新系は POST（PUT/DELETE は使わない）。ログイン必須（app.js で requireAuth を適用）。
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const notes = require('../models/notes');
const users = require('../models/users');
const links = require('../services/links');
const ai = require('../services/ai');
const ingest = require('../services/ingest');
const relate = require('../services/relate');
const { renderMarkdown } = require('../services/render');

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 15 * 1024 * 1024 },
});

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
    const hasKey = await users.hasApiKey(req.session.userId);
    res.render('notes/import', { title: '取り込み', hasKey });
  } catch (e) {
    next(e);
  }
});

// --- 取り込み実行（fetch から呼ばれ JSON を返す）---
// キーはログインユーザーの DB 保存分（復号）を使う。未設定なら AI をスキップして生データ保存。
router.post('/ingest', upload.single('file'), async (req, res, next) => {
  const userId = req.session.userId;
  try {
    let markdown = '';
    if (req.file) {
      try {
        markdown = await ingest.fileToMarkdown(req.file.path);
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    } else {
      markdown = req.body.text || '';
    }
    if (!markdown.trim()) return res.status(400).json({ error: '内容が空です。' });

    const { key, model } = await users.getApiKey(userId);
    let data;
    let aiUsed = false;
    if (key) {
      try {
        data = await ai.structure(markdown, { key, model });
        aiUsed = true;
      } catch (e) {
        data = null;
      }
    }
    if (!data) {
      const firstLine = markdown.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 60);
      data = { title: firstLine || '無題', body_md: markdown, summary: null, tags: [] };
    }

    const staged = {
      title: data.title,
      body_md: data.body_md,
      summary: data.summary,
      tags: data.tags || [],
      source_type: req.file ? 'upload' : 'paste',
      body_text: notes.toPlainText(data.body_md),
    };

    // 二次整理：関連する既存ノートを探す（本人の範囲・SQL のみ）
    const isBatch = String(req.body.batch || '') === '1'; // 複数ファイルの一括処理は非対話
    const related = await relate.findRelated(userId, staged);
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
    const { key, model } = await users.getApiKey(userId);
    let merged = null;
    if (key) {
      try {
        merged = await ai.merge(old, p.note, { key, model });
      } catch (e) {
        merged = null;
      }
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
