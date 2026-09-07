<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();

onLaunch(() => {
  settings.init();
});
</script>

<style lang="scss">
/* 全局设计 token —— H5 端通过 data-theme 切换明暗主题 */
:root {
  --bg: #f5f6f8;
  --card: #ffffff;
  --text: #1a1d24;
  --muted: #8a8f99;
  --border: #e5e7eb;
  --primary: #2f6bff;
  --primary-weak: rgba(47, 107, 255, 0.12);
  --success: #16a34a;
  --warning: #d97706;
  --error: #dc2626;
  --user-bubble: #2f6bff;
  --user-bubble-text: #ffffff;
  --shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

[data-theme="dark"] {
  --bg: #101319;
  --card: #1a1f29;
  --text: #e6e9ef;
  --muted: #8a8f99;
  --border: #2a3140;
  --primary: #5b8cff;
  --primary-weak: rgba(91, 140, 255, 0.16);
  --user-bubble: #2f5fd6;
  --user-bubble-text: #ffffff;
  --shadow: none;
}

page {
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.55;
}

/* #ifdef H5 */
html,
body,
#app {
  height: 100%;
}
/* #endif */

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  padding: 12px;
}

.muted {
  color: var(--muted);
}

.section-title {
  font-size: 13px;
  color: var(--muted);
  margin: 16px 4px 8px;
}

.state-block {
  padding: 32px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

.btn {
  border-radius: 10px;
  font-size: 14px;
}

.btn-primary {
  background: var(--primary);
  color: #ffffff;
}
</style>
