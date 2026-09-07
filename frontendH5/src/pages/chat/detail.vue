<template>
  <view class="page">
    <view v-if="chat.status === 'reconnecting'" class="conn-bar">连接中，正在重试…</view>
    <scroll-view class="msgs" scroll-y :scroll-into-view="anchor" scroll-with-animation>
      <view v-if="chat.loadingHistory" class="state-block">加载历史消息…</view>
      <view v-else-if="chat.historyError" class="state-block">{{ chat.historyError }}</view>
      <view v-else-if="!chat.messages.length" class="state-block">开始你的第一句对话</view>
      <view
        v-for="(m, i) in chat.messages"
        :id="`msg-${i}`"
        :key="`${i}-${m.message_id}`"
        class="msg-row"
      >
        <msg-bubble :msg="m" />
      </view>
      <view class="msg-tail" />
    </scroll-view>
    <composer
      :disabled="chat.isBusy || chat.loadingHistory"
      :streaming="chat.streaming"
      @send="onSend"
      @stop="onStop"
    />
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { onLoad, onUnload, onShow } from "@dcloudio/uni-app";
import { useChatStore } from "@/stores/chat";
import { useSessionsStore } from "@/stores/sessions";
import MsgBubble from "@/components/msg-bubble.vue";
import Composer from "@/components/composer.vue";

const chat = useChatStore();
const sessions = useSessionsStore();
const anchor = ref("");

onLoad((query) => {
  const sid = String(query?.sid || "");
  if (!sid) {
    uni.showToast({ title: "缺少会话参数", icon: "none" });
    uni.navigateBack();
    return;
  }
  void chat.load(sid);
  syncTitle();
});

onShow(() => {
  syncTitle();
});

onUnload(() => {
  chat.disconnectEvents();
});

function syncTitle() {
  const item = sessions.list.find((s) => s.session_id === chat.sessionId);
  if (item?.title) uni.setNavigationBarTitle({ title: item.title });
}

function onSend(text: string) {
  chat
    .send(text)
    .catch((err) => {
      uni.showToast({ title: err instanceof Error ? err.message : "发送失败", icon: "none" });
    });
}

function onStop() {
  void chat.cancel();
}

// 消息数量 / 内容 / 思考区 / 工具轨迹任一变化都跟随滚动到底部
watch(
  () => {
    const last = chat.messages[chat.messages.length - 1];
    return `${chat.messages.length}:${last?.content.length ?? 0}:${last?.reasoning?.length ?? 0}:${last?.tool_trail.length ?? 0}`;
  },
  () => {
    nextTick(() => {
      anchor.value = "";
      nextTick(() => {
        anchor.value = `msg-${Math.max(chat.messages.length - 1, 0)}`;
      });
    });
  },
);

// 自动标题完成后同步导航栏标题
watch(
  () => sessions.list.find((s) => s.session_id === chat.sessionId)?.title,
  () => syncTitle(),
);
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.conn-bar {
  padding: 4px 12px;
  font-size: 11px;
  color: var(--warning);
  background: var(--card);
  border-bottom: 1px solid var(--border);
  text-align: center;
}

.msgs {
  flex: 1;
  min-height: 0;
  padding-top: 8px;
  box-sizing: border-box;
}

.msg-row {
  margin-bottom: 4px;
}

.msg-tail {
  height: 12px;
}
</style>
