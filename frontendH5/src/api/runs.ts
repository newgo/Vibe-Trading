/**
 * 回测报告接口（只读瘦版）。
 * 详情用 `chart_payload=summary` 让后端返回精简图表数据，降低移动端负载。
 */

import { request } from "@/lib/http";
import type { RunData, RunListItem } from "@/types/api";

export const runsApi = {
  listRuns: (limit = 100) => request<RunListItem[]>(`/runs?limit=${limit}`),

  getRun: (id: string) =>
    request<RunData>(`/runs/${encodeURIComponent(id)}?chart_payload=summary`),
};

/** 桌面端 Reports 页同款过滤：仅展示带收益率/夏普的回测 run。 */
export function isBacktestReportRun(run: RunListItem): boolean {
  return Number.isFinite(run.total_return) || Number.isFinite(run.sharpe);
}
