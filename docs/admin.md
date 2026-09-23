# 后台与单机部署

## 编辑与发布

登录 `/admin` 后进入文章列表。桌面左右分栏，手机通过「编辑 / 预览」切换。文章设置包含地址、分类、标签、日期、作者和封面。中英文分别编辑和发布，英文不会自动翻译。

停止输入 2 秒后自动保存，或点「保存草稿」/ Ctrl / Cmd + S。「完整预览」先保存，再打开受登录保护的新标签页。发布前核对语言、地址和必填项；发布后新请求直接使用已发布版本。已打开的前台页面需要刷新。

每条内容有 JSONB `data`（草稿）、`published`（线上快照）和递增 `version`。保存、发布在同一个 PostgreSQL 事务内锁定内容行并核对版本，409 冲突不覆盖新内容。每次发布只替换所选语言。撤回后其他已发布译文仍可访问；全部撤回后详情与分享图返回 404，列表、RSS、站点地图移除该地址。回收站撤下所有译文；恢复只回到草稿。首次发布后地址锁定，不提供永久删除或完整历史记录。

作品草稿与线上版本同样分开；修改首页精选、排序、简介后需发布。素材上传生成公开链接。接收实际解码、重新编码的 JPEG / PNG / WebP / GIF，最多 10MB、2500 万输入像素、动画最多 100 帧。保留已有外部图片、视频地址，不提供视频上传和素材永久删除。

## 数据与命令

`DATABASE_URL` 指定 PostgreSQL 数据库，保存内容、反馈、会话和限流记录。`pnpm dev` / `pnpm start` / systemd 启动时自动创建缺少的 CMS 表和索引，完成后才处理应用请求；不需要手动执行 SQL 或迁移文件。已有表和数据保留，多个进程同时启动时通过事务锁串行建表；建表失败会阻止启动并报告错误。数据库本身与账号需预先准备，应用账号需要建表权限。CLI 首次连接也复用同一逻辑。应用使用连接池，不在客户端暴露连接地址。

```dotenv
DATABASE_URL=postgresql://actify:替换为实际密码@127.0.0.1:5432/actify_blog
```

密码中的 `@`、`:`、`/`、`#` 等字符需做 URL 编码。开发凭据只放被 Git 忽略的 `.env.local`。服务器只在本机开放 PostgreSQL，应用通过 `127.0.0.1:5432` 连接；远程数据库使用带证书校验的 TLS 连接。

图片全部使用 R2 时无需配置本地目录。本地开发图片与旧素材默认保存在 `.data/uploads/`；只有需要保留本地图片时，才额外设置 `DATA_DIR` 指向持久化目录，例如 `/var/lib/actify`。数据库文件由 PostgreSQL 管理，不放进应用目录。CLI 读取 `.env.local` / `.env`，进程环境变量优先。

线上新图片存储在 R2，PostgreSQL 保留文件名、尺寸、类型、存储位置和永久公开 URL。素材库、封面和正文直接使用这个 URL。旧本地记录继续从 `/media/` 读取，不删除已有文件。

```sh
pnpm data:backup /private/backups/actify-2026-09-21
```

后台账号和密码直接配置在本地 `.env.local`（也支持 `.env`）或服务器 `/etc/actify.env`：

```dotenv
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
```

填入 12–256 个字符的独立强密码，不要留空；账号最长 128 个字符，区分大小写。未配置或密码长度不合要求时拒绝登录，不使用默认密码。修改账号或密码后重启服务，旧会话失效。凭据仅从服务端环境变量读取，使用 scrypt 和恒定时间比较校验；会话只存令牌哈希和凭据指纹。会话有效期 7 天，生产 Cookie 为 HttpOnly / Secure / SameSite=Strict。

保护自动启用：登录每 IP 最多 10 次 / 10 分钟、全站最多 100 次 / 10 分钟；后台写入最多 120 次 / 分钟，图片上传最多 20 次 / 分钟。错误格式的登录请求也计数，账号和密码错误使用相同提示。限流计数保存在 PostgreSQL，重启不清零，超限返回 429 和 Retry-After。退出登录不受写入限流影响。写入接口同时校验来源和请求大小。

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

## 美国服务器（Ubuntu / Debian + Caddy）

请求路径：浏览器 → Cloudflare → Caddy HTTPS → 127.0.0.1:3000 → Next.js → PostgreSQL；图片通过 `img.actify.cc` 直接访问 R2。沿用已有 Caddy，应用用 systemd 管理。

### 1. 安装运行环境

使用受支持的 Ubuntu / Debian。以下命令用于尚未安装 Node.js / PostgreSQL 的服务器；已有环境先检查版本，不重复创建数据库或替换其他应用的运行环境。项目使用 Node.js 24、pnpm 10.33.3，PostgreSQL 已在 18 验证，Caddy 配置要求 2.8 或更高。

