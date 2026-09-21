import { AwsClient } from "aws4fetch";
import { CmsError } from "./cms-store.ts";

export function mediaStorage(): "local" | "r2" {
  const configured = Object.entries(process.env).some(([key, value]) => key.startsWith("R2_") && value);
  const storage = process.env.MEDIA_STORAGE || (configured || process.env.NODE_ENV === "production" ? "r2" : "local");
  if (storage !== "local" && storage !== "r2") throw new CmsError(503, "MEDIA_STORAGE 必须为 local 或 r2。");
  return storage;
}

function settings() {
  const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL } = process.env;
  if (![R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL].every(Boolean)) {
    throw new CmsError(503, "请在服务器配置 R2_ENDPOINT、R2_BUCKET、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 和 R2_PUBLIC_URL。");
  }
  let endpoint: URL, publicUrl: URL;
  try {
    endpoint = new URL(R2_ENDPOINT!); publicUrl = new URL(R2_PUBLIC_URL!);
    if ([endpoint, publicUrl].some((url) => url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/")
      || !endpoint.hostname.endsWith(".r2.cloudflarestorage.com") || endpoint.port
      || publicUrl.hostname.endsWith(".r2.cloudflarestorage.com")
      || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(R2_BUCKET!)) throw new Error();
  } catch { throw new CmsError(503, "R2 配置无效：请填写 S3 Endpoint、存储桶名称和 HTTPS 图片公开域名。"); }
  return { endpoint: endpoint.origin, publicUrl: publicUrl.origin, bucket: R2_BUCKET!, accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY! };
}

function objectLocation(filename: string, expectedUrl?: string) {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.test(filename)) throw new Error("Invalid media filename.");
  const config = settings();
  const key = `media/${filename}`, url = `${config.publicUrl}/${key}`;
  if (expectedUrl && expectedUrl !== url) throw new CmsError(503, "R2 图片域名与素材记录不一致，请使用原存储桶和公开域名。");
  return { config, key, url };
}

async function requestObject(location: ReturnType<typeof objectLocation>, init: RequestInit) {
  const { config, key } = location;
  const client = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: "auto" });
  try {
    const signed = await client.sign(`${config.endpoint}/${config.bucket}/${key}`, init);
    return await fetch(signed, { redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch { throw new CmsError(502, "暂时无法连接 R2，素材未保存，请稍后重试。"); }
}

export async function readR2Image(filename: string, expectedUrl?: string) {
  const response = await requestObject(objectLocation(filename, expectedUrl), { method: "GET" });
  if (!response.ok) { await response.body?.cancel(); throw new CmsError(502, `R2 读取失败（${response.status}），请检查存储桶和访问权限。`); }
  return Buffer.from(await response.arrayBuffer());
}

export async function writeR2Image(filename: string, mime: string, bytes: Buffer, expectedUrl?: string) {
  const location = objectLocation(filename, expectedUrl);
  const response = await requestObject(location, {
    method: "PUT", body: new Uint8Array(bytes),
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable", "If-None-Match": "*" },
  });
  await response.body?.cancel();
  if (response.status === 412) {
    // Restore is repeatable, but must never overwrite an existing, different object.
    if (!(await readR2Image(filename, expectedUrl)).equals(bytes)) throw new CmsError(409, "R2 中存在同名但内容不同的图片，已停止操作，未覆盖文件。");
  } else if (!response.ok) throw new CmsError(502, `R2 上传失败（${response.status}），请检查存储桶和访问权限。`);
  return location.url;
}
