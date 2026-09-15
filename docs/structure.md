# 项目结构

## 日常维护入口

| 任务 | 位置 |
| --- | --- |
| 写文章 | `content/`，支持 `.md` 和 `.mdx` |
| 修改个人资料、导航、联系方式与项目 | `src/data/site.tsx` |
| 修改首页 | `src/app/page.tsx` |
| 修改全站布局和主题样式 | `src/app/layout.tsx`、`src/app/globals.css` |
| 调整文章排版 | `src/mdx-components.tsx`、`src/components/blog/` |
| 修改分享图 | `src/lib/opengraph-image.tsx` |
| 配置站点域名 | 参考 `.env.example` 设置 `NEXT_PUBLIC_SITE_URL` |

## 目录职责

```text
content/                 博客文章
public/                  本地静态资源和分享图字体
src/
  app/                   页面、路由、Metadata 与全局样式
  components/
    blog/                文章列表、代码块、图片与视频
    home/                首页专属区块及活动时间线
    projects/            首页和项目页共用的项目展示组件
    layout/              全站导航与主题切换
    icons/               社交图标与使用中的技术栈图标
    magicui/             动画、Dock 和背景效果
    ui/                  按钮、卡片、头像等基础组件
  data/site.tsx          集中的站点与个人资料
  lib/                   文章查询、分页、内容处理、分享图生成
  mdx-components.tsx     MDX 标签与 React 组件的映射入口
scripts/                 可运行检查
docs/                    维护说明
```

工作、教育和活动数据为空时，对应首页区块自动隐藏。
R2 图片可直接在文章及项目数据中使用完整公开 URL；本地字体仍由分享图使用。

## 内容流转

`content/` → `content-collections.ts` 校验与编译 → `.content-collections/` 生成数据
→ `src/lib/posts.ts` 过滤草稿并排序 → 页面、RSS 与 Sitemap。

`src/app/` 下三个 `opengraph-image.tsx` 保留各自路由信息，调用同一份分享图生成代码。

## 运行与检查

```sh
pnpm install --frozen-lockfile
pnpm dev
```

提交前运行 `pnpm lint`、`pnpm typecheck`、`pnpm test:content` 和 `pnpm build`。
`typecheck` 会生成内容数据，应在 `test:content` 前执行。

生产构建后运行 `pnpm start`，另开终端执行
`node scripts/check-site.mjs http://localhost:3000`，检查页面、订阅、分享图和 404。
站点检查目前使用仓库中的 `mdx-writing-guide` 示例文章；删除该示例时需同步更新检查路径。

`node_modules/`、`.next/`、`.content-collections/`、`output/` 和 `.playwright-cli/`
均为依赖或生成内容，已被 Git 忽略，不作为源码维护。
