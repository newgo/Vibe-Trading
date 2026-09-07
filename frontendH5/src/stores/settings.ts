import { defineStore } from "pinia";
import { getApiAuthKey, setApiAuthKey } from "@/lib/auth";

const THEME_KEY = "vibe_h5_theme";

export type ThemeMode = "light" | "dark";

export const useSettingsStore = defineStore("settings", {
  state: () => ({
    apiKey: "",
    theme: "light" as ThemeMode,
  }),
  actions: {
    init() {
      this.apiKey = getApiAuthKey();
      try {
        const stored = uni.getStorageSync(THEME_KEY);
        if (stored === "dark" || stored === "light") this.theme = stored;
      } catch {
        /* ignore */
      }
      this.applyTheme();
    },
    setApiKey(value: string) {
      setApiAuthKey(value);
      this.apiKey = getApiAuthKey();
    },
    setTheme(theme: ThemeMode) {
      this.theme = theme;
      try {
        uni.setStorageSync(THEME_KEY, theme);
      } catch {
        /* storage unavailable — preference simply won't persist */
      }
      this.applyTheme();
    },
    applyTheme() {
      // #ifdef H5
      document.documentElement.setAttribute("data-theme", this.theme);
      // #endif
    },
  },
});
