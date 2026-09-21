# 后台与单机部署

## 编辑与发布

登录 `/admin` 后进入文章列表。桌面左右分栏，手机通过「编辑 / 预览」切换。文章设置包含地址、分类、标签、日期、作者和封面。中英文分别编辑和发布，英文不会自动翻译。

停止输入 2 秒后自动保存，或点「保存草稿」/ Ctrl / Cmd + S。「完整预览」先保存，再打开受登录保护的新标签页。发布前核对语言、地址和必填项；发布后新请求直接使用已发布版本。已打开的前台页面需要刷新。

每条内容有 JSONB `data`（草稿）、`published`（线上快照）和递增 `version`。保存、发布在同一个 PostgreSQL 事务内锁定内容行并核对版本，409 冲突不覆盖新内容。每次发布只替换所选语言。撤回后其他已发布译文仍可访问；全部撤回后详情与分享图返回 404，列表、RSS、站点地图移除该地址。回收站撤下所有译文；恢复只回到草稿。首次发布后地址锁定，不提供永久删除或完整历史记录。

作品草稿与线上版本同样分开；修改首页精选、排序、简介后需发布。素材上传生成公开链接。接收实际解码、重新编码的 JPEG / PNG / WebP / GIF，最多 10MB、2500 万输入像素、动画最多 100 帧。保留已有外部图片、视频地址，不提供视频上传和素材永久删除。

## 数据与命令

`DATABASE_URL` 指定 PostgreSQL 数据库，保存内容、反馈、密码哈希、会话、限流和导入记录。第一次连接自动创建缺少的 CMS 表；使用专用数据库和拥有这些表的账号。应用使用连接池，不在客户端暴露连接地址。

```dotenv
DATABASE_URL=postgresql://actify:替换为实际密码@127.0.0.1:5432/actify_blog
```

密码中的 `@`、`:`、`/`、`#` 等字符需做 URL 编码。开发凭据只放被 Git 忽略的 `.env.local`。服务器只在本机开放 PostgreSQL，应用通过 `127.0.0.1:5432` 连接；远程数据库使用带证书校验的 TLS 连接。

`DATA_DIR/uploads/` 仅保存本地开发图片与旧素材，生产设为代码外持久化目录，例如 `/var/lib/actify`，开发默认 `.data/`。数据库文件由 PostgreSQL 管理，不放进应用目录。CLI 读取 `.env.local` / `.env`，进程环境变量优先。

线上新图片存储在 R2，PostgreSQL 保留文件名、尺寸、类型、存储位置和永久公开 URL。素材库、封面和正文直接使用这个 URL。旧本地记录继续从 `/media/` 读取，不删除已有文件。

```sh
pnpm content:import
pnpm admin:password
pnpm feedback:import /private/feedback-export.json
pnpm data:backup /private/backups/actify-2026-09-21
```

密码交互输入两次且隐藏，只保存 scrypt 哈希。重设密码注销全部会话。自动配置可临时传 `ADMIN_SETUP_PASSWORD`，使用后移除；不写入仓库或客户端变量。会话有效期 7 天，生产 Cookie 为 HttpOnly / Secure / SameSite=Strict。

## 从 SQLite 迁移

先停止旧应用写入，配置指向空 PostgreSQL 数据库的 `DATABASE_URL`，让 `DATA_DIR/uploads/` 保持包含旧图片。然后执行：

```sh
pnpm data:migrate-sqlite .data/actify.sqlite
pnpm content:import
```

迁移在单个事务内写入，保留文章 ID、地址、中英文草稿、发布快照、版本、日期、回收站状态、作品、反馈、素材和密码哈希；反馈 ID 序列同步调整。旧会话和限流记录不迁移，需重新登录。源 SQLite 只读打开，保留原文件；图片文件不移动。迁移成功后重复执行跳过，不覆盖后台新修改；目标已有内容但没有迁移标记时拒绝导入，失败回滚全部记录。

旧 SQLite 备份需先校验并保留原文件，再对其中的 `actify.sqlite` 执行此命令，并将旧本地 `uploads/` 复制到 `DATA_DIR/uploads/`。新的 `data:restore` 只接收 PostgreSQL 格式备份。

## Cloudflare R2 素材

