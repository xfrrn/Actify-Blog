# Actify-Blog

Actify 的个人网站与技术博客，基于 Next.js、React、Tailwind CSS 和 MDX 构建。

## 声明

- 基于 [Magic UI Portfolio](https://github.com/dillionverma/portfolio) 二次开发，感谢原作者 Dillion Verma。
- 保留原项目的 MIT 许可证及版权声明，详见 [LICENSE](./LICENSE)。
- 标题带有 `Example:` 的文章为写作与排版示例，不代表个人作品或经历。

## 中英文界面

- 默认显示英文，底部导航栏的「中文 / EN」按钮可切换语言，浏览器会记住选择一年。
- 首页介绍、近况位于 `src/data/site.tsx`；作品位于 `content/projects/`；界面提示文字位于 `src/lib/i18n.ts`。
- 页面在服务端读取语言 Cookie，同一个链接可以显示两种语言。切换会刷新当前页面，保留分类筛选与地址。
- 博客文章支持独立的中英文文件：有译文时标题、摘要、正文、目录一起切换；缺少已发布译文时显示另一个语言版本并提示。译文由作者填写，不会自动翻译。现有示例仍是草稿。

## 写博客与分类

文章统一放在 `content/blog/`，作品放在 `content/projects/`。博客使用 `.md` 或 `.mdx`，文件名示例：

```text
content/
  blog/
    my-note.zh.mdx     # 中文标题、摘要和正文
    my-note.en.mdx     # 同篇文章的英文版本
  projects/
    my-tool.md         # 项目资料
```

`my-note.zh.mdx` 和 `my-note.en.mdx` 共用 `/blog/my-note`，列表、计数、RSS 和站点地图只算一篇。只写一种语言也可以，另一种语言界面会回退显示它。两份文件的 `draft` 分别控制发布，草稿译文不会被读取展示。

新建时复制 [中文完整字段模板](content/blog/blog-template.zh.mdx.example) 和 [英文配套模板](content/blog/blog-template.en.mdx.example)，移除 `.example` 并修改文件名。模板本身不会被网站读取，复制后的文章也默认是草稿。

文件头示例（正文写在第二条 `---` 之后）：

```yaml
---
title: "填写文章标题"
description: "填写一句摘要"
date: "2026-09-15"
language: zh
category: "你自己起的分类名"
tags: ["Obsidian", "翻译"]
draft: true
---
```

- `category` 由你自由命名。发布文章后，新名称会自动成为可选分类，同名分类会合并并统计文章数。
- 两种语言建议使用相同的 `date` 和 `category`，保持时间排序和分类筛选一致；标题、摘要、正文、标签、封面说明可以分别填写。
- 文件后缀 `.zh` / `.en` 决定语言，`language` 可省略；若填写，必须与后缀一致。同一篇文章每种语言只能有一份文件，不能同时有 `my-note.zh.md` 和 `my-note.zh.mdx`。
- 旧式无语言后缀文件仍支持，默认中文，也可通过 `language: en` 声明英文；文件夹迁移和语言后缀不改变原文章地址。
- RSS 使用已发布英文版，没有英文则使用中文版；站点地图按文章地址去重。
- 不预设分类，也不关联项目。可以省略 `category` 或留空，文章仍显示在「全部文章」中。
- 分类下拉框只显示已发布文章中使用的分类，选择后直接筛选；修改文章中的名称即可调整分类。
- 文章按日期倒序、按月份分组；左侧时间导航跟随滚动高亮，手机上显示为顶部横向导航。
- 准备发布时再将 `draft` 改为 `false`。草稿不会出现在文章列表、筛选计数、时间线、RSS 或站点地图中。

## 添加与修改作品

每个作品是 `content/projects/` 中的一个 `.md` 文件。复制现有文件、修改内容即可，无需修改 `site.tsx` 或手动添加导入。

**新建时推荐复制 [完整字段模板](content/projects/project-template.md.example)**：内含所有字段的中文说明、默认值和填写示例。复制后改名为 `my-tool.md`。模板的 `.md.example` 后缀不会被网站读取；复制后的项目也默认是草稿，填完再将 `draft` 改为 `false`。

例如新建 `content/projects/my-tool.md`，填写文件头：

```yaml
---
name: "My Tool"
description:
  en: "A short English introduction."
  zh: "这个工具的中文简介。"
technologies: ["TypeScript"]
featured: true
order: 50
draft: true
---
```

- 文件名是项目的唯一标识（`slug`），使用小写英文、数字和连字符，例如 `my-tool.md`。
- `name` 和中英文 `description` 必填，中英文简介在同一个文件里维护。
- `featured: true` 在首页展示；全部非草稿作品都会出现在 `/projects`。
- `order` 越小越靠前，未填写时为 `100`；同序号按文件名排序。
- `draft: true` 隐藏项目；准备公开时改为 `false`。省略时默认为 `false`。
- 可选字段：`github`、`demo`、`image`、`video`、`dates`、`status`；没有就省略。`status` 可填 `Building`、`Live` 或 `Archived`。
- 图片放在 `public/projects/`，例如 `image: "/projects/my-tool.png"`。封面统一为 16:9；缺少图片或加载失败时显示项目名称文字封面。
- 项目目前以卡片展示，简介写在 `description` 中，文件正文不会生成详情页。
- `pnpm dev` 会自动读取新增文件；使用 `8787` 预览或部署时，需要重新构建。

## 部署到 Cloudflare Workers

使用 [OpenNext Cloudflare 适配器](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/)，保留 Next.js 构建与服务端渲染。

### 本地验证

使用 Node.js 22 以上版本与 pnpm 10.33.3。Windows 下请在 WSL 的 Linux 文件系统中安装依赖和构建（例如 `~/projects/Actify-Blog`），避免与 Windows 共用 `node_modules`；OpenNext 的原生 Windows 支持不完整。也可直接使用 Cloudflare 的 Linux 构建环境。

```sh
pnpm install --frozen-lockfile
pnpm build:cloudflare
pnpm preview:cloudflare
```

预览默认在 `http://localhost:8787`。在另一个终端运行：

```powershell
node scripts/check-site.mjs http://localhost:8787
```

修改代码后需要重新执行 `pnpm build:cloudflare`。日常开发仍用 `pnpm dev`。

### Cloudflare 控制台填写

先将配置和锁文件提交推送，再在 Workers & Pages 中导入仓库：

| 字段 | 内容 |
| --- | --- |
| 仓库 | `xfrrn/Actify-Blog` |
| 生产分支 | `main` |
| Worker 名称 | `actify-blog`（与 `wrangler.jsonc` 一致） |
| 根目录 | `/` |
| 构建命令 | `pnpm build:cloudflare` |
| 部署命令 | `pnpm deploy:cloudflare` |

这是 Workers 应用，无需填写 Pages 的输出目录。Worker 入口和资源目录已在 `wrangler.jsonc` 中配置。

在 **Build variables and secrets（构建变量与密钥）** 中设置：

| 变量 | 值 |
| --- | --- |
| `NODE_VERSION` | `24.20.0` |
| `PNPM_VERSION` | `10.33.3` |
| `GOOGLE_SITE_VERIFICATION` | 可选，填写 Search Console 提供的真实 HTML 标签验证码 |

正式域名固定为 `https://actify.cc`（`src/data/site.tsx`），已在 `wrangler.jsonc` 中声明为 Custom Domain。canonical、RSS、robots 和站点地图共用此地址，不受预览环境变量影响。上线前请完成 [SEO 与域名验收](docs/seo-launch.md) 中的 Cloudflare 重定向和 Search Console 配置。

也可以本地发布：完成构建后执行 `pnpm exec wrangler login`，再执行 `pnpm deploy:cloudflare`。部署命令会发布最近一次 Cloudflare 构建的产物，不会自动重新构建。
