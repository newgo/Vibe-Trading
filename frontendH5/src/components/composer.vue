<template>
  <view class="composer">
    <textarea
      v-model="content"
      class="input"
      :disabled="disabled"
      :maxlength="-1"
      auto-height
      :show-confirm-bar="false"
      confirm-type="send"
      placeholder="输入消息…"
      @confirm="onSend"
    />
    <button v-if="streaming" class="btn stop" @tap="emit('stop')">停止</button>
    <button
      v-else
      class="btn send"
      :disabled="disabled || !content.trim()"
      @tap="onSend"
    >
      发送
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  disabled?: boolean;
  streaming?: boolean;
}>();

const emit = defineEmits<{
  (e: "send", content: string): void;
  (e: "stop"): void;
}>();

const content = ref("");

function onSend() {
  const text = content.value.trim();
  if (!text || props.disabled) return;
  emit("send", text);
  content.value = "";
}
</script>

<style lang="scss" scoped>
.composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom));
  background: var(--card);
  border-top: 1px solid var(--border);
}

.input {
  flex: 1;
  min-height: 36px;
  max-height: 120px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  box-sizing: border-box;
}

.btn {
  flex-shrink: 0;
  margin: 0;
  padding: 0 16px;
  height: 36px;
  line-height: 36px;
  font-size: 14px;
  border-radius: 10px;
  border: none;

  &.send {
    background: var(--primary);
    color: #ffffff;

    &[disabled] {
      opacity: 0.5;
      background: var(--primary);
      color: #ffffff;
    }
  }

  &.stop {
    background: var(--card);
    color: var(--error);
    border: 1px solid var(--error);
  }
}
</style>
