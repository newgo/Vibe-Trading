<template>
  <view class="page">
    <view v-if="portfolio.loading && !portfolio.snapshot" class="state-block">加载持仓快照…</view>
    <view v-else-if="portfolio.error" class="state-block">{{ portfolio.error }}</view>
    <template v-else-if="snap">
      <view class="card total">
        <view class="row-between">
          <text class="label">总资产</text>
          <text :class="['badge', snap.complete ? 'ok' : 'warn']">
            {{ snap.complete ? "数据完整" : "部分数据" }}
          </text>
        </view>
        <text class="big">{{ fmtMoney(snap.totals.usd, "USD") }}</text>
        <text class="small muted">
          {{ fmtMoney(snap.totals.cny, "CNY") }} · 汇率 {{ snap.fx.usd_cny }}{{ snap.fx.stale ? "（缓存）" : "" }}
        </text>
        <view v-if="snap.valuation" class="valuation">
          <text class="small muted">已定价 {{ fmtMoney(snap.valuation.priced_usd, "USD") }}</text>
          <text class="small muted">现金 {{ fmtMoney(snap.valuation.cash_usd, "USD") }}</text>
          <text class="small muted">未定价/其他 {{ fmtMoney(snap.valuation.unpriced_or_other_usd, "USD") }}</text>
        </view>
        <text class="small muted">快照时间 {{ fmtDateTime(snap.created_at) }}</text>
      </view>

      <view v-if="snap.warnings.length" class="card warnings">
        <text class="warn-title">提示（后端原文）</text>
        <text v-for="(w, i) in snap.warnings" :key="i" class="warn-item">{{ w }}</text>
      </view>

      <view class="section-title">账户（{{ snap.accounts.length }}）</view>
      <view
        v-for="(a, i) in snap.accounts"
        :key="a.source_id || `${a.broker}-${i}`"
        class="card account"
      >
        <view class="row-between">
          <text class="title">{{ a.label || a.broker }}</text>
          <text :class="['badge', a.status === 'ok' ? 'ok' : 'err']">
            {{ a.status === "ok" ? "正常" : "错误" }}
          </text>
        </view>
        <text v-if="a.status === 'ok'" class="small muted">
          {{ fmtMoney(a.total_usd, "USD") }} · 持仓 {{ a.position_count ?? "-" }}
          （已定价 {{ a.priced_position_count ?? "-" }}）
        </text>
        <text v-else class="small err-text">{{ a.error || a.error_code || "读取失败" }}</text>
      </view>

      <view class="section-title">持仓（{{ snap.positions.length }}）</view>
      <view v-if="!snap.positions.length" class="state-block">暂无持仓</view>
      <view
        v-for="(p, i) in snap.positions"
        :key="`${p.symbol}-${p.broker}-${i}`"
        class="card position"
      >
        <view class="row-between">
          <text class="title">{{ p.symbol }}</text>
          <text class="value" :style="{ color: pnlColor(p) }">{{ pnlText(p) }}</text>
        </view>
        <text class="small muted">{{ p.name }} · 数量 {{ p.quantity }} · {{ p.market }}</text>
        <text class="small">市值 {{ displayValue(p) }}</text>
        <text v-if="!p.priced" class="small warn-text">{{ p.price_error || "未定价" }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { onPullDownRefresh, onShow } from "@dcloudio/uni-app";
import { usePortfolioStore } from "@/stores/portfolio";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { PortfolioPosition } from "@/types/api";

const portfolio = usePortfolioStore();
const snap = computed(() => portfolio.snapshot);

onShow(() => {
  void portfolio.load();
});

onPullDownRefresh(() => {
  portfolio.load().finally(() => uni.stopPullDownRefresh());
});

function displayCurrency(): "USD" | "CNY" {
  return snap.value?.display_currency ?? "USD";
}

function displayValue(p: PortfolioPosition): string {
  return displayCurrency() === "CNY"
    ? fmtMoney(p.market_value_cny, "CNY")
    : fmtMoney(p.market_value_usd, "USD");
}

function pnlText(p: PortfolioPosition): string {
  const pnl = p.unrealized_pnl_usd;
  if (pnl === null || pnl === undefined || !Number.isFinite(pnl)) return "";
  return `${pnl > 0 ? "+" : ""}${fmtMoney(pnl, "USD")}`;
}

function pnlColor(p: PortfolioPosition): string {
  const pnl = p.unrealized_pnl_usd;
  if (pnl === null || pnl === undefined || !Number.isFinite(pnl) || pnl === 0) return "var(--muted)";
  return pnl > 0 ? "var(--success)" : "var(--error)";
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

.total {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 13px;
  color: var(--muted);
}

.big {
  font-size: 26px;
  font-weight: 700;
}

.valuation {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.badge {
  font-size: 11px;
  border-radius: 6px;
  padding: 2px 8px;

  &.ok {
    color: var(--success);
    background: rgba(22, 163, 74, 0.12);
  }

  &.warn {
    color: var(--warning);
    background: rgba(217, 119, 6, 0.12);
  }

  &.err {
    color: var(--error);
    background: rgba(220, 38, 38, 0.12);
  }
}

.warnings {
  border-color: var(--warning);
}

.warn-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--warning);
  margin-bottom: 4px;
}

.warn-item {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}

.small {
  font-size: 12px;
}

.muted {
  color: var(--muted);
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.value {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.account,
.position {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.err-text {
  color: var(--error);
}

.warn-text {
  color: var(--warning);
}
</style>
