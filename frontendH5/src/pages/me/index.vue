<template>
  <view class="page">
    <view class="card">
      <text class="label">API Key</text>
      <input
        v-model="keyInput"
        class="input"
        password
        placeholder="留空 = 回环开发模式直连"
        placeholder-class="ph"
      />
      <text class="small muted">
        配置后请求携带 Authorization: Bearer 头；SSE 通过一次性 ticket 鉴权。
        与桌面端使用同一存储键。
      </text>
      <view class="btns">
        <button class="btn save" @tap="saveKey">保存</button>
        <button class="btn clear" @tap="clearKey">清除</button>
      </view>
    </view>

    <view class="card">
      <view class="row-between">
        <view class="col">
          <text class="label">深色主题</text>
          <text class="small muted">仅影响 H5 页面内容区</text>
        </view>
        <switch :checked="settings.theme === 'dark'" color="#2f6bff" @change="onThemeChange" />
      </view>
    </view>

    <view class="card">
      <text class="label">关于</text>
      <text class="small muted">Vibe Trading H5 · v0.1.0（瘦版）</text>
      <text class="small muted">功能：Agent 对话 / 持仓看板 / 回测报告（只读）</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useSettingsStore, type ThemeMode } from "@/stores/settings";

const settings = useSettingsStore();
const keyInput = ref(settings.apiKey);

watch(
  () => settings.apiKey,
  (v) => {
    keyInput.value = v;
  },
);

function saveKey() {
  settings.setApiKey(keyInput.value);
  uni.showToast({ title: "已保存", icon: "success" });
}

function clearKey() {
  keyInput.value = "";
  settings.setApiKey("");
  uni.showToast({ title: "已清除", icon: "success" });
}

function onThemeChange(e: Event) {
  // uni <switch> 的 change 事件 payload 实为 { detail: { value: boolean } }
  const value = Boolean((e as unknown as { detail?: { value?: boolean } }).detail?.value);
  const theme: ThemeMode = value ? "dark" : "light";
  settings.setTheme(theme);
}
</script>

<style lang="scss" scoped>
.page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-size: 14px;
  font-weight: 600;
}

.input {
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
}

.ph {
  color: var(--muted);
}

.small {
  font-size: 12px;
}

.muted {
  color: var(--muted);
}

.btns {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  height: 36px;
  line-height: 36px;
  margin: 0;
  font-size: 14px;
  border-radius: 10px;

  &.save {
    background: var(--primary);
    color: #ffffff;
  }

  &.clear {
    background: var(--bg);
    color: var(--error);
    border: 1px solid var(--border);
  }
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
