<template>
  <view class="page">
    <view v-if="loading" class="state-block">加载报告详情…</view>
    <view v-else-if="error" class="state-block">{{ error }}</view>
    <template v-else-if="run">
      <view class="card head">
        <view class="row-between">
          <text class="run-id">{{ run.run_id }}</text>
          <text :class="['badge', okStatus(run.status) ? 'ok' : 'muted-badge']">{{ run.status }}</text>
        </view>
        <text v-if="run.elapsed_seconds" class="small muted">耗时 {{ run.elapsed_seconds.toFixed(1) }}s</text>
      </view>

      <view v-if="run.prompt" class="card">
        <text class="label">研究目标</text>
        <text class="prompt">{{ run.prompt }}</text>
      </view>

      <view v-if="metricRows.length" class="card">
        <text class="label">核心指标</text>
        <view class="grid">
          <view v-for="m in metricRows" :key="m.key" class="cell">
            <text class="small muted">{{ m.label }}</text>
            <text class="value" :style="{ color: metricColor(m.key, m.value) }">
              {{ formatMetricVal(m.key, m.value) }}
            </text>
          </view>
        </view>
      </view>

      <view v-if="run.run_card?.warnings?.length" class="card">
        <text class="label warn-text">警告（后端原文）</text>
        <text v-for="(w, i) in run.run_card.warnings" :key="i" class="warn-item">{{ w }}</text>
      </view>

      <view v-if="run.run_card?.data_sources?.length" class="card">
        <text class="label">数据源</text>
        <text v-for="(s, i) in run.run_card.data_sources" :key="i" class="small muted">{{ s }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { runsApi } from "@/api/runs";
import { formatMetricVal, metricColor } from "@/lib/format";
import type { RunData } from "@/types/api";

const run = ref<RunData | null>(null);
const loading = ref(true);
const error = ref("");

const METRIC_DEFS: Array<{ key: string; label: string }> = [
  { key: "total_return", label: "总收益率" },
  { key: "annual_return", label: "年化" },
  { key: "sharpe", label: "夏普" },
  { key: "max_drawdown", label: "最大回撤" },
  { key: "win_rate", label: "胜率" },
  { key: "trade_count", label: "交易次数" },
  { key: "final_value", label: "最终净值" },
];

const metricRows = computed(() => {
  const metrics = run.value?.metrics;
  if (!metrics) return [];
  return METRIC_DEFS.filter((def) => Number.isFinite(metrics[def.key])).map((def) => ({
    key: def.key,
    label: def.label,
    value: metrics[def.key],
  }));
});

onLoad((query) => {
  const runId = String(query?.runId || "");
  if (!runId) {
    error.value = "缺少 runId 参数";
    loading.value = false;
    return;
  }
  void load(runId);
});

async function load(runId: string) {
  loading.value = true;
  try {
    run.value = await runsApi.getRun(runId);
    error.value = "";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载报告失败";
  } finally {
    loading.value = false;
  }
}

function okStatus(status: string): boolean {
  return ["success", "done", "completed", "complete"].includes(status.toLowerCase());
}
</script>

<style lang="scss" scoped>
.page {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.run-id {
  font-family: Menlo, Consolas, monospace;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}

.prompt {
  display: block;
  font-size: 13px;
  white-space: pre-wrap;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.small {
  font-size: 12px;
}

.muted {
  color: var(--muted);
}

.warn-text {
  color: var(--warning);
}

.warn-item {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 4px;
}
</style>
