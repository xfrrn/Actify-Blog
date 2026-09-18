# 痛点反馈与审核

首页底部收集用户遇到的麻烦和选填的搜索词，不需要注册。文案随中英文切换。

## 日常使用

1. 打开 `/admin/feedback`，输入管理密码。
2. 在「待审核」里查看原文和搜索词，确认内容适合公开且没有隐私信息，再点「公开」。
3. 不适合公开的内容点「不公开」；已公开内容可在「已公开」里点「撤下」。

反馈按 `pending`（待审核）、`published`（已公开）、`hidden`（不公开）保存。管理页每次读取 20 条，可点「再看一些」继续查看。

首页只展示最近 20 条已公开的痛点原文和提交日期。搜索词仅在审核页显示。公开原文在服务端生成的 HTML 中，用户输入按纯文本展示；待审核和不公开的内容不会发送到首页。管理页和接口设为不索引。

这些原话可以帮助整理问题、关键词和后续文章选题；审核公开不会自动生成文章，也不保证搜索排名。

## 首次上线

网站使用现有的 Cloudflare Workers，加一个 [D1 数据库](https://developers.cloudflare.com/d1/get-started/)。先完成以下配置，再部署网站。

### 1. 创建数据库

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create actify-blog-feedback --binding FEEDBACK_DB --update-config
```

确认 `wrangler.jsonc` 中 `FEEDBACK_DB` 的 `database_id` 已填入命令返回的真实 ID。当前配置省略 ID，支持本地模拟；正式上线必须完成数据库创建和绑定。数据库已存在时，使用原有 ID，不要重复创建。

```sh
pnpm exec wrangler d1 migrations apply FEEDBACK_DB --remote
```

该迁移只新建反馈表和索引，不删除已有表。

### 2. 设置管理密码

用密码管理器生成并保存一个 32–256 位的随机密码，也可用下面命令生成：

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
pnpm exec wrangler secret put FEEDBACK_ADMIN_TOKEN
```

第二个命令会要求输入密码。也可在 Cloudflare 的 Worker 设置中新增同名 **Secret**。这是审核页的管理密码，只保存在服务端；网页只在当前页面内存中使用输入的密码，刷新或退出后重新输入。不要设置为 `NEXT_PUBLIC_` 变量。

### 3. 构建并部署

```sh
pnpm build:cloudflare
pnpm deploy:cloudflare
```

Windows 的 Cloudflare 构建仍按 README 使用 WSL 或 Cloudflare Linux 构建环境。

## 本地开发与验证

在根目录的 `.dev.vars` 中设置独立的本地密码（该文件已被 Git 忽略）：

```text
FEEDBACK_ADMIN_TOKEN=填写你自己生成的随机密码
```

```sh
pnpm exec wrangler d1 migrations apply FEEDBACK_DB --local
pnpm dev
```

另开终端运行：

```sh
pnpm test:feedback http://localhost:3000
```

检查会实际提交到本地数据库，验证权限、审核公开/撤下、HTML 转义、输入限制、防刷和翻页，结束后清理自己创建的测试记录。只允许对本地地址运行。数据保存在 `.wrangler/state/`，与线上数据库分开。

反馈失败时保留表单内容，只有写入成功才清空。基础防刷使用隐藏字段和 Cloudflare 的每 IP、每个节点一分钟 3 次限流；出现分布式垃圾提交时再接入 Turnstile。

## 查看和导出全部数据

可在 Cloudflare 的 D1 控制台打开 `actify-blog-feedback` → `feedback` 表，或导出为 JSON：

```sh
pnpm exec wrangler d1 execute FEEDBACK_DB --remote --command "SELECT id, pain_point, search_query, locale, status, created_at FROM feedback ORDER BY id DESC" --json > feedback-export.json
```

导出内容包括未公开反馈，请只保存在私人位置。
