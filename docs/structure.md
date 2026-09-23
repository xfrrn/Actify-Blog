# 项目结构

| 任务 | 入口 |
| --- | --- |
| 文章、作品、反馈、图片 | /admin |
| 个人资料、首页近况、导航、联系方式 | src/data/site.tsx |
| 前台首页、博客、作品 | src/app/(site)/ |
| 后台页面和交互 | src/app/admin/、src/components/admin/ |
| 字体、主题、样式 | src/app/layout.tsx、src/app/globals.css |
| 文章排版 | src/components/blog/markdown-body.tsx、src/mdx-components.tsx |
| 分享图 | src/lib/opengraph-image.tsx |
| 正式域名、canonical | src/data/site.tsx 的 DATA.url |
| 来源校验 | SITE_ORIGIN 环境变量 |

```text
public/                   静态资源和分享图字体
src/app/(site)/           窄栏、网格背景、Dock 前台
src/app/admin/            独立宽布局、受保护编辑页和预览
src/app/api/admin/        登录、会话、内容、素材、审核
src/app/api/feedback/     访客反馈提交
src/app/media/            公开上传图片
src/lib/cms-*.ts          PostgreSQL 连接池、自动建表、模型、版本检查
src/lib/admin-*.ts        密码、会话、来源和大小校验
src/lib/posts.ts          已发布文章、语言选择、Markdown 元数据
src/lib/projects.ts       已发布作品
src/lib/r2.ts             R2 S3 签名上传、读取和恢复保护
scripts/admin.mjs         pg_dump 备份与恢复
scripts/check-*.mjs       核心与生产 HTTP 检查
deploy/                  systemd / Caddy 配置
docs/                    使用及部署说明
```

内容流：后台编辑 → DATABASE_URL 指定的 PostgreSQL。后台在事务内锁定内容行并核对版本，保存 JSONB data，显式发布复制到 published；前台、RSS、sitemap、分享图实时读取。图片校验、重新编码后上传 R2 的 media/{uuid}.{ext}，PostgreSQL 记录公开域名链接；本地开发和旧素材保留 DATA_DIR/uploads 与 /media/ 路由。

前后台共用 MarkdownBody 和目录规则，不执行 JSX。mdx-components.tsx 保留名称，但仅做 Markdown 元素排版。根分享图是 src/app/opengraph-image.tsx；博客、文章用显式 opengraph-image/route.ts，避免分组改变公开地址。

运行检查见 [README](../README.md)，持久化和代理规则见 [部署说明](admin.md)。
