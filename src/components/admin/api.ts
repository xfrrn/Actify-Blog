export async function adminApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { cache: "no-store", signal: AbortSignal.timeout(30000), ...init });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "请求失败，请稍后重试。");
  return body as T;
}
export const jsonBody = (body: unknown, method = "PATCH"): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export function message(error: unknown) { return error instanceof Error ? error.message : "操作失败，请重试。"; }
