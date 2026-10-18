<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { Transaction } from '@/lib/types'
import { weekdayTotals } from '@/lib/stats'
import { barStyle, baseOptions } from '@/lib/chartSetup'
import { palette, SPEND } from '@/lib/theme'

const props = defineProps<{ expenses: Transaction[]; from: string; to: string }>()

const DAYS = [0, 1, 2, 3, 4, 5, 6].map((i) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, 0, 1 + i)),
)

const totals = computed(() => weekdayTotals(props.expenses, props.from, props.to))

const data = computed(() => ({
  labels: DAYS,
  datasets: [{ label: 'Average per day', data: totals.value.map((t) => t.avg), backgroundColor: palette().series[SPEND], ...barStyle }],
}))

const options = computed(() => {
  const o = baseOptions()
  o.datasets = { bar: { categoryPercentage: 0.6 } }
  return o
})
</script>

<template>
  <div class="chart" style="height: 220px">
    <Bar :data="data" :options="options" />
  </div>
</template>
