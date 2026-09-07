<template>
  <view class="page">
    <view v-if="loading && !rows.length" class="state-block">加载回测报告…</view>
    <view v-else-if="error" class="state-block">{{ error }}</view>
    <view v-else-if="!rows.length" class="state-block">暂无回测报告</view>
    <view v-else class="list">
      <view v-for="run in rows" :key="run.run_id" class="card item" @tap="open(run)">
        <view class="row-between">
          <text class="run-id">{{ run.run_id }}</text>
          <text :class="['badge', okStatus(run.status) ? 'ok' : 'muted-badge']">{{ run.status }}</text>
        </view>
        <text class="prompt small muted">{{ run.prompt || "无描述" }}</text>
        <view class="metrics">
          <view class="metric">
            <text class="small muted">收益</text>
            <text
              class="value"
              :style="{ color: returnColor(run.total_return) }"
            >
              {{ run.total_return !== undefined ? formatMetricVal("total_return", run.total_return) : "-" }}
            </text>
          </view>
          <view class="metric">
            <text class="small muted">夏普</text>
            <text class="value">
              {{ run.sharpe !== undefined ? formatMetricVal("sharpe", run.sharpe) : "-" }}
            </text>
          </view>
        </view>
        <view class="foot">
          <view class="tags">
            <text v-for="c in (run.codes || []).slice(0, 3)" :key="c" class="tag">{{ c }}</text>
          </view>
          <text class="small muted">{{ fmtDateTime(run.created_at) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { isBacktestReportRun, runsApi } from "@/api/runs";
import { fmtDateTime, formatMetricVal, metricColor } from "@/lib/format";
import type { RunListItem } from "@/types/api";

const allRuns = ref<RunListItem[]>([]);
const loading = ref(false);
const error = ref("");

// 与桌面端 Reports 页一致：仅展示带收益率/夏普指标的回测 run
const rows = computed(() => allRuns.value.filter(isBacktestReportRun));

onShow(() => {
  void load();
});

onPullDownRefresh(() => {
  load().finally(() => uni.stopPullDownRefresh());
});

async function load() {
  loading.value = true;
  try {
    const items = await runsApi.listRuns(100);
    allRuns.value = Array.isArray(items) ? items : [];
    error.value = "";
  } catch (err) {
    allRuns.value = [];
    error.value = err instanceof Error ? err.message : "加载报告失败";
  } finally {
    loading.value = false;
  }
}

function okStatus(status: string): boolean {
  return ["success", "done", "completed", "complete"].includes(status.toLowerCase());
}

function returnColor(value: number | undefined): string {
  return value !== undefined ? metricColor("total_return", value) : "var(--muted)";
}

function open(run: RunListItem) {
  uni.navigateTo({ url: `/pages/reports/detail?runId=${encodeURIComponent(run.run_id)}` });
}
</script>

<style lang="scss" scoped>
.page {
  padding: 12px;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.run-id {
  font-family: Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.badge {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 8px;
  flex-shrink: 0;

  &.ok {
    color: var(--success);
    background: rgba(22, 163, 74, 0.12);
  }

  &.muted-badge {
    color: var(--muted);
    background: var(--primary-weak);
  }
}

.prompt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.small {
  font-size: 12px;
}

.muted {
  color: var(--muted);
}

.metrics {
  display: flex;
  gap: 24px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tags {
  display: flex;
  gap: 6px;
  overflow: hidden;
}

.tag {
  font-size: 11px;
  font-family: Menlo, Consolas, monospace;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 6px;
  color: var(--muted);
}
</style>
