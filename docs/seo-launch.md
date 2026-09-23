# actify.cc 上线 SEO

正式地址固定在 `src/data/site.tsx`：`https://actify.cc`。博客保留 `/blog` 和 `/blog/{slug}`；不创建博客子域名。旧的 `NEXT_PUBLIC_SITE_URL` 环境变量已不再使用，可以从构建设置中删除。

## Cloudflare / DNS（必须手动完成）

目前采用美国服务器 + Cloudflare 代理，服务器与缓存配置见 [后台部署](admin.md)。旧 Worker Custom Domain 需在切换时解绑。下面的边缘重定向仍需配置并在切换后复测。

1. DNS 中添加 `www` CNAME 指向 `actify.cc`，开启代理（橙云），确认边缘证书覆盖 `www.actify.cc`。
2. Rules → Redirect Rules → Single Redirect，匹配表达式：

   ```text
   (http.host eq "www.actify.cc") or (http.host eq "actify.cc" and not ssl)
   ```

   动态目标：`concat("https://actify.cc", http.request.uri.path)`；状态码 **301**；启用 **Preserve query string**。这会保留 pathname 和查询参数，并直接跳至正式 HTTPS 地址。
3. 测试 `http://actify.cc/blog/test?seo=1`、`https://www.actify.cc/blog/test?seo=1` 和 `http://www.actify.cc/blog/test?seo=1`，第一跳应为 301，Location 为 `https://actify.cc/blog/test?seo=1`。测试路径本身不存在，因此跟随跳转后的 404 是正确结果。再测试 `/blog`，跳转目标应返回 200。

参考：[Cloudflare www 重定向及查询参数保留](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/)。这些设置在 Cloudflare 边缘生效，不能仅凭本地 Next.js 测试声明上线完成。

## Google Search Console

- 推荐添加 `actify.cc` Domain property，将 Google 给出的真实 TXT 记录填入 Cloudflare DNS。
- 若选择 `https://actify.cc/` URL-prefix property 的 HTML 标签验证：把真实 token 填入服务器环境中的 `GOOGLE_SITE_VERIFICATION`，重启服务。只填 `content` 值，不填整个标签；空值不输出验证标签。
- 验证所有权后提交 `https://actify.cc/sitemap.xml`，用 URL Inspection 检查首页、Projects、Blog 和发布后的文章。

## 内容与检查

- 文章和作品在后台管理，草稿不会公开。sitemap 实时读取 PostgreSQL 的已发布数据，后台发布或撤回后新请求自动更新，无需构建。文章地址在首次发布后锁定。
- Next.js 原生 Metadata API 将根 canonical 序列化为 `https://actify.cc`，与 `https://actify.cc/` 是同一根 URL；sitemap 沿用相同写法。其他页面不带末尾斜杠。
- 主要页面使用 Next.js Metadata API，文章 title、description、日期来自数据库的已发布快照；正文服务端渲染。首页输出真实 WebSite / Person，文章保留 BlogPosting。未添加虚构评价或 FAQ；当前无面包屑 UI，无需额外增加 BreadcrumbList。
- `/blog?category=...` 的 `noindex, follow` 是有意排除筛选视图；`/admin/feedback` 和反馈 API 的 noindex 是有意保护非搜索页面。它们不在 sitemap。404 也应 noindex。
- 同一 URL 的语言由 Cookie 决定，搜索引擎通常获得默认英文界面；这不等于中英版本各有独立可索引 URL。中文原文仍会在没有英文译文时服务端输出。

在运行中的生产构建上执行（不会向站点写入数据）：

```sh
npm run lint
npm run typecheck
npm run build
npm run test:cms
node scripts/check-site.mjs http://localhost:3000
```

`pnpm test:admin`（或 `test:feedback`）在构建后自动创建临时 PostgreSQL 数据库并启动生产服务，账号需有 CREATEDB 权限。运行 `check-site.mjs` 时设置与被检查服务相同的 `DATABASE_URL`；它不修改内容，连接时会初始化缺少的 CMS 表。
