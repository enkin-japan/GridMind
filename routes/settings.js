// 設定 Controller：プラン・今月の使用量・既定の出力言語。ログイン必須。
// API キーはサービス側が持つため、この画面には出てこない。
const express = require('express');
const router = express.Router();
const users = require('../models/users');
const quota = require('../services/quota');
const ai = require('../services/ai');

router.get('/', async (req, res, next) => {
  try {
    const user = res.locals.user;
    const usage = await quota.usageFor(user.id);
    const plan = quota.planOf(user);
    res.render('settings', {
      title: '設定',
      plan,
      plans: quota.PLANS,
      usage,
      languages: ai.LANGUAGES,
      outLang: user.out_lang || 'auto',
      saved: req.query.saved || '',
    });
  } catch (e) {
    next(e);
  }
});

// 既定の出力言語を保存する。
router.post('/language', async (req, res, next) => {
  try {
    const lang = String(req.body.out_lang || 'auto');
    if (!ai.LANGUAGES[lang]) return res.redirect('/settings');
    await users.setOutLang(req.session.userId, lang);
    res.redirect('/settings?saved=lang');
  } catch (e) {
    next(e);
  }
});

// プランの変更。
// ※ 決済は未実装。今は申し込みを受け付けるだけの入口として置いてある。
router.post('/plan', async (req, res, next) => {
  try {
    const plan = String(req.body.plan || 'free');
    if (!quota.PLANS[plan]) return res.redirect('/settings');
    if (plan === 'pro') {
      // 決済を入れるまでは案内のみ（勝手に有料プランへ上げない）。
      return res.redirect('/settings?saved=pro_pending');
    }
    await users.setPlan(req.session.userId, plan);
    res.redirect('/settings?saved=plan');
  } catch (e) {
    next(e);
  }
});

module.exports = router;
