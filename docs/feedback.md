# 反馈审核与旧 D1 迁移

首页匿名提交痛点和选填搜索词，先进入待审核。统一登录后在 `/admin/feedback` 公开、不公开或撤下。每页 20 条，导航显示真实待审核数量。

状态为 pending / published / hidden。首页仅展示最新 20 条已公开原文和日期；搜索词仅发送给管理员。原文按纯文本渲染，审核后的新请求立即更新，不需构建。

PostgreSQL 和统一会话替代旧 FEEDBACK_ADMIN_TOKEN 与 D1 在线读写。生产通过可信反向代理传递访客 IP，由应用限流，每分钟最多 3 次，并校验来源、隐藏字段和大小。失败保留输入，只有提交成功才清空。部署见 [后台说明](admin.md)。

## 导入旧 Cloudflare D1

`wrangler.jsonc` 与 `migrations/` 只保留作迁移用途。填入已有数据库的 database_id，或使用旧配置；不要重复创建数据库。

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 execute FEEDBACK_DB --remote --command "SELECT id, pain_point, search_query, locale, status, created_at FROM feedback ORDER BY id" --json > /private/feedback-export.json
node --env-file=/etc/actify.env scripts/admin.mjs import-feedback /private/feedback-export.json
```

接受 Wrangler 的 `[{results: [...]}]` 或 JSON 数组，保留原文、搜索词、状态、语言和时间。旧 ID 作为来源记录，重复导入不覆盖新审核结果；本地 ID 冲突则分配新 ID。

切换前冻结旧站提交、最后导出，核对三种状态数量和原文后切 DNS。保留旧 D1 和私有导出至验收完成，导出不放 public 或 Git。

## 检查

```sh
pnpm test:cms
pnpm build
pnpm test:admin
```

测试使用独立临时数据，不需要 D1 或旧 token，不写真实库。覆盖重复导入、权限、限流、审核和前台展示。
