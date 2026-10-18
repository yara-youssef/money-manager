import { ref } from 'vue'

const query = window.matchMedia('(prefers-color-scheme: dark)')
export const isDark = ref(query.matches)
query.addEventListener('change', (e) => (isDark.value = e.matches))

const light = {
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  other: '#c3c2b7',
  surface: '#fcfcfb',
  text: '#0b0b0b',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
}
const dark = {
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  other: '#52514e',
  surface: '#1a1a19',
  text: '#f0efec',
  muted: '#898781',
  grid: '#2c2c2a',
  axis: '#383835',
}

export const palette = () => (isDark.value ? dark : light)

/** Spending is always slot 1 (blue), income slot 3 (aqua). */
export const SPEND = 0
export const INCOME = 2
