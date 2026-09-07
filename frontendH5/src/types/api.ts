/**
 * 后端 DTO 精简版 —— 字段与桌面端 frontend/src/lib/api.ts 的真实契约一致，
 * 只保留 H5 瘦版用到的部分；后端新增字段不破坏本定义。
 */

// --- Sessions / Messages ---

export interface SessionItem {
  session_id: string;
  title?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  last_attempt_id?: string;
}

export interface MessageItem {
  message_id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
  linked_attempt_id?: string;
  metadata?: Record<string, unknown>;
  tool_trail?: ToolTrailItem[];
}

export interface ToolTrailItem {
  tool: string;
  status: "running" | "ok" | "error";
  arguments?: Record<string, string>;
  elapsed_ms?: number;
  preview?: string;
  call_id?: string;
  timestamp?: number;
}

// --- Portfolio（只读快照） ---

export interface PortfolioPosition {
  source_id?: string;
  broker: string;
  symbol: string;
  name: string;
  asset_type: string;
  market: string;
  currency: string;
  quantity: number;
  cost_price?: number | null;
  market_price?: number | null;
  market_value_usd: number;
  market_value_cny: number;
  unrealized_pnl_usd?: number | null;
  priced: boolean;
  updated_at: string;
  pricing_basis?: string;
  price_error?: string;
}

export interface PortfolioAccount {
  source_id?: string;
  label?: string;
  broker: string;
  status: "ok" | "error";
  last_success_at?: string;
  total_usd?: number | null;
  total_cny?: number | null;
  position_count?: number;
  priced_position_count?: number;
  unpriced_position_count?: number;
  error_code?: string;
  error?: string;
  failure_kind?: "authorization" | "transient";
}

export interface PortfolioSnapshot {
  snapshot_id: string;
  created_at: string;
  complete: boolean;
  display_currency?: "USD" | "CNY";
  totals: { usd: number; cny: number };
  valuation?: {
    priced_usd: number;
    cash_usd: number;
    unpriced_or_other_usd: number;
    identified_coverage: number;
  };
  fx: { usd_cny: number; usd_hkd: number; fetched_at: string; stale: boolean };
  accounts: PortfolioAccount[];
  positions: PortfolioPosition[];
  warnings: string[];
}

// --- Runs（回测报告，只读） ---

export interface RunListItem {
  run_id: string;
  status: string;
  created_at: string;
  prompt?: string;
  total_return?: number;
  sharpe?: number;
  codes?: string[];
  start_date?: string;
  end_date?: string;
}

export interface BacktestMetrics {
  final_value: number;
  total_return: number;
  annual_return: number;
  max_drawdown: number;
  sharpe: number;
  win_rate: number;
  trade_count: number;
  [key: string]: number;
}

export interface RunCardArtifact {
  path: string;
  size_bytes: number;
  sha256: string;
}

export interface RunCard {
  schema_version?: string;
  generated_at?: string;
  data_sources?: string[];
  warnings?: string[];
  artifacts?: RunCardArtifact[];
  [key: string]: unknown;
}

/** `GET /runs/{id}?chart_payload=summary` 的瘦版子集 —— 图表序列等重字段瘦版不消费。 */
export interface RunData {
  status: string;
  run_id: string;
  prompt?: string;
  elapsed_seconds?: number;
  run_directory?: string;
  run_stage?: string;
  metrics?: BacktestMetrics;
  run_card?: RunCard;
  chart_symbols?: string[];
}
