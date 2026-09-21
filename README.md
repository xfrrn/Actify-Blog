# Actify-Blog

Actify 的个人网站、技术博客与中文内容后台。Next.js / React / Tailwind CSS，单实例 Node.js 24 + SQLite，图片上传至 Cloudflare R2，网站部署于自己的服务器，通过 Cloudflare 代理访问。

## 开始使用

使用 Node.js 24（含原生 SQLite）与 pnpm 10.33.3：

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm content:import
pnpm admin:password
pnpm dev
```

Windows PowerShell 使用 `Copy-Item .env.example .env.local`。打开 `http://localhost:3000/admin`，使用刚设置的密码登录。开发数据默认保存在被 Git 忽略的 `.data/`。

`content:import` 导入仓库现有文章、作品及中英文关系，保留地址和草稿状态。可以重复执行，已导入或在后台修改的内容不会被覆盖。之后在后台写作，修改已经导入的源文件不会更新网站。

## 内容管理

| 入口 | 用途 |
| --- | --- |
| `/admin/posts` | 搜索、状态 / 分类 / 语言筛选；文章编辑、回收站与恢复 |
| 文章编辑页 | Markdown 实时预览，停止输入 2 秒后自动保存，Ctrl / Cmd + S 手动保存 |
| `/admin/projects` | 中英文简介、封面、视频地址、技术标签、链接、排序与首页精选 |
| `/admin/feedback` | 审核匿名反馈，搜索词仅管理员可见 |
| `/admin/media` | 选择、拖放或粘贴图片；复制链接；编辑页选封面或插入正文 |

保存草稿不改变线上版本，点击「发布 / 发布更新」才对读者生效，无需重新构建。中英文分别发布，共用地址；缺少译文时回退到另一语言。地址首次发布后锁定。回收站恢复后需再次发布。

保存失败和登录过期时保留输入，支持重新登录后重试；遇到多标签页修改会拒绝覆盖，需要复制文字后重新载入。页面离开前提示未保存修改，当前标签页也会暂存输入，但浏览器暂存不能替代备份。

Markdown 支持目录、GFM 表格、任务列表、代码高亮和代码标题、图片；不会执行 JSX、JavaScript 或原始 HTML。完整文章预览只允许管理员访问。

前台默认英文，底部 Dock 切换语言。个人介绍、首页近况和联系方式继续在 `src/data/site.tsx` 维护；界面文案在 `src/lib/i18n.ts`。后台复用全站字体、主题、按钮、文章和作品组件，采用独立宽布局。

## 部署与数据

生产环境必须设置代码目录外的持久化目录 `DATA_DIR` 和公开来源 `SITE_ORIGIN`，通过 HTTPS 登录。素材使用 R2 的 S3 API 上传，读者直接通过图片公开域名加载；本地开发可用 `MEDIA_STORAGE=local`。R2 配置见 [部署说明](docs/admin.md#cloudflare-r2-素材)。代码升级需要构建，内容发布直接更新 SQLite。

- [后台、美国服务器部署、Cloudflare 缓存、备份恢复](docs/admin.md)
- [反馈审核与旧 D1 迁移](docs/feedback.md)
- [源码结构](docs/structure.md)
- [SEO 与域名验收](docs/seo-launch.md)

旧 OpenNext / Workers 运行方式已移除。`wrangler.jsonc` 和 `migrations/` 仅保留用于旧 D1 数据导出。

## 检查

```sh
pnpm lint
pnpm typecheck
pnpm test:cms
pnpm test:r2
pnpm build
pnpm test:admin
```

测试使用独立临时数据库，不操作真实内容。覆盖迁移、版本冲突、草稿隔离、中英文发布、鉴权、图片解码、反馈审核、生产 HTTP 输出、进程重启与备份恢复。`test:r2` 使用模拟 S3 传输验证实际签名请求、上传失败、本地旧素材、混合备份和 R2 恢复；不会使用真实密钥或存储桶。`test:admin` 自动启动和关闭临时生产服务，需要先构建。

只读站点检查：用相同 `DATA_DIR` 启动生产服务，再执行 `node scripts/check-site.mjs http://localhost:3000`，验证 SEO、SSR、语言、RSS、站点地图、分享图和 404。

## 声明

- 基于 [Magic UI Portfolio](https://github.com/dillionverma/portfolio) 二次开发，感谢原作者 Dillion Verma。
- 保留原项目 MIT 许可证及版权声明，详见 [LICENSE](LICENSE)。
- 标题带 `Example:` 的文章是写作与排版示例，默认草稿，不代表个人作品或经历。
