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
  transaction(() => {
    database().prepare("INSERT OR REPLACE INTO settings(key,value) VALUES ('password',?)").run(`${salt}:${hash}`);
    database().exec("DELETE FROM sessions");
  });
}
function credential() { return (database().prepare("SELECT value FROM settings WHERE key='password'").get() as { value: string } | undefined)?.value; }
export function configured() { return !!credential(); }

export function consumeLimit(key: string, maximum: number, seconds: number) {
  const now = Date.now();
  database().prepare("DELETE FROM rate_limits WHERE expires <= ?").run(now);
  const row = database().prepare(`INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(key, now + seconds * 1000) as { count: number };
  if (row.count > maximum) throw new CmsError(429, "操作太频繁，请稍后再试。");
}
export function clientIp(request: Request) {
  // Only enable behind the supplied proxy, which replaces this header.
  const forwarded = process.env.TRUST_PROXY === "1" ? request.headers.get("x-real-ip") || "" : "";
  return isIP(forwarded) ? forwarded : "direct";
}
export async function login(password: string, ip: string) {
  consumeLimit(`login:${ip}`, 10, 600);
  const value = credential();
  if (!value) throw new CmsError(503, "尚未设置管理密码，请先在服务器运行 pnpm admin:password。");
  const [salt, stored] = value.split(":");
  const candidate = await scrypt(password, salt, 64) as Buffer;
  if (!timingSafeEqual(candidate, Buffer.from(stored, "hex"))) throw new CmsError(401, "管理密码不正确。");
  const token = randomBytes(32).toString("hex");
  database().prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
  database().prepare("INSERT INTO sessions(hash,expires,credential) VALUES (?,?,?)").run(digest(token), Date.now() + sessionSeconds * 1000, digest(value));
  return token;
}
export function validSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const row = database().prepare("SELECT credential FROM sessions WHERE hash=? AND expires>?").get(digest(token), Date.now()) as { credential: string } | undefined;
  return !!row && row.credential === digest(credential() || "");
}
export function requestToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
}
export function requireSession(request: Request) {
  if (!validSession(requestToken(request))) throw new CmsError(401, "登录已过期。你的修改仍保留，请在新标签页重新登录后重试。");
}
export function logout(token?: string) { if (token) database().prepare("DELETE FROM sessions WHERE hash=?").run(digest(token)); }
