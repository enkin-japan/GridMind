// 認証と、画面の言語・表示テーマのミドルウェア。
const users = require('./models/users');
const i18n = require('./services/i18n');

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

// 画面の言語とテーマを決め、ビューとルートの両方から使えるようにする。
// ログイン前でも効かせたいので、アカウントの設定が無ければ cookie を見る。
function localize(req, res, next) {
  const user = res.locals.user;
  const lang = i18n.pickLang(req, user);
  res.locals.lang = lang;
  res.locals.theme = i18n.pickTheme(req, user);
  res.locals.look = i18n.pickLook(req, user);
  res.locals.lookAttrs = i18n.lookAttrs(res.locals.look);
  res.locals.lookKinds = i18n.LOOK;
  res.locals.uiLangs = i18n.UI_LANGS;
  res.locals.clientDict = i18n.clientDict(lang);
  res.locals.titleKey = null;
  res.locals.t = (key, vars) => i18n.t(lang, key, vars);
  req.t = res.locals.t;
  req.lang = lang;
  next();
}

// 未ログインならログイン画面へ。
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}

module.exports = { loadUser, localize, requireAuth };
