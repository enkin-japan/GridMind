// 認証まわりのミドルウェア。
const users = require('./models/users');

// セッションからユーザーを読み込み、res.locals.user に載せる（全ビューで参照可能に）。
async function loadUser(req, res, next) {
  res.locals.user = null;
  if (req.session && req.session.userId) {
    try {
      res.locals.user = await users.findById(req.session.userId);
    } catch (e) {
      res.locals.user = null;
    }
  }
  next();
}

// 未ログインならログイン画面へ。
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}

module.exports = { loadUser, requireAuth };
