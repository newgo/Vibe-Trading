import { defineStore } from "pinia";
import { agentApi } from "@/api/agent";
import type { SessionItem } from "@/types/api";

export const useSessionsStore = defineStore("sessions", {
  state: () => ({
    list: [] as SessionItem[],
    loading: false,
    error: "",
  }),
  actions: {
    async load() {
      this.loading = true;
      try {
        const items = await agentApi.listSessions();
        this.list = Array.isArray(items) ? items : [];
        this.error = "";
      } catch (err) {
        this.list = [];
        this.error = err instanceof Error ? err.message : "加载会话失败";
      } finally {
        this.loading = false;
      }
    },
    async create(title = ""): Promise<SessionItem> {
      const item = await agentApi.createSession(title);
      this.list.unshift(item);
      return item;
    },
    async remove(sid: string) {
      await agentApi.deleteSession(sid);
      this.list = this.list.filter((s) => s.session_id !== sid);
    },
    async rename(sid: string, title: string) {
      await agentApi.renameSession(sid, title);
      const item = this.list.find((s) => s.session_id === sid);
      if (item) item.title = title;
    },
    /** 本地同步标题（首句前缀占位 / 自动命名回写），不发起请求。 */
    applyTitle(sid: string, title: string) {
      const item = this.list.find((s) => s.session_id === sid);
      if (item) item.title = title;
    },
  },
});
