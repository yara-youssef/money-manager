<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Transaction } from '@/lib/types'
import { formatDay } from '@/lib/dates'
import { money } from '@/lib/format'

const props = defineProps<{ txns: Transaction[] }>()

type Key = 'day' | 'category' | 'note' | 'amount' | 'account'
const sortKey = ref<Key>('day')
const desc = ref(true)
const page = ref(0)
const PAGE = 25

const sorted = computed(() => {
  const k = sortKey.value
  const dir = desc.value ? -1 : 1
  return [...props.txns].sort((a, b) => {
    const av = k === 'day' ? a.time : k === 'amount' ? (a.type === 'income' ? a.amount : -a.amount) : a[k].toLowerCase()
    const bv = k === 'day' ? b.time : k === 'amount' ? (b.type === 'income' ? b.amount : -b.amount) : b[k].toLowerCase()
    return av < bv ? -dir : av > bv ? dir : 0
  })
})
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE)))
const rows = computed(() => sorted.value.slice(page.value * PAGE, (page.value + 1) * PAGE))
watch(() => props.txns, () => (page.value = 0))

function sortBy(k: Key) {
  if (sortKey.value === k) desc.value = !desc.value
  else {
    sortKey.value = k
    desc.value = k === 'day' || k === 'amount'
  }
}
const arrow = (k: Key) => (sortKey.value === k ? (desc.value ? '↓' : '↑') : '')

const columns: { key: Key; label: string; cls?: string }[] = [
  { key: 'day', label: 'Date' },
  { key: 'category', label: 'Category' },
  { key: 'note', label: 'Note' },
  { key: 'account', label: 'Account', cls: 'hide-sm' },
  { key: 'amount', label: 'Amount', cls: 'num' },
]
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th v-for="c in columns" :key="c.key" :class="c.cls" :aria-sort="sortKey === c.key ? (desc ? 'descending' : 'ascending') : 'none'">
            <button type="button" @click="sortBy(c.key)">{{ c.label }} {{ arrow(c.key) }}</button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id">
          <td class="nowrap">{{ formatDay(t.day) }}</td>
          <td>{{ t.category }}</td>
          <td>
            {{ t.note }}
            <span v-if="t.description" class="desc">{{ t.description }}</span>
          </td>
          <td class="hide-sm">{{ t.account }}</td>
          <td class="num" :class="{ income: t.type === 'income' }">{{ t.type === 'income' ? '+' : '−' }}{{ money(t.amount) }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="5" class="muted">No transactions match the filters.</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="pages > 1" class="pager">
    <button type="button" class="btn small" :disabled="page === 0" @click="page--">Previous</button>
    <span class="muted">Page {{ page + 1 }} of {{ pages }} · {{ txns.length }} transactions</span>
    <button type="button" class="btn small" :disabled="page >= pages - 1" @click="page++">Next</button>
  </div>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th {
  text-align: left;
  border-bottom: 1px solid var(--axis);
  padding: 0;
}
th button {
  all: unset;
  cursor: pointer;
  display: block;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
th.num button {
  text-align: right;
  width: calc(100% - 20px);
}
td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--grid);
  vertical-align: top;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.income {
  color: var(--good-text);
}
.nowrap {
  white-space: nowrap;
}
.desc {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
}
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }
}
</style>