```sh
sudo apt update
sudo apt install -y ca-certificates curl git postgresql-common

# NodeSource 的 Node.js 24 软件源，安装到系统路径。
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/actify-node-setup.sh
sudo bash /tmp/actify-node-setup.sh
sudo apt install -y nodejs
sudo npm install -g pnpm@10.33.3

# PostgreSQL 官方软件源；脚本会确认当前发行版。
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-18 postgresql-client-18
sudo systemctl enable --now postgresql

node --version
pnpm --version
psql --version
caddy version
```

安装来源：[NodeSource](https://github.com/nodesource/distributions)、[PostgreSQL Ubuntu](https://www.postgresql.org/download/linux/ubuntu/) / [Debian](https://www.postgresql.org/download/linux/debian/)。`pg_dump` / `pg_restore` 使用与数据库匹配的主版本，放入 PATH。若系统安装了多个版本，可在 `/etc/actify.env` 加 `PG_BIN_DIR=/usr/lib/postgresql/18/bin`。systemd 使用 `/usr/bin/node`，路径不同则按 `command -v node` 的结果调整 ExecStart，并确保 actify 用户可执行。

### 2. 放入代码、创建数据库

先把准备上线的版本（包括 `deploy/Caddyfile`）推送到仓库，或上传到服务器。依赖和构建在 Linux 上生成，不复制 Windows 的 `node_modules` / `.next` / 开发环境文件。以下为首次部署，已有目录或数据库请沿用。

```sh
sudo useradd --system --create-home --shell /bin/bash actify
sudo install -d -o actify -g actify -m 700 /var/backups/actify
sudo install -d -o actify -g actify /opt/actify
sudo -u actify git clone https://github.com/xfrrn/Actify-Blog.git /opt/actify
# 仅在新服务器上创建应用账号与数据库，已有数据库不用重复创建：
sudo -u postgres createuser --pwprompt actify
sudo -u postgres createdb --owner=actify actify_blog
```

数据库只监听本机；服务器防火墙和云安全组保留现有 SSH 管理入口，网站开放 80/443，3000 和 5432 不对公网开放。

### 3. 配置生产环境

用 `sudoedit /etc/actify.env` 写入以下配置，填入数据库连接、后台账号密码与前面说明的 R2 S3 凭据：

```dotenv
DATABASE_URL=postgresql://actify:替换为实际密码@127.0.0.1:5432/actify_blog
ADMIN_USERNAME=admin
ADMIN_PASSWORD=
SITE_ORIGIN=https://actify.cc
TRUST_PROXY=1
MEDIA_STORAGE=r2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET=blog
R2_ACCESS_KEY_ID=替换为实际访问密钥
R2_SECRET_ACCESS_KEY=替换为实际秘密密钥
R2_PUBLIC_URL=https://img.actify.cc
GOOGLE_SITE_VERIFICATION=
```

填写 `ADMIN_PASSWORD` 后再启动。数据库密码中的特殊字符需要 URL 编码；`SITE_ORIGIN` 必须与后台访问地址完全相同，不加末尾 `/`。代码里的正式域名也在 `src/data/site.tsx`，换域名时一并修改。然后限制环境文件权限：

```sh
sudo chown root:actify /etc/actify.env
sudo chmod 640 /etc/actify.env
```

### 4. 初始化并启动应用

缺失的表由服务启动时自动创建，后台使用环境变量中的账号和密码登录。新数据库没有文章和作品，启动后在后台添加。

```sh
cd /opt/actify
sudo -u actify pnpm install --frozen-lockfile
```

如果要保留已有内容，先在原环境运行 `pnpm data:backup <新目录>`，将完整备份私下传到服务器，按后文恢复到空数据库和空的本地恢复目录，再执行下面的构建与启动。Git 只同步代码，不包含数据库内容；全新站点可直接执行：

```sh
sudo -u actify node --env-file=/etc/actify.env node_modules/next/dist/bin/next build
sudo cp deploy/actify.service /etc/systemd/system/actify.service
sudo systemctl daemon-reload
sudo systemctl enable --now actify
curl -I http://127.0.0.1:3000/blog
```

[systemd 单元](../deploy/actify.service)读取 `/etc/actify.env`，并在本机 PostgreSQL 服务之后启动。

### 5. 合并 Caddy 配置

把 [Caddyfile](../deploy/Caddyfile) 的内容合并进 `/etc/caddy/Caddyfile`，保留已有站点和证书策略。全局 `{ ... }` 块最多一个且必须位于文件开头：已有全局块时，把示例的 `servers` 设置合进去；已有 `servers` / `trusted_proxies` 时核对并合并，避免重复或扩大信任范围。`actify.cc` 也只保留一个站点块。

`TRUST_PROXY=1` 依赖 `header_up X-Real-IP {client_ip}`：覆盖请求自带的 X-Real-IP；仅当连接来自可信 Cloudflare 网段时，才读取 CF-Connecting-IP。其他连接使用实际来源 IP。不要直接转发任意请求的 CF-Connecting-IP，也不要把 Node 端口开放到公网。应用负责登录每 IP 10 次 / 10 分钟、反馈 3 次 / 分钟的限流，无需额外 Caddy 插件。

示例已包含核对日期的官方 IPv4 / IPv6 网段。上线时及范围变化后，对照 [IPv4](https://www.cloudflare.com/ips-v4) / [IPv6](https://www.cloudflare.com/ips-v6) 更新 `trusted_proxies static`。参考 [Caddy 可信代理](https://caddyserver.com/docs/caddyfile/options#trusted-proxies) 与 [请求头覆盖](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#headers)。

```sh
sudo cp -p /etc/caddy/Caddyfile /etc/caddy/Caddyfile.before-actify
sudoedit /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
# 只在校验通过后执行：
sudo systemctl reload caddy
```

### 6. HTTPS、Cloudflare 与切换

已有 `actify.cc` 有效证书时沿用。如果这是新域名、Caddy 还没有证书，可以在切换时先将 `actify.cc` 的 A 记录指向服务器并暂时关闭代理（灰云），确认 80/443 可达，让 Caddy 自动签发证书；不要留下指向旧服务器的 AAAA 记录。`curl -I https://actify.cc/blog` 正常后再开启橙云。后续保持 HTTP ACME 验证路径可达，不让旧 Worker、重定向或 WAF 挑战拦截证书续期。参考 [Caddy 自动 HTTPS](https://caddyserver.com/docs/automatic-https)。

若要一直保留橙云，可为 Caddy 配置 Cloudflare Origin CA 证书（显式 `tls <证书路径> <私钥路径>`，需 caddy 用户可读），或沿用已有 DNS 验证方案；Origin CA 证书供 Cloudflare 回源使用，浏览器不能直接信任它。参考 [Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)。

Cloudflare SSL/TLS 选 **Full (strict)**，要求源站证书未过期且匹配域名。[官方说明](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)。若域名仍绑定旧 Worker，解绑其 Custom Domain / Route 后将 DNS 指向新服务器。域名归一化和 Search Console 见 [SEO 文档](seo-launch.md)。

按下一节配置缓存后，访问 `https://actify.cc/admin`，验证登录、草稿发布、图片上传和中英文页面，并运行：

```sh
cd /opt/actify
sudo -u actify node --env-file=/etc/actify.env scripts/check-site.mjs http://127.0.0.1:3000
sudo journalctl -u actify -n 100 --no-pager
sudo journalctl -u caddy -n 100 --no-pager
```

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

定期把完整目录复制到服务器外的私有存储。备份含未公开内容和搜索词，从旧版本升级的数据库备份还可能包含历史密码哈希，不提供公开下载。仓库 public 文件随代码部署；已有外部媒体仍依赖原图片服务，不包含在本地上传备份中。

恢复先验证全部哈希和图片引用，通过 `pg_restore --single-transaction` 写入空 PostgreSQL 数据库，并清空会话。只恢复自己创建或信任的备份。R2 素材恢复到原桶和原公开域名：缺失对象会重新上传；已有对象逐字节一致时复用，不一致则报错，绝不覆盖。需要原桶的读写凭据；环境变量中的后台账号密码、数据库连接密码和 R2 密钥不包含在备份中。保持原图片域名有效，正文里的公开 URL 才继续可用。

恢复需要**无应用表的空数据库**和**不存在或空的本地恢复目录**（默认 `.data`，可用 `DATA_DIR` 修改），保留原数据库。示例使用独立目录：

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

代码升级：先备份，停止服务，更新代码和依赖并构建，启动服务。保留 PostgreSQL 数据库、R2 图片及已有的本地图片目录，不从仓库覆盖后台内容。日志：`journalctl -u actify -n 100`。

## 验收

```sh
pnpm lint
pnpm typecheck
pnpm test:cms
pnpm test:r2
pnpm build
pnpm test:admin
```

测试连接取 `TEST_DATABASE_URL`，未设置时取 `DATABASE_URL`。测试账号需有 CREATEDB 权限：每次创建随机 `actify_test_*` 库，结束只清理本次创建的库，不操作原博客库。生产账号不必有此权限，另行配置测试账号即可。

核心测试验证真实并发保存、限流、pg_dump 备份和 pg_restore 恢复，并拒绝损坏备份。R2 测试使用假凭据和模拟传输，核对 S3 签名、上传失败、混合备份与不覆盖恢复。HTTP 测试从空数据库启动，验证自动建表、权限、来源、动态发布、译文、RSS / sitemap / 分享图、作品、媒体、审核，重启后检查缺失表补齐、内容与图片保留。

完整站点检查使用与运行服务相同的 DATABASE_URL，不修改内容；连接时会初始化缺少的 CMS 表：

```sh
node --env-file=/etc/actify.env scripts/check-site.mjs http://127.0.0.1:3000
```

参考 [Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)。目标 Linux 服务、证书、真实 Cloudflare 规则需在服务器验收，本地检查不代表已远程部署。
