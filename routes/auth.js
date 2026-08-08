// 認証 Controller：登録・ログイン・ログアウト。
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const users = require('../models/users');

// --- 新規登録 ---
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/register', { titleKey: 'auth.register', errors: [], values: {} });
});

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('err.username.min'),
    body('password').isLength({ min: 6 }).withMessage('err.password.min'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    const username = (req.body.username || '').trim();
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register', { titleKey: 'auth.register', errors: errors.array(), values: { username } });
    }
    try {
      if (await users.findByUsername(username)) {
        return res.status(400).render('auth/register', {
          titleKey: 'auth.register', errors: [{ msg: 'err.username.taken' }], values: { username },
        });
      }
      const id = await users.create(username, req.body.password);
      req.session.userId = id;
      res.redirect('/');
    } catch (e) {
      next(e);
    }
  }
);

// --- ログイン ---
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', { titleKey: 'auth.login', errors: [], values: {} });
});

router.post('/login', async (req, res, next) => {
  const username = (req.body.username || '').trim();
  try {
    const user = await users.findByUsername(username);
    if (!user || !(await users.verifyPassword(user, req.body.password))) {
      return res.status(401).render('auth/login', {
        titleKey: 'auth.login', errors: [{ msg: 'err.credentials' }], values: { username },
      });
    }
    req.session.userId = user.id;
    res.redirect('/');
  } catch (e) {
    next(e);
  }
});

// --- ログアウト ---
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
