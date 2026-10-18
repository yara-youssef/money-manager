import {
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { palette } from './theme'
import { moneyShort, money } from './format'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)
Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif'
Chart.defaults.font.size = 12
Chart.defaults.animation = { duration: 250 }

export const barStyle = {
  borderRadius: 4,
  borderSkipped: 'start' as const,
  maxBarThickness: 24,
}

/** Shared options; `horizontal` flips the value axis to x. */
export function baseOptions(opts: { horizontal?: boolean; stacked?: boolean; legend?: boolean } = {}): ChartOptions<'bar'> {
  const p = palette()
  const valueAxis = {
    stacked: opts.stacked,
    beginAtZero: true,
    border: { display: false },
    grid: { color: p.grid, lineWidth: 1 },
    ticks: { color: p.muted, maxTicksLimit: 6, callback: (v: string | number) => moneyShort(Number(v)) },
  }
  const categoryAxis = {
    stacked: opts.stacked,
    border: { color: p.axis },
    grid: { display: false },
    ticks: { color: opts.horizontal ? p.text : p.muted, autoSkip: !opts.horizontal, autoSkipPadding: 12, maxRotation: 0 },
  }
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: opts.horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false, axis: opts.horizontal ? 'y' : 'x' },
    scales: opts.horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    plugins: {
      legend: {
        display: opts.legend ?? false,
        position: 'top',
        align: 'start',
        labels: { color: p.text, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, padding: 14 },
      },
      tooltip: {
        backgroundColor: p.surface,
        titleColor: p.text,
        bodyColor: p.text,
        borderColor: p.grid,
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${money(Number(ctx.raw))}`,
        },
      },
    },
  }
}
