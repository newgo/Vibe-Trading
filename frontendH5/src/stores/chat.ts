/**
 * 聊天 store —— 历史加载 + 乐观发送 + SSE 流式渲染。
 * 事件消费规则对齐桌面端 Agent.tsx 的 SSE handler：
 *   - text_delta.delta 追加；reasoning_delta.tail 为滚动窗口（替换不追加）
 *   - tool_call/tool_result 通过 call_id 归并到占位消息的 tool_trail
 *   - attempt.completed.summary 为最终答案（空则退回流式累计文本）
 *   - message.received 仅处理 user（乐观去重）
 *   - attempt.cancelled 静默收尾，不显示错误
 */

import { defineStore } from "pinia";
import { agentApi } from "@/api/agent";
import { SSEClient, type SSEHandlers, type SSEStatus } from "@/lib/sse";
import type { ToolTrailItem } from "@/types/api";

export interface ChatMessage {
  message_id: string;
  role: string;
  content: string;
  created_at: string;
  tool_trail: ToolTrailItem[];
  /** 流式中的 assistant 占位 */
  pending?: boolean;
  /** 滚动思考窗口（后端发送的是有界尾部，整体替换） */
  reasoning?: string;
  elapsed_ms?: number;
  /** attempt.completed.run_dir 提取的回测 run id，用于跳转报告 */
  run_id?: string;
  error?: string;
  /** 乐观插入、尚未经 message.received 确认的 user 消息 */
  localOnly?: boolean;
}

const sse = new SSEClient();

function toChatMessage(m: {
  message_id: string;
  role: string;
  content: string;
  created_at: string;
  tool_trail?: ToolTrailItem[];
}): ChatMessage {
  return {
    message_id: m.message_id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    tool_trail: m.tool_trail ? [...m.tool_trail] : [],
  };
}

