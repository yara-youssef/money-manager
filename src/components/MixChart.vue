<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { Transaction } from '@/lib/types'
import { bucketLabel, type Granularity } from '@/lib/dates'
import { categoryMix } from '@/lib/stats'
import { barStyle, baseOptions } from '@/lib/chartSetup'
import { palette } from '@/lib/theme'
import { money } from '@/lib/format'

const props = defineProps<{
  expenses: Transaction[]
  from: string
  to: string
  granularity: Granularity
  /** Category → palette slot, for the categories that get their own color. */
  colors: Map<string, number>
}>()

const named = computed(() => [...props.colors.keys()])
const mix = computed(() => categoryMix(props.expenses, props.from, props.to, props.granularity, named.value))

const data = computed(() => {
  const p = palette()
  const datasets = [...mix.value.rows.entries()]
    .filter(([, vals]) => vals.some((v) => v > 0))
    .map(([name, vals]) => ({
      label: name,
      data: vals,
      backgroundColor: name === 'Everything else' ? p.other : p.series[props.colors.get(name)!],
      borderColor: p.surface,
      borderWidth: { top: 2 },
      borderSkipped: 'start' as const,
      maxBarThickness: barStyle.maxBarThickness,
      borderRadius: 0,
    }))
  // Round only the top segment of each stack.
  const last = datasets.length - 1
  datasets.forEach((d, i) => {
    if (i === last) d.borderRadius = 4
  })
  return { labels: mix.value.keys.map((k) => bucketLabel(k, props.granularity)), datasets }
})

const options = computed(() => {
  const o = baseOptions({ stacked: true, legend: true })
  o.datasets = { bar: { categoryPercentage: 0.75 } }
  o.plugins!.tooltip!.itemSort = (a, b) => Number(b.raw) - Number(a.raw)
  o.plugins!.tooltip!.filter = (item) => Number(item.raw) > 0
  o.plugins!.tooltip!.callbacks!.footer = (items) => `Total: ${money(items.reduce((s, i) => s + Number(i.raw), 0))}`
  return o
})
</script>

<template>
  <div class="chart" style="height: 320px">
    <Bar :data="data" :options="options" />
  </div>
</template>
