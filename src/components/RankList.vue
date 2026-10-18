<script setup lang="ts">
import { computed } from 'vue'
import { money } from '@/lib/format'

const props = defineProps<{ rows: { name: string; total: number; count: number }[]; limit?: number }>()
const shown = computed(() => props.rows.slice(0, props.limit ?? 10))
const max = computed(() => shown.value[0]?.total ?? 1)
</script>

<template>
  <ol class="rank">
    <li v-for="r in shown" :key="r.name" :title="`${r.name}: ${money(r.total)} over ${r.count} transactions`">
      <div class="rank-top">
        <span class="rank-name">{{ r.name }}</span>
        <span class="rank-val">{{ money(r.total) }}</span>
      </div>
      <div class="rank-bar"><span :style="{ width: `${(r.total / max) * 100}%` }" /></div>
      <div class="rank-meta">{{ r.count }}× · avg {{ money(r.total / r.count) }}</div>
    </li>
    <li v-if="!shown.length" class="muted">Nothing in this range.</li>
  </ol>
</template>

<style scoped>
.rank {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.rank-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: capitalize;
}
.rank-val {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.rank-bar {
  height: 6px;
  margin: 5px 0 3px;
  border-radius: 3px;
  background: var(--grid);
}
.rank-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--series-1);
}
.rank-meta {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
