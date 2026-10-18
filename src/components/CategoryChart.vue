<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ActiveElement } from 'chart.js'
import type { Transaction } from '@/lib/types'
import { totalsBy } from '@/lib/stats'
import { barStyle, baseOptions } from '@/lib/chartSetup'
import { palette, SPEND } from '@/lib/theme'
import { pct } from '@/lib/format'

const props = defineProps<{ expenses: Transaction[] }>()
const emit = defineEmits<{ select: [string] }>()

const rows = computed(() => totalsBy(props.expenses, (t) => t.category))
const total = computed(() => rows.value.reduce((s, r) => s + r.total, 0))

const data = computed(() => ({
  labels: rows.value.map((r) => r.name),
  datasets: [{ data: rows.value.map((r) => r.total), backgroundColor: palette().series[SPEND], ...barStyle, maxBarThickness: 18 }],
}))

const options = computed(() => {
  const o = baseOptions({ horizontal: true })
  o.interaction = { mode: 'nearest', intersect: false, axis: 'y' }
  o.datasets = { bar: { categoryPercentage: 0.8, barPercentage: 0.9 } }
  o.plugins!.tooltip!.callbacks!.afterLabel = (ctx) => {
    const r = rows.value[ctx.dataIndex]!
    return ` ${pct(r.total / total.value, 1)} of spending · ${r.count} transactions`
  }
  o.onClick = (_e, els: ActiveElement[]) => {
    const r = els[0] && rows.value[els[0].index]
    if (r) emit('select', r.name)
  }
  o.onHover = (e, els) => {
    const t = e.native?.target as HTMLElement | undefined
    if (t) t.style.cursor = els.length ? 'pointer' : 'default'
  }
  return o
})
</script>

<template>
  <div class="chart" :style="{ height: `${Math.max(160, rows.length * 26 + 40)}px` }">
    <Bar :data="data" :options="options" />
  </div>
</template>