export const useChatStore = defineStore("chat", {
  state: () => ({
    sessionId: "",
    messages: [] as ChatMessage[],
    loadingHistory: false,
    historyError: "",
    sending: false,
    streaming: false,
    status: "disconnected" as SSEStatus,
  }),

  getters: {
    isBusy: (state): boolean => state.sending || state.streaming,
    pendingAssistant(state): ChatMessage | undefined {
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].pending) return state.messages[i];
      }
      return undefined;
    },
    lastAssistant(state): ChatMessage | undefined {
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].role === "assistant" && !state.messages[i].error) {
          return state.messages[i];
        }
      }
      return undefined;
    },
  },

  actions: {
    /** 进入会话：同会话且历史已载入时仅确保 SSE 连接，否则全量加载。 */
    async load(sessionId: string) {
      if (this.sessionId === sessionId) {
        if (sse.status === "disconnected") this.connectEvents();
        return;
      }
      this.resetState();
      this.sessionId = sessionId;
      this.loadingHistory = true;
      try {
        const items = await agentApi.getMessages(sessionId);
        this.messages = (Array.isArray(items) ? items : []).map(toChatMessage);
        this.historyError = "";
      } catch (err) {
        this.messages = [];
        this.historyError = err instanceof Error ? err.message : "加载历史消息失败";
      } finally {
        this.loadingHistory = false;
      }
      this.connectEvents();
    },

    connectEvents() {
      const sid = this.sessionId;
      if (!sid) return;
      sse.connect(`/sessions/${encodeURIComponent(sid)}/events`, this.buildHandlers());
    },

    disconnectEvents() {
      sse.disconnect();
      this.status = "disconnected";
    },

    resetState() {
      this.disconnectEvents();
      this.sessionId = "";
      this.messages = [];
      this.loadingHistory = false;
      this.historyError = "";
      this.sending = false;
      this.streaming = false;
    },

    buildHandlers(): SSEHandlers {
      return {
        reconnect: ({ status }) => {
          this.status = (status as SSEStatus) ?? "reconnecting";
        },

        text_delta: (d) => {
          this.touchStream();
          const delta = String(d.delta || "");
          if (delta) {
            const p = this.pendingAssistant;
            if (p) p.content += delta;
          }
        },

        reasoning_delta: (d) => {
          this.touchStream();
          const p = this.pendingAssistant;
          if (p) p.reasoning = String(d.tail ?? "");
        },

        stream_reset: (d) => {
          this.touchStream();
          const p = this.pendingAssistant;
          if (p) {
            p.content = "";
            p.reasoning = "";
          }
        },

        thinking_done: () => {
          /* 保持流式文本可见，无需处理 */
        },

        tool_call: (d) => {
          this.touchStream();
          const tool = String(d.tool || "");
          const p = this.pendingAssistant;
          if (!tool || !p) return;
          p.tool_trail.push({
            tool,
            status: "running",
            arguments: (d.arguments as Record<string, string>) ?? {},
            call_id: typeof d.call_id === "string" ? d.call_id : undefined,
            timestamp: Date.now(),
          });
        },

        tool_result: (d) => {
          this.updateToolResult(typeof d.call_id === "string" ? d.call_id : undefined, String(d.tool || ""), {
            status: d.status === "ok" ? "ok" : "error",
            preview: String(d.preview || ""),
            elapsed_ms: Number(d.elapsed_ms || 0) || undefined,
          });
        },

        tool_heartbeat: (d) => {
          /* 长任务保活事件；瘦版不渲染工具计时器 */
          void d;
        },

        tool_progress: (d) => {
          void d;
        },

        compact: () => {
          /* 上下文压缩通知，瘦版无需处理 */
        },

        "message.received": (d) => {
          if (String(d.role || "") !== "user") return;
          const messageId = String(d.message_id || "");
          const requestText = String(d.content || "");
          if (!messageId || !requestText) return;
          if (this.messages.some((m) => m.message_id === messageId)) return;
          const local = this.messages.find(
            (m) => m.localOnly && m.role === "user" && m.content === requestText,
          );
          if (local) {
            local.message_id = messageId;
            local.localOnly = false;
            return;
          }
          this.messages.push(toChatMessage({
            message_id: messageId,
            role: "user",
            content: requestText,
            created_at: new Date().toISOString(),
          }));
        },

        "attempt.created": () => {
          this.touchStream();
        },

        "attempt.started": () => {
          this.touchStream();
        },

        "attempt.completed": (d) => {
          const summary = String(d.summary || "");
          const streamed = this.pendingAssistant?.content ?? "";
          const finalAnswer = summary.trim() ? summary : streamed;
          const placeholder = this.pendingAssistant;
          if (placeholder) {
            if (finalAnswer) {
              placeholder.content = finalAnswer;
              placeholder.pending = false;
            } else {
              this.messages = this.messages.filter((m) => m !== placeholder);
            }
          } else if (finalAnswer) {
            this.messages.push(
              toChatMessage({
                message_id: `completed-${Date.now()}`,
                role: "assistant",
                content: finalAnswer,
                created_at: new Date().toISOString(),
              }),
            );
          }
          const last = this.lastAssistant;
          if (last) {
            const elapsed = Number(d.elapsed_ms || 0);
            if (elapsed) last.elapsed_ms = elapsed;
            const runDir = String(d.run_dir || "");
            if (runDir) last.run_id = runDir.split(/[/\\]/).pop() || undefined;
          }
          this.streaming = false;
          void this.maybeAutoTitle();
        },

        "attempt.failed": (d) => {
          const placeholder = this.pendingAssistant;
          if (placeholder) {
            placeholder.pending = false;
            placeholder.error = String(d.error || "执行失败");
          }
          this.streaming = false;
        },

        "attempt.cancelled": (d) => {
          void d;
          const placeholder = this.pendingAssistant;
          if (placeholder) {
            if (placeholder.content.trim() || placeholder.tool_trail.length) {
              placeholder.pending = false;
            } else {
              this.messages = this.messages.filter((m) => m !== placeholder);
            }
          }
          this.streaming = false;
        },

        done: () => {
          this.streaming = false;
        },

        heartbeat: () => {
          /* 连接保活 */
        },
      };
    },

    /** 确保存在流式占位（中途连接/重连回放时也能进入流式态）。 */
    touchStream() {
      if (!this.pendingAssistant) this.ensurePlaceholder();
      this.streaming = true;
    },

    ensurePlaceholder() {
      this.messages.push({
        message_id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        tool_trail: [],
        pending: true,
      });
    },

    removePlaceholder() {
      const placeholder = this.pendingAssistant;
      if (placeholder) {
        this.messages = this.messages.filter((m) => m !== placeholder);
      }
    },

    updateToolResult(
      callId: string | undefined,
      tool: string,
      patch: Partial<ToolTrailItem>,
    ) {
      const p = this.pendingAssistant;
      if (!p) return;
      const trail = p.tool_trail;
      let idx = -1;
      if (callId) idx = trail.findIndex((t) => t.call_id === callId);
      if (idx < 0) {
        for (let i = trail.length - 1; i >= 0; i--) {
          if (trail[i].tool === tool && trail[i].status === "running") {
            idx = i;
            break;
          }
        }
      }
      if (idx < 0) return;
      Object.assign(trail[idx], patch);
    },

    async send(content: string) {
      const sid = this.sessionId;
      const text = content.trim();
      if (!sid || !text || this.isBusy) return;
      this.sending = true;
      const localId = `local-${Date.now()}`;
      this.messages.push({
        message_id: localId,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
        tool_trail: [],
        localOnly: true,
      });
      this.ensurePlaceholder();
      this.streaming = true;
      try {
        await agentApi.sendMessage(sid, text);
      } catch (err) {
        // 发送失败：回滚乐观消息与占位，交由页面 toast 错误
        this.messages = this.messages.filter((m) => m.message_id !== localId);
        this.removePlaceholder();
        this.streaming = false;
        throw err;
      } finally {
        this.sending = false;
      }
    },

    async cancel() {
      if (!this.sessionId) return;
      try {
        await agentApi.cancelSession(this.sessionId);
      } catch {
        /* 终态由 attempt.cancelled 事件兜底 */
      }
    },

    /** 首次完成的对话触发后端摘要标题（fire-and-forget）。 */
    async maybeAutoTitle() {
      const sid = this.sessionId;
      if (!sid) return;
      const userCount = this.messages.filter((m) => m.role === "user").length;
      if (userCount !== 1) return;
      try {
        await agentApi.autoTitle(sid);
      } catch {
        /* 标题失败不影响对话 */
      }
    },
  },
});
