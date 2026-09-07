/**
 * SSE 客户端 —— 浏览器原生 EventSource 的封装，行为对齐桌面端
 * frontend/src/hooks/useSSE.ts：
 *   - 指数退避自动重连（1s 起步，30s 封顶）
 *   - Last-Event-ID 续传 + LRU 去重
 *   - 有 API Key 时先换一次性 ticket（EventSource 无法带 Authorization 头）
 *
 * 与桌面端 useSSE（React hook）的差异：改写为框架无关 class，仅订阅
 * Agent 对话所需的事件类型（瘦版不含 swarm/goal/mandate/live 等）。
 */

import { getApiAuthKey, withAuthTicket } from "./auth";

type EventHandler = (data: Record<string, unknown>) => void;
export type SSEHandlers = Record<string, EventHandler>;

export type SSEStatus = "disconnected" | "connected" | "reconnecting";

export interface SSEOptions {
  initialRetryMs?: number;
  maxRetryMs?: number;
  backoffFactor?: number;
  dedupeCapacity?: number;
}

const DEFAULTS: Required<SSEOptions> = {
  initialRetryMs: 1000,
  maxRetryMs: 30000,
  backoffFactor: 2,
  dedupeCapacity: 500,
};

const KNOWN_TYPES = [
  "text_delta",
  "reasoning_delta",
  "stream_reset",
  "thinking_done",
  "tool_call",
  "tool_result",
  "tool_progress",
  "tool_heartbeat",
  "attempt.created",
  "attempt.started",
  "attempt.completed",
  "attempt.failed",
  "attempt.cancelled",
  "message.received",
  "compact",
  "heartbeat",
  "done",
];

export class SSEClient {
  private opts: Required<SSEOptions>;
  private source: EventSource | null = null;
  private handlers: SSEHandlers = {};
  private url = "";
  private closed = true;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEventId: string | null = null;
  private generation = 0;
  private statusValue: SSEStatus = "disconnected";

  private seenIds = new Set<string>();
  private seenOrder: string[] = [];

  constructor(options: SSEOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  get status(): SSEStatus {
    return this.statusValue;
  }

  private setStatus(status: SSEStatus): void {
    this.statusValue = status;
    this.handlers["reconnect"]?.({ status });
  }

  private trackEventId(eventId: string): boolean {
    if (!eventId) return false;
    if (this.seenIds.has(eventId)) return true;
    this.seenIds.add(eventId);
    this.seenOrder.push(eventId);
    if (this.seenOrder.length > this.opts.dedupeCapacity) {
      const oldest = this.seenOrder.shift();
      if (oldest) this.seenIds.delete(oldest);
    }
    return false;
  }

  private buildUrl(baseUrl: string): string {
    if (this.lastEventId) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}Last-Event-ID=${encodeURIComponent(this.lastEventId)}`;
    }
    return baseUrl;
  }

  private attach(url: string, generation: number): void {
    if (this.closed || generation !== this.generation) return;

    const source = new EventSource(url);
    this.source = source;

    source.onopen = () => {
      if (generation !== this.generation || this.source !== source) return;
      this.retryCount = 0;
      this.setStatus("connected");
    };

    const handleRaw = (eventType: string, raw: MessageEvent): void => {
      if (generation !== this.generation || this.source !== source) return;
      if (raw.lastEventId) {
        this.lastEventId = raw.lastEventId;
      }
      if (raw.lastEventId && this.trackEventId(raw.lastEventId)) return;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw.data);
      } catch {
        parsed = { raw: raw.data };
      }

      const handler = this.handlers[eventType] ?? this.handlers["message"];
      handler?.(parsed);
    };

    for (const eventType of KNOWN_TYPES) {
      source.addEventListener(eventType, (e) => handleRaw(eventType, e as MessageEvent));
    }

    source.onerror = () => {
      if (this.closed || generation !== this.generation || this.source !== source) return;
      source.close();
      this.source = null;
      this.scheduleReconnect(generation);
    };
  }

  private doConnect(generation: number): void {
    if (this.closed || generation !== this.generation) return;

    const baseUrl = this.buildUrl(this.url);

    // 回环开发模式（无 Key）直接同步连接；有 Key 时先换一次性 ticket。
    if (!getApiAuthKey()) {
      this.attach(baseUrl, generation);
      return;
    }
    withAuthTicket(baseUrl)
      .then((url) => this.attach(url, generation))
      .catch(() => {
        if (!this.closed && generation === this.generation) {
          this.scheduleReconnect(generation);
        }
      });
  }

  private scheduleReconnect(generation: number): void {
    if (this.closed || generation !== this.generation) return;
    this.retryCount += 1;
    const delay = Math.min(
      this.opts.initialRetryMs * Math.pow(this.opts.backoffFactor, this.retryCount - 1),
      this.opts.maxRetryMs,
    );
    this.setStatus("reconnecting");

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (generation === this.generation) {
        this.doConnect(generation);
      }
    }, delay);
  }

  connect(url: string, handlers: SSEHandlers): void {
    const generation = ++this.generation;
    this.closed = true;
    this.source?.close();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    this.url = url;
    this.handlers = handlers;
    this.closed = false;
    this.retryCount = 0;
    this.lastEventId = null;
    this.seenIds.clear();
    this.seenOrder.length = 0;

    this.doConnect(generation);
  }

  disconnect(): void {
    this.generation += 1;
    this.closed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.source?.close();
    this.source = null;
    this.setStatus("disconnected");
  }
}
