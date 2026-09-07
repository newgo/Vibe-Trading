/**
 * Agent 会话 / 消息接口 —— 契约对齐桌面端 api.ts。
 */

import { request } from "@/lib/http";
import type { MessageItem, SessionItem } from "@/types/api";

export const agentApi = {
  listSessions: () => request<SessionItem[]>("/sessions"),

  createSession: (title = "") =>
    request<SessionItem>("/sessions", { method: "POST", body: { title } }),

  deleteSession: (sid: string) =>
    request<{ status: string }>(`/sessions/${encodeURIComponent(sid)}`, { method: "DELETE" }),

  renameSession: (sid: string, title: string) =>
    request<{ status: string }>(`/sessions/${encodeURIComponent(sid)}`, {
      method: "PATCH",
      body: { title },
    }),

  /** Codex 式 LLM 摘要标题；后端不会覆盖手工重命名，可 fire-and-forget。 */
  autoTitle: (sid: string) =>
    request<{ status: string; title: string }>(`/sessions/${encodeURIComponent(sid)}/title/auto`, {
      method: "POST",
    }),

  getMessages: (sid: string) =>
    request<MessageItem[]>(`/sessions/${encodeURIComponent(sid)}/messages`),

  sendMessage: (sid: string, content: string) =>
    request<{ message_id: string; attempt_id: string }>(`/sessions/${encodeURIComponent(sid)}/messages`, {
      method: "POST",
      body: { content },
    }),

  cancelSession: (sid: string) =>
    request<{ status: string }>(`/sessions/${encodeURIComponent(sid)}/cancel`, { method: "POST" }),
};
