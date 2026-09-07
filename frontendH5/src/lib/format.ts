/**
 * 展示格式化 —— 指标格式语义与桌面端 lib/formatters.ts 保持一致
 * （PCT_KEYS 以 v*100 带符号百分比展示；RATIO_KEYS 两位小数带符号）。
 */

const PCT_KEYS = new Set([
  "total_return",
  "annual_return",
  "win_rate",
  "max_drawdown",
  "benchmark_return",
  "excess_return",
]);
const RATIO_KEYS = new Set(["sharpe", "calmar", "sortino", "profit_loss_ratio", "information_ratio"]);
const INT_KEYS = new Set(["trade_count", "max_consecutive_loss"]);

export function formatMetricVal(key: string, value: number): string {
  if (PCT_KEYS.has(key)) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${(value * 100).toFixed(2)}%`;
  }
  if (RATIO_KEYS.has(key)) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}`;
  }
  if (INT_KEYS.has(key)) return String(Math.round(value));
  if (key === "final_value") return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (key === "avg_holding_days") return value.toFixed(1);
  return value.toFixed(4);
}

/** 指标情绪色（与桌面端 metricSentiment 同规则），返回 CSS 变量色值。 */
export function metricColor(key: string, value: number): string {
  const neutral = "var(--muted)";
  const positive = "var(--success)";
  const negative = "var(--error)";
  if (key === "trade_count" || key === "avg_holding_days" || key === "final_value") return neutral;
  if (key === "max_drawdown") return value > -0.05 ? positive : value > -0.2 ? neutral : negative;
  if (key === "win_rate") return value >= 0.5 ? positive : value >= 0.35 ? neutral : negative;
  if (key === "sharpe" || key === "calmar" || key === "sortino") {
    return value >= 1.0 ? positive : value >= 0.3 ? neutral : negative;
  }
  if (value > 0) return positive;
  if (value === 0) return neutral;
  return negative;
}

export function fmtMoney(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  const symbol = currency === "CNY" ? "¥" : "$";
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : 2;
  return `${value < 0 ? "-" : ""}${symbol}${abs.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function fmtDateTime(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso || "-";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtElapsed(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "";
  return `${(ms / 1000).toFixed(1)}s`;
}
