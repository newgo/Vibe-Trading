import { defineStore } from "pinia";
import { portfolioApi } from "@/api/portfolio";
import type { PortfolioSnapshot } from "@/types/api";

export const usePortfolioStore = defineStore("portfolio", {
  state: () => ({
    snapshot: null as PortfolioSnapshot | null,
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        const res = await portfolioApi.getPortfolio();
        this.snapshot = res.snapshot ?? null;
        this.error = "";
      } catch (err) {
        this.snapshot = null;
        this.error = err instanceof Error ? err.message : "加载持仓失败";
      } finally {
        this.loading = false;
      }
    },
  },
});
