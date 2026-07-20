// 設定 Controller：OpenAI API キー（暗号化して DB 保存）とモデルの管理。ログイン必須。
const express = require('express');
const router = express.Router();
const users = require('../models/users');

router.get('/', async (req, res, next) => {
  try {
    const me = await users.findById(req.session.userId);
    const hasKey = await users.hasApiKey(req.session.userId);
    res.render('settings', {
      title: '設定',
      hasKey,
      model: (me && me.api_model) || 'gpt-4o-mini',
      saved: req.query.saved || '',
    });
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const key = (req.body.api_key || '').trim();
    const model = (req.body.api_model || 'gpt-4o-mini').trim();
    if (key) {
      // 新しいキーを保存（暗号化）
      await users.setApiKey(req.session.userId, key, model);
    } else {
      // キー未入力：既存キーは維持し、モデルだけ更新
      const { key: existing } = await users.getApiKey(req.session.userId);
      await users.setApiKey(req.session.userId, existing, model);
    }
    res.redirect('/settings?saved=1');
  } catch (e) {
    next(e);
  }
});

router.post('/clear', async (req, res, next) => {
  try {
    await users.setApiKey(req.session.userId, null, 'gpt-4o-mini');
    res.redirect('/settings?saved=cleared');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
