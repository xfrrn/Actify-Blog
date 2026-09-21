import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isIP } from "node:net";
import { database, transaction } from "./cms-db.ts";
import { CmsError } from "./cms-store.ts";

const scrypt = promisify(scryptCallback);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const sessionCookie = "actify-admin";
export const sessionSeconds = 60 * 60 * 24 * 7;
export async function setPassword(password: string) {
  if (password.length < 12 || password.length > 256) throw new Error("密码需要 12–256 个字符。");
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64) as Buffer).toString("hex");
  await transaction(async (db) => {
    await db.query("INSERT INTO settings(key,value) VALUES ('password',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value", [`${salt}:${hash}`]);
    await db.query("DELETE FROM sessions");
  });
}
async function credential() { return (await (await database()).query<{ value: string }>("SELECT value FROM settings WHERE key='password'")).rows[0]?.value; }

export async function consumeLimit(key: string, maximum: number, seconds: number) {
  const now = Date.now();
  const db = await database();
  await db.query("DELETE FROM rate_limits WHERE expires <= $1", [now]);
  const { rows: [row] } = await db.query<{ count: number }>(`INSERT INTO rate_limits(key,count,expires) VALUES ($1,1,$2)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE WHEN rate_limits.expires <= $3 THEN 1 ELSE rate_limits.count+1 END,
      expires=CASE WHEN rate_limits.expires <= $3 THEN EXCLUDED.expires ELSE rate_limits.expires END
    RETURNING count`, [key, now + seconds * 1000, now]);
  if (row.count > maximum) throw new CmsError(429, "操作太频繁，请稍后再试。");
}
export function clientIp(request: Request) {
  // Only enable behind the supplied proxy, which replaces this header.
  const forwarded = process.env.TRUST_PROXY === "1" ? request.headers.get("x-real-ip") || "" : "";
  return isIP(forwarded) ? forwarded : "direct";
}
export async function login(password: string, ip: string) {
  await consumeLimit(`login:${ip}`, 10, 600);
  const value = await credential();
  if (!value) throw new CmsError(503, "尚未设置管理密码，请先在服务器运行 pnpm admin:password。");
  const [salt, stored] = value.split(":");
  const candidate = await scrypt(password, salt, 64) as Buffer;
  if (!timingSafeEqual(candidate, Buffer.from(stored, "hex"))) throw new CmsError(401, "管理密码不正确。");
  const token = randomBytes(32).toString("hex");
  const db = await database();
  await db.query("DELETE FROM sessions WHERE expires <= $1", [Date.now()]);
  await db.query("INSERT INTO sessions(hash,expires,credential) VALUES ($1,$2,$3)", [digest(token), Date.now() + sessionSeconds * 1000, digest(value)]);
  return token;
}
export async function validSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { rows: [row] } = await (await database()).query<{ credential: string; value: string }>("SELECT s.credential, p.value FROM sessions s JOIN settings p ON p.key='password' WHERE s.hash=$1 AND s.expires>$2", [digest(token), Date.now()]);
  return !!row && row.credential === digest(row.value);
}
export function requestToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
}
export async function requireSession(request: Request) {
  if (!await validSession(requestToken(request))) throw new CmsError(401, "登录已过期。你的修改仍保留，请在新标签页重新登录后重试。");
}
export async function logout(token?: string) { if (token) await (await database()).query("DELETE FROM sessions WHERE hash=$1", [digest(token)]); }
