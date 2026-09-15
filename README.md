# Actify-Blog

Actify 的个人网站与技术博客，基于 Next.js、React、Tailwind CSS 和 MDX 构建。

## 声明

- 基于 [Magic UI Portfolio](https://github.com/dillionverma/portfolio) 二次开发，感谢原作者 Dillion Verma。
- 保留原项目的 MIT 许可证及版权声明，详见 [LICENSE](./LICENSE)。
- 标题带有 `Example:` 的文章为写作与排版示例，不代表个人作品或经历。

## 写博客与分类

文章放在 `content/`，使用 `.md` 或 `.mdx`。文件头示例（下面是填写格式，不是已发布文章）：

```yaml
---
title: "填写文章标题"
description: "填写一句摘要"
date: "2026-09-15"
category: "你自己起的分类名"
tags: ["Obsidian", "翻译"]
draft: true
---
```

- `category` 由你自由命名。发布文章后，新名称会自动成为可选分类，同名分类会合并并统计文章数。
- 不预设分类，也不关联项目。可以省略 `category` 或留空，文章仍显示在「全部文章」中。
- 分类下拉框只显示已发布文章中使用的分类，选择后直接筛选；修改文章中的名称即可调整分类。
- 文章按日期倒序、按月份分组；左侧时间导航跟随滚动高亮，手机上显示为顶部横向导航。
- 准备发布时再将 `draft` 改为 `false`。草稿不会出现在文章列表、筛选计数、时间线、RSS 或站点地图中。
- 项目封面统一为 16:9；缺少图片或加载失败时显示项目名称文字封面。

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
| `NEXT_PUBLIC_SITE_URL` | `https://actify.cc` |

正式域名为 `https://actify.cc`，已在 `wrangler.jsonc` 中声明为 Custom Domain。部署时 Cloudflare 会配置对应的 DNS 和 HTTPS 证书。网站地址用于 canonical、RSS、robots 和站点地图；更换域名后需更新配置并重新构建。

也可以本地发布：完成构建后执行 `pnpm exec wrangler login`，再执行 `pnpm deploy:cloudflare`。部署命令会发布最近一次 Cloudflare 构建的产物，不会自动重新构建。
