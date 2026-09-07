<template>
  <view :class="['row', isUser ? 'right' : 'left']">
    <view :class="['bubble', isUser ? 'user' : msg.error ? 'bubble-error' : 'assistant']">
      <template v-if="isUser">
        <text class="plain">{{ msg.content }}</text>
      </template>
      <template v-else>
        <view v-if="msg.reasoning" class="reasoning">
          <text class="reasoning-toggle" @tap="showReasoning = !showReasoning">
            {{ showReasoning ? "收起思考" : "思考过程" }}
          </text>
          <text v-if="showReasoning" class="reasoning-text">{{ msg.reasoning }}</text>
        </view>
        <tool-trail v-if="msg.tool_trail.length" :trail="msg.tool_trail" />
        <view v-if="msg.content" class="md" v-html="html" />
        <view v-if="msg.pending" class="typing">
          <text class="dot" />
          <text class="dot" />
          <text class="dot" />
        </view>
        <text v-if="msg.error" class="error-text">{{ msg.error }}</text>
        <view v-if="footerText || msg.run_id" class="meta">
          <text v-if="footerText" class="small muted">{{ footerText }}</text>
          <text v-if="msg.run_id" class="report-link" @tap="openReport">查看回测报告</text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { ChatMessage } from "@/stores/chat";
import { renderMarkdown } from "@/lib/markdown";
import { fmtElapsed } from "@/lib/format";
import ToolTrail from "./tool-trail.vue";

const props = defineProps<{ msg: ChatMessage }>();

const showReasoning = ref(false);

const isUser = computed(() => props.msg.role === "user");
const html = computed(() => renderMarkdown(props.msg.content));
const footerText = computed(() => fmtElapsed(props.msg.elapsed_ms));

function openReport() {
  if (!props.msg.run_id) return;
  uni.navigateTo({ url: `/pages/reports/detail?runId=${encodeURIComponent(props.msg.run_id)}` });
}
</script>

<style lang="scss" scoped>
.row {
  display: flex;
  padding: 4px 12px;

  &.right {
    justify-content: flex-end;
  }

  &.left {
    justify-content: flex-start;
  }
}

.bubble {
  max-width: 86%;
  border-radius: 12px;
  padding: 10px 12px;
  box-sizing: border-box;
  word-break: break-word;

  &.user {
    background: var(--user-bubble);
    color: var(--user-bubble-text);
    border-top-right-radius: 4px;
  }

  &.assistant {
    background: var(--card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    border-top-left-radius: 4px;
  }

  &.bubble-error {
    background: var(--card);
    border: 1px solid var(--error);
    border-top-left-radius: 4px;
  }
}

.plain {
  white-space: pre-wrap;
  font-size: 14px;
}

.error-text {
  display: block;
  color: var(--error);
  font-size: 13px;
}

.reasoning {
  margin-bottom: 6px;
}

.reasoning-toggle {
  font-size: 12px;
  color: var(--primary);
}

.reasoning-text {
  display: block;
  margin-top: 6px;
  padding: 8px;
  background: var(--primary-weak);
  border-radius: 8px;
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
  max-height: 180px;
  overflow-y: auto;
}

.meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.report-link {
  font-size: 12px;
  color: var(--primary);
  text-decoration: underline;
}

.small {
  font-size: 11px;
}

.muted {
  color: var(--muted);
}

/* markdown 内容样式（v-html 不受 scoped 隔离，使用 :deep） */
.md :deep(p) {
  margin: 4px 0;
  font-size: 14px;
}

.md :deep(h1),
.md :deep(h2),
.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
  margin: 8px 0 4px;
  font-size: 15px;
}

.md :deep(ul),
.md :deep(ol) {
  margin: 4px 0;
  padding-left: 18px;
}

.md :deep(li) {
  margin: 2px 0;
  font-size: 14px;
}

.md :deep(code) {
  font-family: Menlo, Consolas, monospace;
  font-size: 12px;
  background: var(--primary-weak);
  border-radius: 4px;
  padding: 1px 4px;
}

.md :deep(pre) {
  background: var(--primary-weak);
  border-radius: 8px;
  padding: 8px;
  overflow-x: auto;
  margin: 6px 0;
}

.md :deep(pre code) {
  background: transparent;
  padding: 0;
}

.md :deep(a) {
  color: var(--primary);
}

.typing {
  display: inline-flex;
  gap: 4px;
  padding: 4px 0;

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--muted);
    animation: blink 1.2s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
</style>
