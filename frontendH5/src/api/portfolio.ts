/**
 * 持仓快照接口（只读）。
 */

import { request } from "@/lib/http";
import type { PortfolioSnapshot } from "@/types/api";

export const portfolioApi = {
  getPortfolio: () =>
    request<{ status: string; snapshot: PortfolioSnapshot | null }>("/api/portfolio"),
};
