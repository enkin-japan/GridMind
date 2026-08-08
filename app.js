// GridMind エントリポイント（Controller の配線）。
// course 第9・10章の Express + express-session 構成に倣う。
// MVC：views=View / routes=Controller / models・services=Model。
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./models/db');
const janitor = require('./services/janitor');
const { loadUser, localize, requireAuth } = require('./middleware');

const app = express();

// View（EJS）
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ミドルウェア
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// セッション（ログイン状態の保持）
// 既定のメモリ保存はサーバを再起動するたびに全員がログアウトしてしまい、
// 利用者が増えるとメモリも増え続けるため、SQLite に保存する。
const SQLiteStore = require('connect-sqlite3')(session);
// リバースプロキシ配下でも本当の接続元・プロトコルを見る（secure cookie の判定に必要）。
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(
  session({
    store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') }),
    secret: process.env.SESSION_SECRET || 'gridmind-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
      httpOnly: true,                  // JavaScript から読めないようにする
      sameSite: 'lax',                 // 他サイトからの送信を防ぐ
      secure: process.env.COOKIE_SECURE === '1', // HTTPS 運用時に 1 にする
    },
  })
);

// 全リクエストでログインユーザーを res.locals.user に載せる
app.use(loadUser);
app.use(localize);

// 認証ルート（ログイン不要）
app.use('/', require('./routes/auth'));

// 以降はログイン必須
app.use('/settings', requireAuth, require('./routes/settings'));
app.use('/notes', requireAuth, require('./routes/notes'));
app.use('/', requireAuth, require('./routes/index'));

// 404
app.use((req, res) => {
  res.status(404).render('error', { titleKey: 'err.404', messageKey: 'err.404.page' });
});

// エラーハンドラ
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Error', message: err.message });
});

// DB 初期化 → サーバ起動
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
db.init()
  .then(() => {
    janitor.start(); // アップロードの取り残しを定期的に掃除する
    app.listen(PORT, HOST, () => console.log(`GridMind on http://${HOST}:${PORT}`));
  })
  .catch((e) => {
    console.error('DB init failed:', e);
    process.exit(1);
  });
