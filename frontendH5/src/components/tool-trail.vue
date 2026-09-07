<template>
  <view class="trail">
    <view class="trail-head" @tap="open = !open">
      <text class="trail-title">{{ open ? "工具调用" : `工具调用 · ${trail.length}` }}</text>
      <text class="chevron">{{ open ? "▲" : "▼" }}</text>
    </view>
    <view v-if="open" class="trail-list">
      <view
        v-for="(item, i) in trail"
        :key="`${item.call_id || item.tool}-${i}`"
        class="trail-item"
      >
        <view :class="['dot', item.status]" />
        <view class="trail-main">
          <view class="trail-row">
            <text class="tool-name">{{ item.tool }}</text>
            <text v-if="elapsedText(item)" class="small muted">{{ elapsedText(item) }}</text>
          </view>
          <text v-if="item.preview" class="preview">{{ item.preview }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ToolTrailItem } from "@/types/api";

defineProps<{ trail: ToolTrailItem[] }>();

const open = ref(false);

function elapsedText(item: ToolTrailItem): string {
  const ms = item.elapsed_ms;
  if (ms && Number.isFinite(ms) && ms > 0) return `${(ms / 1000).toFixed(1)}s`;
  if (item.status === "running") return "运行中…";
  return "";
}
</script>

<style lang="scss" scoped>
.trail {
  margin: 6px 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.trail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--primary-weak);
}

.trail-title {
  font-size: 12px;
  color: var(--primary);
}

.chevron {
  font-size: 10px;
  color: var(--muted);
}

.trail-list {
  padding: 4px 10px;
}

.trail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;

  & + .trail-item {
    border-top: 1px solid var(--border);
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--muted);

  &.running {
    background: var(--primary);
    animation: pulse 1.2s ease-in-out infinite;
  }

  &.ok {
    background: var(--success);
  }

  &.error {
    background: var(--error);
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

.trail-main {
  min-width: 0;
  flex: 1;
}

.trail-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.tool-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.preview {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.small {
  font-size: 11px;
}

.muted {
  color: var(--muted);
}
</style>
