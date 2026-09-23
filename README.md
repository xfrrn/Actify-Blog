# Actify-Blog

Actify 的个人网站、技术博客与中文内容后台。Next.js / React / Tailwind CSS，单实例 Node.js 24 + PostgreSQL，图片上传至 Cloudflare R2，网站部署于自己的服务器，通过 Cloudflare 代理访问。

## 开始使用

使用 Node.js 24、pnpm 10.33.3 和 PostgreSQL（已在 PostgreSQL 18 验证），先创建数据库 `actify_blog`：

配置好 `DATABASE_URL` 后，开发和生产服务在启动时自动创建缺失的表与索引，保留已有数据，无需手动运行迁移文件。数据库账号需有建表权限。后台账号和密码直接填写 `ADMIN_USERNAME`、`ADMIN_PASSWORD`，无需初始化命令。

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# 编辑 .env.local，填写数据库连接、后台账号和密码；已有配置不要覆盖。
pnpm dev
```

Windows PowerShell 首次配置使用 `Copy-Item .env.example .env.local`。打开 `http://localhost:3000/admin`，使用环境变量中的账号和密码登录。内容保存在 `DATABASE_URL` 指定的 PostgreSQL 数据库，本地图片默认在被 Git 忽略的 `.data/uploads/`。数据库密码与后台登录密码分别设置。

文章和作品只保存在数据库，通过后台创建和编辑。新数据库初始没有内容；迁移到其他服务器时使用数据库备份恢复，Git 只同步代码。

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

生产环境设置 `DATABASE_URL`、公开来源 `SITE_ORIGIN` 和 R2 配置，通过 HTTPS 登录。素材使用 R2 的 S3 API 上传，读者直接通过图片公开域名加载，无需配置本地图片目录；本地开发可用 `MEDIA_STORAGE=local`，图片默认保存在 `.data/uploads/`。配置见 [部署说明](docs/admin.md)。代码升级需要构建，内容发布直接更新 PostgreSQL。

- [后台、美国服务器部署、Cloudflare 缓存、备份恢复](docs/admin.md)
- [反馈审核](docs/feedback.md)
- [源码结构](docs/structure.md)
- [SEO 与域名验收](docs/seo-launch.md)

## 检查

```sh
pnpm lint
pnpm typecheck
pnpm test:cms
pnpm test:r2
pnpm build
pnpm test:admin
```

测试使用真实 PostgreSQL，通过 `TEST_DATABASE_URL`（未设置时使用 `DATABASE_URL`）的账号创建随机临时库并在结束后清理，需要 CREATEDB 权限，不操作原库内容。备份检查需要 `pg_dump` / `pg_restore` 在 PATH 中，或设置 `PG_BIN_DIR`。覆盖启动自动建表、并发保存与限流、草稿隔离、中英文发布、鉴权、图片解码、反馈审核、生产 HTTP 输出、重启与备份恢复。`test:r2` 仅模拟 S3 传输，不会使用真实 R2 密钥或存储桶；`test:admin` 自动启动和关闭临时生产服务，需要先构建。

站点检查：使用与生产服务相同的 `DATABASE_URL`，执行 `node scripts/check-site.mjs http://localhost:3000`，验证 SEO、SSR、语言、RSS、站点地图、分享图和 404。不会修改内容；连接时会初始化缺少的 CMS 表。

## 声明

- 基于 [Magic UI Portfolio](https://github.com/dillionverma/portfolio) 二次开发，感谢原作者 Dillion Verma。
- 保留原项目 MIT 许可证及版权声明，详见 [LICENSE](LICENSE)。
