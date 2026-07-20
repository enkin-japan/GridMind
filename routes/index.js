// ホーム画面（一覧・検索・タグ絞り込み・ページネーション）の Controller。
const express = require('express');
const router = express.Router();
const { search } = require('../services/search');
const tags = require('../models/tags');

router.get('/', async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const q = req.query.q || '';
    const tag = req.query.tag || '';
    const page = req.query.page || 1;
    const result = await search({ q, tag, page, userId }); // { rows, total, page, pages }
    const allTags = await tags.list(userId);
    res.render('index', { title: 'GridMind', q, tag, allTags, ...result });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
