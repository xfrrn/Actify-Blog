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
