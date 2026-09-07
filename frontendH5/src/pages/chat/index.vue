<template>
  <view class="page">
    <view class="actions">
      <button class="btn new-btn" :disabled="sessions.loading" @tap="onCreate">＋ 新建会话</button>
    </view>

    <view v-if="sessions.loading && !sessions.list.length" class="state-block">加载会话…</view>
    <view v-else-if="sessions.error" class="state-block">{{ sessions.error }}</view>
    <view v-else-if="!sessions.list.length" class="state-block">还没有会话，点击上方按钮开始对话</view>
    <view v-else class="list">
      <view
        v-for="s in sessions.list"
        :key="s.session_id"
        class="card item"
        @tap="openSession(s)"
        @longpress="onItemLongpress(s)"
      >
        <view class="item-top">
          <text class="title">{{ s.title || "未命名会话" }}</text>
          <text class="small muted">{{ fmtDateTime(s.updated_at || s.created_at) }}</text>
        </view>
        <text class="small muted">点击进入对话 · 长按管理</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { useSessionsStore } from "@/stores/sessions";
import { fmtDateTime } from "@/lib/format";
import type { SessionItem } from "@/types/api";

const sessions = useSessionsStore();

onShow(() => {
  void sessions.load();
});

function toastError(err: unknown) {
  uni.showToast({ title: err instanceof Error ? err.message : "操作失败", icon: "none" });
}

async function onCreate() {
  try {
    const item = await sessions.create("");
    uni.navigateTo({ url: `/pages/chat/detail?sid=${encodeURIComponent(item.session_id)}` });
  } catch (err) {
    toastError(err);
  }
}

function openSession(s: SessionItem) {
  uni.navigateTo({ url: `/pages/chat/detail?sid=${encodeURIComponent(s.session_id)}` });
}

function onItemLongpress(s: SessionItem) {
  uni.showActionSheet({
    itemList: ["重命名", "删除"],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) void renameSession(s);
      else void removeSession(s);
    },
  });
}

function renameSession(s: SessionItem) {
  uni.showModal({
    title: "重命名会话",
    editable: true,
    placeholderText: s.title || "输入新标题",
    success: async (res) => {
      if (!res.confirm) return;
      const title = (res.content || "").trim();
      if (!title) return;
      try {
        await sessions.rename(s.session_id, title);
        uni.showToast({ title: "已重命名", icon: "success" });
      } catch (err) {
        toastError(err);
      }
    },
  });
}

function removeSession(s: SessionItem) {
  uni.showModal({
    title: "删除会话",
    content: "删除后不可恢复，确定删除吗？",
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await sessions.remove(s.session_id);
      } catch (err) {
        toastError(err);
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.page {
  padding: 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.new-btn {
  background: var(--primary);
  color: #ffffff;
  font-size: 13px;
  padding: 0 16px;
  height: 34px;
  line-height: 34px;
  margin: 0;

  &[disabled] {
    opacity: 0.5;
  }
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  padding: 12px;
}

.item-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.small {
  font-size: 11px;
}

.muted {
  color: var(--muted);
}
</style>
