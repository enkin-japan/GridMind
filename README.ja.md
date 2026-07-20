# GridMind

**資料から「知識そのもの」だけを取り出す、個人向け AI ナレッジベース。**

資料（PDF / Word / PowerPoint / Excel / HTML / テキスト）を読みこむと、GridMind はまず変換を行い、次に LLM で**知識だけ**を抽出します。定義・原理・手法・事実を残し、日程・成績・ページ番号のようなノイズは除きます。できあがるのは、見やすく構造化されたノートで、関連するノートと自動でリンクし、自分だけの知識ネットワークになります。

[English](README.md) | [简体中文](README.zh-CN.md) | **日本語**

---

## 機能

- **アカウント** —— 登録 / ログイン / ログアウト（セッション + bcrypt でハッシュ化したパスワード）。ノートはユーザーごとに分離されます。
- **ノート** —— 作成・表示・編集・削除。Markdown で書けます。
- **AI 取り込み** —— ファイルをアップロード（[MarkItDown](https://github.com/microsoft/markitdown) が Markdown に変換）またはテキストを貼り付け。LLM が**知識だけ**を取り出し、タイトル・要約・タグを自動生成します。ノイズ（目標・成績・日程・体裁）は意図的に除外し、内容が乏しいときも無理に増やしません。
- **検索と整理** —— キーワード検索（タイトル/本文）、タグでのしぼりこみ、ページネーション。
- **双方向リンクと被リンク** —— `[[別のノート]]` でノートをリンク。各ノートには、それを指しているノートの一覧が表示されます。
- **二次整理** —— 新しい知識が既存ノートと強く関連するとき、左右に並べた確認画面で「**リンク**」するか「**まとめる（統合）**」かを選べます（AI が生成した、編集可能なプレビュー付き）。
- **一括取り込み** —— 複数ファイルを選ぶと、**1つずつ順番に**処理します（モデルが集中できるように）。進捗も表示します。
- **BYOK（各自のキーを使う）** —— 各ユーザーが自分の OpenAI API キーを保存。**保存時は暗号化（AES-256-GCM）**され、呼び出し時にメモリ上でのみ復号し、記録も再表示もしません。
- **やさしいフォールバック** —— キー未設定（または API 失敗）でも、変換したテキストとして保存されます。

## 技術スタック

- **サーバ:** Node.js、Express、EJS（サーバサイドレンダリング）、SQLite（`sqlite3`）
- **認証/セキュリティ:** `express-session`、`bcryptjs`、Node `crypto` による AES-256-GCM
- **取り込み/AI:** `multer`（アップロード）、Python [MarkItDown](https://github.com/microsoft/markitdown) ブリッジ（ファイル → Markdown）、`openai`、`marked`（Markdown → HTML）
- **入力チェック:** `express-validator`

構成は MVC に沿っています：`views/` = View、`routes/` = Controller、`models/` + `services/` = Model。

## 必要環境

- **Node.js**（LTS 推奨）
- **Python 3** と MarkItDown：`pip install "markitdown[all]"`

## セットアップ

```bash
git clone https://github.com/enkin-japan/finalTaskWeb.git gridmind
cd gridmind

# Node の依存関係
npm install

# Python の依存関係（ファイル → Markdown 変換用）
pip install "markitdown[all]"

# 設定
cp .env.example .env
# .env を編集 —— 最低限、固有の APP_ENCRYPTION_KEY と SESSION_SECRET を設定：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 環境変数（`.env`）

| 変数 | 用途 |
|---|---|
| `APP_ENCRYPTION_KEY` | 各ユーザーの OpenAI キーを暗号化する鍵（AES-256-GCM）。**必須**。長いランダム値を使う。 |
| `SESSION_SECRET` | `express-session` の署名鍵。 |
| `PORT` | 待ち受けポート（既定 `3000`）。 |
| `HOST` | バインドアドレス（既定 `127.0.0.1`、ループバックのみ）。`0.0.0.0` で全インターフェースに公開。 |
| `OPENAI_API_KEY` | 任意。開発/テスト用のフォールバックキー（seed スクリプトが demo アカウントに設定）。通常は各アカウントがアプリ内で自分のキーを登録する。 |
| `OPENAI_MODEL` | 既定モデル（既定 `gpt-4o-mini`）。 |

## 起動

```bash
# 任意：demo アカウント（demo / demo1234）と例ノートを投入
npm run seed

npm start
# http://localhost:3000 を開く
```

## 使い方

1. アカウントを**登録**（seed した場合は `demo` / `demo1234` でログイン）。
2. **⚙ 設定**を開き、自分の OpenAI API キーを貼り付ける（暗号化して保存）。
3. **⇪ 取り込み**で、ファイルを選ぶかテキストを貼り付け、AI にノート化してもらう。
4. ノートを閲覧・検索・タグ付けし、`[[ノート名]]` でリンクする。

> キーが無くても取り込みは動きます —— AI 整理をせず、変換したテキストのまま保存します。

## プロジェクト構成

```
app.js            # Express エントリ（サーバ + ルーティング + セッション）
middleware.js     # ログインガード + ログインユーザーの読み込み
models/           # SQLite アクセス：db, users, notes, tags
services/         # ai, ingest（MarkItDown ブリッジ）, search, links, relate, render, crypto
routes/           # コントローラ：auth, index（ホーム）, notes, settings
views/            # EJS テンプレート + パーシャル
public/           # css / クライアント js
tools/            # md_convert.py（Python ブリッジ）, seed.js（例データ）
```

## プライバシーと BYOK

GridMind はマルチユーザーのサービスなので、ノートはサーバの SQLite に保存され、アカウントごとに分離されます。もっとも重要な部分——あなたの OpenAI キー——は、データベースに入れないサーバ側の鍵（`APP_ENCRYPTION_KEY`）で**暗号化して保存**されます。そのため、データベースの流出だけでは復元できません。キーは OpenAI 呼び出し時に一時的に使うだけで、記録もブラウザへの返却もしません。

## ライセンス

[MIT](LICENSE) © 2026 enkin
