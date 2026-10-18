<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { Transaction } from '@/lib/types'
import { bucketLabel, type Granularity } from '@/lib/dates'
import { seriesByBucket } from '@/lib/stats'
import { barStyle, baseOptions } from '@/lib/chartSetup'
import { INCOME, palette, SPEND } from '@/lib/theme'
import { money } from '@/lib/format'

const props = defineProps<{ txns: Transaction[]; from: string; to: string; granularity: Granularity; showIncome: boolean }>()

const series = computed(() => seriesByBucket(props.txns, props.from, props.to, props.granularity))

const data = computed(() => {
  const p = palette()
  const s = series.value
  const datasets = [{ label: 'Spending', data: s.spend, backgroundColor: p.series[SPEND], ...barStyle }]
  if (props.showIncome) datasets.push({ label: 'Income', data: s.income, backgroundColor: p.series[INCOME], ...barStyle })
  return { labels: s.keys.map((k) => bucketLabel(k, props.granularity)), datasets }
})

const options = computed(() => {
  const o = baseOptions({ legend: props.showIncome })
  const s = series.value
  o.datasets = { bar: { categoryPercentage: 0.7, barPercentage: 0.9 } }
  o.plugins!.tooltip!.callbacks!.footer = (items) => {
    if (!props.showIncome) return ''
    const i = items[0]?.dataIndex ?? 0
    const net = s.income[i]! - s.spend[i]!
    return `Net: ${net >= 0 ? '+' : ''}${money(net)}`
  }
  return o
})
</script>

<template>
  <div class="chart" style="height: 280px">
    <Bar :data="data" :options="options" />
  </div>
</template>