在 R2 选择现有存储桶 `blog`，创建仅授权该桶的 **Object Read & Write** S3 凭据。后台用 Access Key ID / Secret Access Key，通过 S3 API 上传和备份，不使用 Cloudflare 全局 API Key。Endpoint 从存储桶设置复制，去掉末尾 `/blog`，保留 `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`，签名 region 为 `auto`（桶的位置显示 APAC 也使用 auto）。[R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/)。

此桶已绑定公开图片域名 `img.actify.cc`，截图显示域名活动且访问已启用。生产使用这个 Custom Domain，可使用 Cloudflare 缓存；无需启用公共开发 URL `r2.dev`。[公开存储桶说明](https://developers.cloudflare.com/r2/buckets/public-buckets/)。不要把备份、数据库或私密文件放进这个公开素材桶。

在服务器 `/etc/actify.env` 设置以下变量，本地需要测试真实上传时也可写入被 Git 忽略的 `.env.local`：

```dotenv
MEDIA_STORAGE=r2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET=blog
R2_ACCESS_KEY_ID=服务端凭据
R2_SECRET_ACCESS_KEY=服务端凭据
R2_PUBLIC_URL=https://img.actify.cc
```

`R2_PUBLIC_URL` 是公开 HTTPS 域名的根地址，不是 S3 Endpoint，不包含桶名、路径或签名参数。对象统一写入 `media/{随机UUID}.{扩展名}`。密钥不要放在 `NEXT_PUBLIC_` 变量、聊天、截图或 Git 中。

图片先上传到同源后台，鉴权并实际解码、重新编码后再发到 R2；不向浏览器发写入凭据，也无需给桶开放浏览器 PUT CORS。上传失败不会在素材列表留下成功记录。R2 对象设置正确的 Content-Type 和一年 immutable 缓存头，文件名不复用；上线后不要设置会删除 `media/` 对象的过期生命周期规则。

生产默认使用 R2，缺少配置会明确提示，不静默写到本地。开发未配置 R2 时默认本地，也可显式 `MEDIA_STORAGE=local`。切换上传位置不改变旧素材的存储记录。第一版不扫描或自动导入桶内原有文件；已有公开 URL 仍可填写为封面或正文图片。

本地 `.env.local` 已按提供的桶设置填写 Endpoint、桶名和公开域名；补齐两项访问密钥后重启服务，在素材库上传一张测试图，确认返回 `img.actify.cc` 链接，在未登录窗口也能打开，再测试插入正文和设为封面。密钥尚未填写，本地模拟检查不代表已经连通真实 R2。部署时将这些 R2 变量一并写入服务器 `/etc/actify.env`。

## 美国服务器（Linux）

请求路径：浏览器 → Cloudflare → Nginx HTTPS → 127.0.0.1:3000 → Next.js → PostgreSQL。准备 Node.js 24、pnpm 10.33.3、PostgreSQL、Nginx 和域名有效证书。`pg_dump` / `pg_restore` 客户端使用与数据库匹配的主版本（当前验证为 18），放入 PATH；Windows 可设置 `PG_BIN_DIR=C:/Program Files/PostgreSQL/18/bin`。Node 可执行路径不同则调整 systemd 的 ExecStart。

创建专用用户与目录，把代码放进 /opt/actify，让 actify 用户可读代码、可写 .next。依赖在 Linux 安装，不复制 Windows node_modules。

```sh
sudo useradd --system --create-home --shell /bin/bash actify
sudo install -d -o actify -g actify -m 700 /var/lib/actify /var/backups/actify
sudo install -d -o actify -g actify /opt/actify
# 仅在新服务器上创建应用账号与数据库，已有数据库不用重复创建：
sudo -u postgres createuser --pwprompt actify
sudo -u postgres createdb --owner=actify actify_blog
```

在 `/etc/actify.env` 写入下列配置及前面的 R2 变量，设置所有者 `root:actify`、权限 `640`，让服务及 actify 用户运行的 CLI 可读取。生产使用专用账号和独立密码，不照搬开发凭据：

```dotenv
DATABASE_URL=postgresql://actify:替换为实际密码@127.0.0.1:5432/actify_blog
DATA_DIR=/var/lib/actify
SITE_ORIGIN=https://actify.cc
TRUST_PROXY=1
MEDIA_STORAGE=r2
GOOGLE_SITE_VERIFICATION=
```

放入仓库代码并完成环境配置后：

```sh
cd /opt/actify
sudo -u actify pnpm install --frozen-lockfile
# 若有旧 SQLite，先按上节迁移，之后再导入尚未迁移的仓库内容。
sudo -u actify node --env-file=/etc/actify.env scripts/admin.mjs import
sudo -u actify node --env-file=/etc/actify.env scripts/admin.mjs password
sudo -u actify node --env-file=/etc/actify.env node_modules/next/dist/bin/next build
sudo cp deploy/actify.service /etc/systemd/system/actify.service
sudo systemctl daemon-reload
sudo systemctl enable --now actify
curl -I http://127.0.0.1:3000/blog
```

[systemd 单元](../deploy/actify.service)读取 `/etc/actify.env`，并在本机 PostgreSQL 服务之后启动。

`TRUST_PROXY=1` 仅用于配套 Nginx：它覆盖客户端 X-Real-IP，Node 端口只绑定本机。直接开发保持 0，此时限流共用一个本地桶。

把 [Nginx 配置](../deploy/nginx.conf) 放进 http 上下文（例如 /etc/nginx/conf.d/actify.conf），替换证书路径。Cloudflare 后面需恢复访客 IP，避免边缘节点共用限流。下载官方范围，分别确认 curl 成功，再生成可信列表：

```sh
curl -fsS https://www.cloudflare.com/ips-v4 -o /tmp/actify-cf-v4
curl -fsS https://www.cloudflare.com/ips-v6 -o /tmp/actify-cf-v6
sudo mkdir -p /etc/nginx/snippets
awk 'NF {print "set_real_ip_from " $0 ";"}' /tmp/actify-cf-v4 /tmp/actify-cf-v6 | sudo tee /etc/nginx/snippets/actify-cloudflare.conf
sudo nginx -t
sudo systemctl reload nginx
```

只信任这些范围发来的 CF-Connecting-IP，范围变化时更新文件。登录每 IP 10 次 / 10 分钟，反馈 3 次 / 分钟，另有 Nginx 登录突发限制。[Cloudflare 请求头说明](https://developers.cloudflare.com/fundamentals/reference/http-headers/)。

源站 HTTPS 正常后，把 actify.cc DNS 指向服务器并开启橙云。SSL/TLS 选 **Full (strict)**，源站证书需未过期且匹配域名。[官方说明](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)。切换时解绑旧 Worker 同域名 Custom Domain / Route，避免继续命中旧应用。保留旧 D1 至迁移验收完成。

切换前冻结旧站反馈写入，最后导出 D1、导入新库，再切 DNS。命令见 [反馈迁移](feedback.md)。域名归一化和 Search Console 见 [SEO 文档](seo-launch.md)。

## Cloudflare 缓存

动态输出均读已发布数据并带 no-store / private。以下两条 Cache Rules **仅匹配主站 `actify.cc`**，不要让主站绕过规则同时匹配图片子域名。移除旧的 Cache Everything、强制 Edge TTL 或 APO 全页缓存：

| 匹配 | 行为 |
| --- | --- |
| 路径以 /_next/static/ 或 /media/ 开头 | Eligible for cache，尊重源站 Cache-Control |
| 不属于以上两个路径的所有请求 | Bypass cache |

后台、接口、预览、HTML、RSS、sitemap 和动态分享图明确回源。带哈希的 JS / CSS / 字体与随机文件名上传图片长期缓存。旧 public 图片第一版也绕过，避免同名替换后看到旧图。[Cache Rules 设置](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)。

R2 图片域名单独匹配 `http.host eq "img.actify.cc"`，允许缓存并尊重对象 Cache-Control。这些图片由 Cloudflare / R2 直接响应，不经美国服务器；`/media/` 保留给本地旧图片和兼容跳转。

切换后清一次旧缓存，检查中文 / 英文页面、后台和 API 没有 CF-Cache-Status: HIT，公开上传图片重复请求可以出现 HIT。语言由 Cookie 决定，不能缓存 HTML。发布无需清缓存或构建；外部社交平台自己的分享图缓存不受此服务控制。

## 备份与恢复

备份通过原生 `pg_dump` 导出 `actify.dump`，在同一个 PostgreSQL 快照下读取素材清单，包含全部引用图片和 SHA-256 清单；不备份登录会话和限流记录。R2 图片通过带签名的 S3 GET 下载进入备份，旧本地图片直接复制；任何下载失败都不会写出成功清单。可在线执行，R2 文件需保持不删除、不覆盖。备份输出必须为 DATA_DIR 外一个不存在的新目录，父目录先创建。[pg_dump 说明](https://www.postgresql.org/docs/current/app-pgdump.html)。

```sh
cd /opt/actify
sudo -u actify /usr/bin/node --env-file=/etc/actify.env scripts/admin.mjs backup /var/backups/actify/manual-2026-09-21
```

定期把完整目录复制到服务器外的私有存储。备份含未公开内容、搜索词和密码哈希，不提供公开下载。仓库 public 文件随代码部署；已有外部媒体仍依赖原图片服务，不包含在本地上传备份中。

恢复先验证全部哈希和图片引用，通过 `pg_restore --single-transaction` 写入空 PostgreSQL 数据库，并清空会话。只恢复自己创建或信任的备份。R2 素材恢复到原桶和原公开域名：缺失对象会重新上传；已有对象逐字节一致时复用，不一致则报错，绝不覆盖。需要原桶的读写凭据，数据库连接密码和 R2 密钥不包含在备份中。保持原图片域名有效，正文里的公开 URL 才继续可用。

恢复必须同时指定**无应用表的空数据库**和**不存在或空 DATA_DIR**，保留原数据库。示例：

```sh
sudo systemctl stop actify
cd /opt/actify
sudo -u postgres createdb --owner=actify actify_blog_restored
sudo install -o root -g actify -m 640 /etc/actify.env /etc/actify-restore.env
# 编辑 /etc/actify-restore.env：DATABASE_URL 的库名改为 actify_blog_restored，
# DATA_DIR 改为 /var/backups/actify/restored-data。
sudo -u actify /usr/bin/node --env-file=/etc/actify-restore.env scripts/admin.mjs restore /var/backups/actify/manual-2026-09-21
# 验证完成后，在 /etc/actify.env 应用同样的 DATABASE_URL 与 DATA_DIR。
sudo systemctl start actify
```

该示例将恢复库和恢复目录作为新的持久化存储；后续备份另选 DATA_DIR 之外的新目录。保留旧库，核对文章、译文、作品、反馈、图片，重启后再检查。失败可停服务切回旧 DATABASE_URL / DATA_DIR。文件移动失败时暂存图片仍保留，不自动删除；修正目录问题后核对再启动。

代码升级：先备份，停止服务，更新代码和依赖并构建，启动服务。保留 PostgreSQL 数据库与 DATA_DIR，不从仓库覆盖后台内容。日志：`journalctl -u actify -n 100`。

## 验收

```sh
pnpm lint
pnpm typecheck
pnpm test:cms
pnpm test:migration
pnpm test:r2
pnpm build
pnpm test:admin
```

测试连接取 `TEST_DATABASE_URL`，未设置时取 `DATABASE_URL`。测试账号需有 CREATEDB 权限：每次创建随机 `actify_test_*` 库，结束只清理本次创建的库，不操作原博客库。生产账号不必有此权限，另行配置测试账号即可。

核心测试验证真实并发保存、限流、pg_dump 备份和 pg_restore 恢复，并拒绝损坏备份。迁移检查核对 SQLite 草稿、发布快照、密码、旧素材、反馈 ID、重复导入与事务回滚。R2 测试使用假凭据和模拟传输，核对 S3 签名、上传失败、混合备份与不覆盖恢复。HTTP 测试启动隔离的生产服务，验证权限、来源、动态发布、译文、RSS / sitemap / 分享图、作品、媒体、审核，重启后再读内容与图片。

完整站点检查使用与运行服务相同的 DATABASE_URL，不修改内容；连接时会初始化缺少的 CMS 表：

```sh
node --env-file=/etc/actify.env scripts/check-site.mjs http://127.0.0.1:3000
```

参考 [Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)。目标 Linux 服务、证书、真实 Cloudflare 规则需在服务器验收，本地检查不代表已远程部署。
