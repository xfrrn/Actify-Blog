import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isIP } from "node:net";
import { database } from "./cms-db.ts";
import { CmsError } from "./cms-store.ts";

const scrypt = promisify(scryptCallback);
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const sessionCookie = "actify-admin";
export const sessionSeconds = 60 * 60 * 24 * 7;
let cachedCredential: { key: string; hash: Promise<Buffer> } | undefined;
async function credential() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username?.trim() || username.length > 128 || !password?.trim() || password.length < 12 || password.length > 256) return;
  const key = digest(JSON.stringify([username, password]));
  if (cachedCredential?.key !== key) cachedCredential = { key, hash: scrypt(password, `actify-admin:${username}`, 64) as Promise<Buffer> };
  return cachedCredential.hash;
}

export async function consumeLimit(key: string, maximum: number, seconds: number) {
  const now = Date.now();
  const db = await database();
  await db.query("DELETE FROM rate_limits WHERE expires <= $1", [now]);
  const { rows: [row] } = await db.query<{ count: number; expires: string }>(`INSERT INTO rate_limits(key,count,expires) VALUES ($1,1,$2)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE WHEN rate_limits.expires <= $3 THEN 1 ELSE rate_limits.count+1 END,
      expires=CASE WHEN rate_limits.expires <= $3 THEN EXCLUDED.expires ELSE rate_limits.expires END
    RETURNING count, expires`, [key, now + seconds * 1000, now]);
  if (row.count > maximum) throw new CmsError(429, "操作太频繁，请稍后再试。", Math.max(1, Math.ceil((Number(row.expires) - now) / 1000)));
}
export function clientIp(request: Request) {
  // Only enable behind the supplied proxy, which replaces this header.
  const forwarded = process.env.TRUST_PROXY === "1" ? request.headers.get("x-real-ip") || "" : "";
  return isIP(forwarded) ? forwarded : "direct";
}
export async function login(username: string, password: string) {
  const value = await credential();
  if (!value) throw new CmsError(503, "请在服务器环境变量中配置 ADMIN_USERNAME 和 ADMIN_PASSWORD（密码需 12–256 个字符）。");
  const candidate = await scrypt(password, `actify-admin:${username}`, 64) as Buffer;
  if (!timingSafeEqual(candidate, value)) throw new CmsError(401, "账号或密码不正确。");
  const token = randomBytes(32).toString("hex");
  const db = await database();
  await db.query("DELETE FROM sessions WHERE expires <= $1", [Date.now()]);
  await db.query("INSERT INTO sessions(hash,expires,credential) VALUES ($1,$2,$3)", [digest(token), Date.now() + sessionSeconds * 1000, digest(value)]);
  return token;
}
export async function validSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { rows: [row] } = await (await database()).query<{ credential: string }>("SELECT credential FROM sessions WHERE hash=$1 AND expires>$2", [digest(token), Date.now()]);
  if (!row) return false;
  const value = await credential();
  return !!value && row.credential === digest(value);
}
export function requestToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
}
export async function requireSession(request: Request) {
  if (!await validSession(requestToken(request))) throw new CmsError(401, "登录已过期。你的修改仍保留，请在新标签页重新登录后重试。");
}
export async function logout(token?: string) { if (token) await (await database()).query("DELETE FROM sessions WHERE hash=$1", [digest(token)]); }
