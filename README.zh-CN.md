# GridMind

**一个只从你的文档里提取「知识本身」的个人 AI 知识库。**

丢进一个文档（PDF / Word / PowerPoint / Excel / HTML / 文本），GridMind 会先把它转换，再用大模型抽取出**只有知识的部分**——定义、原理、方法、事实——把日程、评分规则、页码这类噪音都排除掉。结果是一条干净、结构化的笔记，并会自动和你的相关笔记互相链接，形成你自己的知识网络。

[English](README.md) | **简体中文** | [日本語](README.ja.md)

---

## 功能

- **账号** —— 注册 / 登录 / 登出（会话 + bcrypt 哈希密码）。每个用户的笔记互相隔离。
- **笔记** —— 增删改查，使用 Markdown 编写。
- **AI 取り込み（导入）** —— 上传文件（由 [MarkItDown](https://github.com/microsoft/markitdown) 转成 Markdown）或粘贴文本；大模型只抽取**知识**，并自动生成标题、摘要和标签。刻意排除噪音（目标、评分、日程、版式），文档内容少时也不会硬凑。
- **搜索与整理** —— 关键词搜索（标题/正文）、标签筛选、分页。
- **双向链接与被链接** —— 用 `[[另一条笔记]]` 链接笔记；每条笔记会显示哪些笔记指向它。
- **二次整理** —— 当新知识与某条已有笔记高度相似时，会进入左右对照页，让你选择**关联**它们，还是**合并**为一条（附带 AI 生成、可编辑的预览）。
- **批量导入** —— 可多选文件；系统**逐个处理**（让模型保持专注），并显示进度。
- **自带密钥（BYOK）** —— 每个用户保存自己的 OpenAI API Key，**加密存储（AES-256-GCM）**；仅在调用时于内存中解密，绝不记录、也不再回显。
- **优雅降级** —— 未设置密钥（或 API 失败）时，文档仍会以转换后的纯文本保存。

## 技术栈

- **服务端：** Node.js、Express、EJS（服务端渲染）、SQLite（`sqlite3`）
- **认证/安全：** `express-session`、`bcryptjs`、通过 Node `crypto` 实现的 AES-256-GCM
- **导入/AI：** `multer`（上传）、Python [MarkItDown](https://github.com/microsoft/markitdown) 桥（文件 → Markdown）、`openai`、`marked`（Markdown → HTML）
- **校验：** `express-validator`

架构遵循 MVC：`views/` = View，`routes/` = Controller，`models/` + `services/` = Model。

## 环境要求

- **Node.js**（建议 LTS）
- **Python 3** 并安装 MarkItDown：`pip install "markitdown[all]"`

## 安装

```bash
git clone https://github.com/enkin-japan/finalTaskWeb.git gridmind
cd gridmind

# Node 依赖
npm install

# Python 依赖（用于 文件 → Markdown 转换）
pip install "markitdown[all]"

# 配置
cp .env.example .env
# 然后编辑 .env —— 至少设置一个唯一的 APP_ENCRYPTION_KEY 和 SESSION_SECRET：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 环境变量（`.env`）

| 变量 | 用途 |
|---|---|
| `APP_ENCRYPTION_KEY` | 用于加密每个用户保存的 OpenAI 密钥（AES-256-GCM）。**必填**，请用长随机值。 |
| `SESSION_SECRET` | `express-session` 的签名密钥。 |
| `PORT` | 监听端口（默认 `3000`）。 |
| `HOST` | 绑定地址（默认 `127.0.0.1`，仅回环）。设为 `0.0.0.0` 可对外开放。 |
| `OPENAI_API_KEY` | 可选。开发/测试用的兜底密钥（seed 脚本会把它配给 demo 账号）。正常使用时，每个账号在应用内填自己的密钥。 |
| `OPENAI_MODEL` | 默认模型（默认 `gpt-4o-mini`）。 |

## 运行

```bash
# 可选：灌入 demo 账号（demo / demo1234）和示例笔记
npm run seed

npm start
# 打开 http://localhost:3000
```

## 使用

1. **注册**一个账号（或用 `demo` / `demo1234` 登录，如果灌了种子数据）。
2. 打开 **⚙ 设置**，粘贴你自己的 OpenAI API Key（加密保存）。
3. 进入 **⇪ 取り込み（导入）**，选择文件或粘贴文本，让 AI 整理成笔记。
4. 浏览、搜索、打标签，并用 `[[笔记标题]]` 链接笔记。

> 没有密钥时导入也能用 —— 只是保存转换后的文本，不做 AI 整理。

## 项目结构

```
app.js            # Express 入口（服务器 + 路由 + 会话）
middleware.js     # 登录守卫 + 当前用户加载
models/           # SQLite 访问：db、users、notes、tags
services/         # ai、ingest（MarkItDown 桥）、search、links、relate、render、crypto
routes/           # 控制器：auth、index（首页）、notes、settings
views/            # EJS 模板 + 片段
public/           # css / 前端 js
tools/            # md_convert.py（Python 桥）、seed.js（示例数据）
```

## 隐私与 BYOK

GridMind 是多用户服务，因此笔记保存在服务器的 SQLite 数据库中，并按账号隔离。最敏感的部分——你的 OpenAI 密钥——用一个**不存进数据库**的服务器端密钥（`APP_ENCRYPTION_KEY`）**加密存储**，因此单独脱库无法还原它。该密钥仅在调用 OpenAI 时短暂使用，绝不记录，也不会回传给浏览器。

## 许可证

[MIT](LICENSE) © 2026 enkin
