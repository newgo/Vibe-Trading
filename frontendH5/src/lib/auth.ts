/**
 * API Key 存取 —— 对齐桌面端 frontend/src/lib/apiAuth.ts。
 * uni-app H5 端 uni.getStorageSync 底层即 localStorage。
 */

const STORAGE_KEY = "vibe_trading_api_auth_key";

export function getApiAuthKey(): string {
  try {
    const value = uni.getStorageSync(STORAGE_KEY);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export function setApiAuthKey(value: string): void {
  const trimmed = value.trim();
  try {
    if (trimmed) uni.setStorageSync(STORAGE_KEY, trimmed);
    else uni.removeStorageSync(STORAGE_KEY);
  } catch {
    /* storage unavailable — preference simply won't persist */
  }
}

export function authHeaders(): Record<string, string> {
  const key = getApiAuthKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/**
 * 为 EventSource URL 换取一次性短时效 SSE ticket。
 *
 * 浏览器 EventSource 无法携带 Authorization 头，因此先用 POST（Key 在头里）
 * 换取一次性 ticket，再以 `?ticket=` 打开长连接，避免长期 Key 泄漏到
 * URL / 历史 / 代理日志中。
 *
 * 未配置 Key 时后端处于回环开发模式（鉴权被绕过），URL 原样返回。
 * ticket 是一次性的：每次连接/重连都必须重新换取。
 */
export async function withAuthTicket(url: string): Promise<string> {
  const key = getApiAuthKey();
  if (!key) return url;
  const res = await fetch("/auth/sse-ticket", {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Failed to obtain SSE ticket (HTTP ${res.status})`);
  }
  const data: unknown = await res.json();
  const ticket = (data as { ticket?: unknown } | null)?.ticket;
  if (typeof ticket !== "string" || !ticket) {
    throw new Error("SSE ticket response missing ticket");
  }
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ticket=${encodeURIComponent(ticket)}`;
}
