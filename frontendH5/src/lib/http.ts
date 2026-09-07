/**
 * HTTP 封装 —— 基于 uni.request，行为对齐桌面端 api.ts 的 request()：
 * 注入 Bearer 头、非 2xx 归一化为 ApiError、401/403 提示需要 API Key。
 */

import { authHeaders } from "./auth";

export const AUTH_REQUIRED_MESSAGE =
  "需要配置 API Key 才能访问后端接口（回环开发模式无需配置）。";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  /** 对象会被 JSON 序列化；undefined 表示无请求体 */
  body?: unknown;
  timeoutMs?: number;
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 30_000 } = options;
  const hasBody = body !== undefined && method !== "GET";

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: path,
      // uni 的 TS 类型未包含 PATCH，但 H5 端底层是 XMLHttpRequest，运行时支持 PATCH
      method: method as UniNamespace.RequestOptions["method"],
      timeout: timeoutMs,
      data: hasBody ? JSON.stringify(body) : undefined,
      header: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...authHeaders(),
      },
      success: (res) => {
        const status = res.statusCode;
        if (status >= 200 && status < 300) {
          resolve(res.data as T);
          return;
        }
        let detail = `HTTP ${status}`;
        const payload = res.data as Record<string, unknown> | undefined;
        if (payload && typeof payload === "object") {
          const candidate = payload.detail || payload.message || payload.error;
          if (candidate) detail = String(candidate);
        }
        if (status === 401 || status === 403) {
          detail = AUTH_REQUIRED_MESSAGE;
        }
        reject(new ApiError(detail, status));
      },
      fail: (err) => {
        reject(new ApiError(err.errMsg || "网络请求失败", 0));
      },
    });
  });
}
