# GridMind

**只从文档中提取「知识本身」的个人 AI 知识库。**

丢进一份文档（PDF / Word / PowerPoint / Excel / HTML / 文本），GridMind 先做转换，再用 LLM 提取**纯知识**——定义、原理、方法、事实——把日程、评分规则、页码之类的噪音全部剔除。得到的是一篇结构清晰的笔记，并会自动与你已有的相关笔记建立链接，逐渐长成你自己的知识网络。

[English](README.md) | **简体中文** | [日本語](README.ja.md)

---

## 功能

- **账号** —— 注册 / 登录 / 登出（会话 + bcrypt 哈希密码）。每个用户的笔记相互隔离。
- **笔记** —— 增删改查，使用 Markdown 编写。
- **AI 导入** —— 上传文件（由 [MarkItDown](https://github.com/microsoft/markitdown) 转成 Markdown）或粘贴文本；LLM 只提取**知识**，并自动生成标题、摘要和标签。噪音（教学目标、评分、日程、排版）被刻意排除；文档内容单薄时也绝不注水。
- **输出语言可选** —— 笔记语言可以独立于原文语言。英文 PDF 可以直接产出日文笔记。若输出漂回原文语言，护栏会重新翻译一次。
- **长文档** —— 超过约 15,000 字的文档会被切分、并行提取，最后合并成一篇笔记，不会因为长度上限被截断丢失。
- **实时进度** —— 单次导入需要 20〜35 秒。这段时间里，屏幕会显示当前所处阶段、已拾取的知识点清单，以及正文逐字写出的过程。
- **搜索与整理** —— 关键词搜索（标题/正文）、标签筛选、分页。
- **双向链接与反向链接** —— 用 `[[另一篇笔记]]` 建立链接；每篇笔记都会列出哪些笔记指向了它。
- **二次整理** —— 当新知识与已有笔记高度重合时，会打开左右对照页，让你选择**建立链接**还是**合并成一篇**（附带 AI 生成、可编辑的合并预览）。关联度同时使用词汇重叠和语义向量判定。
- **批量导入** —— 可以一次选中多个文件，系统**逐个顺序处理**（让模型保持专注），并显示进度。
- **套餐与额度** —— API Key 由服务方持有，用户完全不接触。免费版和专业版各自限制每月导入次数和单文件字数两项。每次导入的 token 用量与费用都会记录。
- **不保留原始文件** —— 上传的文件在转换完成后立即删除，只保留提取出的笔记。

## 技术栈

- **服务端：** Node.js、Express、EJS（服务端渲染）、SQLite（`sqlite3`）
- **认证/安全：** `express-session`（持久化到 SQLite）、`bcryptjs`
- **导入/AI：** `multer`（上传）、常驻的 Python [MarkItDown](https://github.com/microsoft/markitdown) 工作进程池（文件 → Markdown）、`openai`、`marked`（Markdown → HTML）
- **校验：** `express-validator`

架构遵循 MVC：`views/` = View，`routes/` = Controller，`models/` + `services/` = Model。

文件转换由一组常驻的 Python 进程完成，通过标准输入输出收发按行分隔的 JSON。MarkItDown 只在启动时加载一次而非每次请求都加载，为每次导入省下约 0.5 秒的冷启动；进程池会做背压控制、超时后重建工作进程、崩溃后自动重启。

## 环境要求

- **Node.js**（推荐 LTS）
- **Python 3** 及 MarkItDown：`pip install "markitdown[all]"`
- 由运营方准备的 **OpenAI API Key**（最终用户不需要提供）

## 安装

```bash
git clone https://github.com/enkin-japan/GridMind.git gridmind
cd gridmind

# Node 依赖
npm install

# Python 依赖（用于文件 → Markdown 转换）
pip install "markitdown[all]"

# 配置
cp .env.example .env
# 然后编辑 .env —— 至少要设置 OPENAI_API_KEY 和一个独立的 SESSION_SECRET：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 环境变量（`.env`）

只有前两项是必需的。可选项及其默认值背后的实测数据都写在 `.env.example` 里。

| 变量 | 用途 |
|---|---|
| `OPENAI_API_KEY` | 服务方自己的 Key，知识提取和语义向量共用。**必需。** |
| `SESSION_SECRET` | `express-session` 的签名密钥。**必需。** |
| `OPENAI_MODEL` | 提取所用模型（默认 `gpt-5.6-luna`）。 |
| `PORT` | 监听端口（默认 `3000`）。 |
| `HOST` | 绑定地址（默认 `127.0.0.1`，仅回环）。设为 `0.0.0.0` 可对外暴露。 |
| `AI_TWO_STAGE` | 设为 `1` 启用「先列知识点清单，再逐条写出」的两段式。实测在 15,000 字以内的文档上知识量 +74%、成本 +74%。 |
| `PLAN_FREE_INGESTS` / `PLAN_FREE_DOC_CHARS` | 免费版上限（默认每月 30 次、单文件 20,000 字）。 |
| `PLAN_PRO_INGESTS` / `PLAN_PRO_DOC_CHARS` | 专业版上限（默认 500 / 60,000）。 |
| `MD_WORKERS` | Python 转换进程池大小（默认 CPU 核数 − 1，最多 4 个）。 |
| `EMBEDDING_ENABLED` | 设为 `0` 则不用语义向量，仅靠词汇重叠判定关联。 |
| `TRUST_PROXY` / `COOKIE_SECURE` | 在反向代理后以 HTTPS 运行时，两项都设为 `1`。 |

## 运行

```bash
# 可选：创建演示账号（demo / demo1234）并写入示例笔记
npm run seed

npm start
# 打开 http://localhost:3000
```

## 使用

1. **注册**账号（如果执行过 seed，也可用 `demo` / `demo1234` 登录）。
2. 进入 **⇪ 导入**，选择文件或粘贴文本，选好输出语言，交给 AI 整理成笔记。
3. 若新知识与已有笔记高度重合，选择**建立链接**还是**合并**。
4. 浏览、搜索、打标签，并用 `[[笔记标题]]` 相互链接。
5. **⚙ 设置**中可以查看套餐、本月用量和默认输出语言。

> 用户全程不需要输入任何 API Key。即使 AI 调用失败，导入仍会保存转换后的文本，不会丢失内容。

## 项目结构

```
app.js            # Express 入口（服务器 + 路由 + 会话）
middleware.js     # 登录守卫 + 当前用户加载
models/           # SQLite 访问：db, users, notes, tags, embeddings
services/         # ai, embed, ingest（MarkItDown 进程池）, janitor, links,
                  #   quota, relate, render, search
routes/           # 控制器：auth, index（首页）, notes, settings
views/            # EJS 模板 + 片段
public/           # css / 客户端 js
tools/            # md_worker.py（Python 工作进程）, seed.js, embed_backfill.js
docs/             # 架构与执行记录
```

## 隐私

GridMind 是多用户服务，笔记保存在服务端的 SQLite 中，按账号隔离——一篇笔记只有创建它的账号能访问。

OpenAI 的 API Key 属于服务方，从服务器环境变量读取。它不会按用户存储，不会下发到浏览器，也不会被记录。

上传的文件在转换完成后立即从磁盘删除；请求中断遗留的残留文件也会被后台清扫任务定期清除。最终留下的只有提取出的笔记。

## 许可证

[MIT](LICENSE) © 2026 enkin
