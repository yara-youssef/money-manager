<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Dataset, Transaction } from '@/lib/types'
import { parseFile } from '@/lib/parse'
import { addDays, addMonths, daysBetween, endOfMonth, formatDay, formatMonth, pickGranularity, startOfMonth, weekday } from '@/lib/dates'
import { recurringPayments, sum, totalsBy } from '@/lib/stats'
import { money, pct, setCurrency } from '@/lib/format'
import { palette } from '@/lib/theme'
import UploadZone from '@/components/UploadZone.vue'
import MultiSelect, { type Option } from '@/components/MultiSelect.vue'
import ChartCard from '@/components/ChartCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import CategoryChart from '@/components/CategoryChart.vue'
import MixChart from '@/components/MixChart.vue'
import WeekdayChart from '@/components/WeekdayChart.vue'
import RankList from '@/components/RankList.vue'
import TransactionsTable from '@/components/TransactionsTable.vue'

const STORAGE_KEY = 'money-manager:dataset'

// ---------- Data loading ----------

function loadStored(): Dataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Dataset) : null
  } catch {
    return null
  }
}

const dataset = ref<Dataset | null>(loadStored())
const busy = ref(false)
const error = ref('')

async function onFile(file: File) {
  busy.value = true
  error.value = ''
  try {
    dataset.value = await parseFile(file)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset.value))
    } catch {
      // Storage full or blocked: the dashboard still works for this visit.
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not read this file.'
    if (dataset.value) alert(error.value)
  } finally {
    busy.value = false
  }
}

function clearData() {
  if (!confirm('Remove the loaded data from this browser?')) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  dataset.value = null
}

const txns = computed<Transaction[]>(() => dataset.value?.transactions ?? [])
const firstDay = computed(() => txns.value.reduce((m, t) => (t.day < m ? t.day : m), txns.value[0]?.day ?? ''))
const lastDay = computed(() => txns.value.reduce((m, t) => (t.day > m ? t.day : m), ''))

// ---------- Filters ----------

type PresetId = 'month' | '3m' | '6m' | '12m' | 'ytd' | 'lastyear' | 'all' | 'custom'
const presets: { id: PresetId; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: '3m', label: 'Last 3 months' },
  { id: '6m', label: 'Last 6 months' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'ytd', label: 'This year' },
  { id: 'lastyear', label: 'Last year' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
]

const preset = ref<PresetId>('12m')
const from = ref('')
const to = ref('')

function rangeFor(id: PresetId): [string, string] | null {
  // Presets are anchored to the newest transaction, so older exports still make sense.
  const anchor = lastDay.value
  const end = endOfMonth(anchor)
  const year = anchor.slice(0, 4)
  switch (id) {
    case 'month':
      return [startOfMonth(anchor), end]
    case '3m':
      return [addMonths(anchor, -2), end]
    case '6m':
      return [addMonths(anchor, -5), end]
    case '12m':
      return [addMonths(anchor, -11), end]
    case 'ytd':
      return [`${year}-01-01`, `${year}-12-31`]
    case 'lastyear':
      return [`${+year - 1}-01-01`, `${+year - 1}-12-31`]
    case 'all':
      return [startOfMonth(firstDay.value), end]
    default:
      return null
  }
}

function applyPreset(id: PresetId) {
  preset.value = id
  const r = rangeFor(id)
  if (r) [from.value, to.value] = r
}

function onDateInput() {
  preset.value = 'custom'
  if (from.value && to.value && from.value > to.value) [from.value, to.value] = [to.value, from.value]
}

const expenseCats = computed(() => totalsBy(txns.value.filter((t) => t.type === 'expense'), (t) => t.category))
const incomeCats = computed(() => totalsBy(txns.value.filter((t) => t.type === 'income'), (t) => t.category))
const accountsAll = computed(() => totalsBy(txns.value, (t) => t.account))

const categoryOptions = computed<Option[]>(() => [
  ...expenseCats.value.map((c) => ({ value: c.name, group: 'Spending', hint: String(c.count) })),
  ...incomeCats.value.filter((c) => !expenseCats.value.some((e) => e.name === c.name)).map((c) => ({ value: c.name, group: 'Income', hint: String(c.count) })),
])
const accountOptions = computed<Option[]>(() => accountsAll.value.map((a) => ({ value: a.name, hint: String(a.count) })))

const categories = ref(new Set<string>())
const accounts = ref(new Set<string>())
const search = ref('')

function resetFilters() {
  categories.value = new Set(categoryOptions.value.map((o) => o.value))
  accounts.value = new Set(accountOptions.value.map((o) => o.value))
  search.value = ''
  separateInvest.value = true
  applyPreset('12m')
}

const isFiltered = computed(
  () =>
    categories.value.size !== categoryOptions.value.length ||
    accounts.value.size !== accountOptions.value.length ||
    search.value.trim() !== '' ||
    !separateInvest.value ||
    preset.value !== '12m',
)

/** Everything except the date range applied – reused for the previous-period comparison. */
const scoped = computed(() => {
  const q = search.value.trim().toLowerCase()
  return txns.value.filter(
    (t) =>
      categories.value.has(t.category) &&
      accounts.value.has(t.account) &&
      (!q || t.note.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)),
  )
})
const inRange = (a: string, b: string) => scoped.value.filter((t) => t.day >= a && t.day <= b)

/** Categories that move money into savings rather than spending it. */
const INVEST_RE = /invest|saving|sparen|depot|stock|etf|crypto|pension/i
const investCats = computed(() => new Set(expenseCats.value.map((c) => c.name).filter((n) => INVEST_RE.test(n))))
const separateInvest = ref(true)
const isInvestment = (t: Transaction) => separateInvest.value && t.type === 'expense' && investCats.value.has(t.category)

const filtered = computed(() => inRange(from.value, to.value))
/** Income and spending, without investments when those are counted as savings. */
const flows = computed(() => filtered.value.filter((t) => !isInvestment(t)))
const expenses = computed(() => flows.value.filter((t) => t.type === 'expense'))
const investments = computed(() => filtered.value.filter(isInvestment))
const invested = computed(() => sum(investments.value))
const income = computed(() => filtered.value.filter((t) => t.type === 'income'))
const granularity = computed(() => pickGranularity(from.value, to.value))
const showIncome = computed(() => incomeCats.value.some((c) => categories.value.has(c.name)))

function focusCategory(name: string) {
  categories.value = new Set([name])
}

// ---------- Colors ----------

/** Categories keep their slot from overall spend rank; free slots go to the next-ranked selected ones. */
const categoryColors = computed(() => {
  const slots = palette().series.length - 1
  const ranked = expenseCats.value.map((c) => c.name).filter((n) => !(separateInvest.value && investCats.value.has(n)))
  const selected = ranked.filter((n) => categories.value.has(n))
  const map = new Map<string, number>()
  const used = new Set<number>()
  ranked.slice(0, slots).forEach((n, i) => {
    if (categories.value.has(n)) {
      map.set(n, i)
      used.add(i)
    }
  })
  let free = 0
  for (const n of selected) {
    if (map.has(n)) continue
    while (free < slots && used.has(free)) free++
    if (free >= slots) break
    map.set(n, free)
    used.add(free)
  }
  return new Map([...map.entries()].sort((a, b) => a[1] - b[1]))
})

// ---------- Headline numbers ----------

const days = computed(() => daysBetween(from.value, to.value))
const months = computed(() => days.value / 30.4375)
const spent = computed(() => sum(expenses.value))
const earned = computed(() => sum(income.value))
const net = computed(() => earned.value - spent.value)

const previous = computed(() => {
  const len = days.value
  const pTo = addDays(from.value, -1)
  const pFrom = addDays(from.value, -len)
  if (!firstDay.value || firstDay.value > pTo) return null
  const ts = inRange(pFrom, pTo).filter((t) => !isInvestment(t))
  return { from: pFrom, to: pTo, spent: sum(ts.filter((t) => t.type === 'expense')), earned: sum(ts.filter((t) => t.type === 'income')) }
})

function delta(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return null
  return (now - before) / before
}
const spentDelta = computed(() => delta(spent.value, previous.value?.spent))

const tiles = computed(() => {
  const list: { label: string; value: string; note?: string; tone?: 'good' | 'bad' }[] = [
    {
      label: 'Spent',
      value: money(spent.value),
      note:
        spentDelta.value === null
          ? `${expenses.value.length} expenses`
          : `${spentDelta.value >= 0 ? '▲' : '▼'} ${pct(Math.abs(spentDelta.value))} vs previous period`,
      tone: spentDelta.value === null ? undefined : spentDelta.value > 0 ? 'bad' : 'good',
    },
  ]
  if (invested.value > 0) {
    list.push({ label: 'Invested', value: money(invested.value), note: `${investments.value.length} transfers · not counted as spending` })
  }
  if (showIncome.value) {
    list.push({ label: 'Income', value: money(earned.value), note: `${income.value.length} payments` })
    list.push({
      label: 'Net saved',
      value: `${net.value >= 0 ? '+' : '−'}${money(Math.abs(net.value))}`,
      note: earned.value > 0 ? `${pct(net.value / earned.value)} savings rate` : undefined,
      tone: net.value >= 0 ? 'good' : 'bad',
    })
  }
  list.push({ label: 'Average per month', value: money(spent.value / Math.max(1, months.value)), note: `${money(spent.value / days.value)} per day` })
  list.push({
    label: 'Typical purchase',
    value: money(median(expenses.value.map((t) => t.amount))),
    note: `median of ${expenses.value.length} · avg ${money(spent.value / Math.max(1, expenses.value.length))}`,
  })
  return list
})

function median(xs: number[]) {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

// ---------- Breakdowns ----------

const merchants = computed(() => totalsBy(expenses.value.filter((t) => t.note), (t) => t.note.toLowerCase()))
const recurring = computed(() => recurringPayments(expenses.value))
const recurringMonthly = computed(() => recurring.value.reduce((s, r) => s + r.typical, 0))
const accountSplit = computed(() => totalsBy(expenses.value, (t) => t.account))

const insights = computed(() => {
  const out: string[] = []
  const ex = expenses.value
  if (!ex.length) return out
  const cats = totalsBy(ex, (t) => t.category)
  const top = cats[0]!
  out.push(`<b>${top.name}</b> is your biggest category at <b>${money(top.total)}</b> — ${pct(top.total / spent.value)} of all spending.`)
  if (cats.length > 2) {
    const top3 = cats.slice(0, 3)
    out.push(`Your top 3 categories (${top3.map((c) => c.name).join(', ')}) make up <b>${pct(sum3(top3) / spent.value)}</b> of spending.`)
  }

  if (previous.value && spentDelta.value !== null) {
    const d = spentDelta.value
    out.push(
      `You spent <b>${pct(Math.abs(d))} ${d >= 0 ? 'more' : 'less'}</b> than in the previous ${days.value} days (${money(previous.value.spent)} from ${formatDay(previous.value.from)} to ${formatDay(previous.value.to)}).`,
    )
    const prevCats = new Map(totalsBy(inRange(previous.value.from, previous.value.to).filter((t) => t.type === 'expense' && !isInvestment(t)), (t) => t.category).map((c) => [c.name, c.total]))
    const movers = cats.map((c) => ({ name: c.name, diff: c.total - (prevCats.get(c.name) ?? 0) })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    const m = movers[0]
    if (m && Math.abs(m.diff) > 0.05 * spent.value) out.push(`The biggest change was <b>${m.name}</b>: ${m.diff >= 0 ? 'up' : 'down'} ${money(Math.abs(m.diff))} on the previous period.`)
  }

  if (months.value >= 2) {
    const byMonth = totalsBy(ex, (t) => t.day.slice(0, 7))
    const hi = byMonth[0]!
    const lo = byMonth[byMonth.length - 1]!
    if (byMonth.length > 1) out.push(`Your most expensive month was <b>${formatMonth(hi.name)}</b> (${money(hi.total)}); the cheapest was ${formatMonth(lo.name)} (${money(lo.total)}).`)
  }

  const freq = [...merchants.value].sort((a, b) => b.count - a.count)[0]
  if (freq && freq.count > 2) out.push(`You go to <b class="cap">${freq.name}</b> most often — ${freq.count} times, ${money(freq.total)} in total (about ${money(freq.total / freq.count)} each visit).`)

  const big = ex.reduce((a, b) => (b.amount > a.amount ? b : a))
  out.push(`Biggest single expense: <b>${money(big.amount)}</b> for ${big.note || big.category} (${big.category}, ${formatDay(big.day)}).`)

  const weekend = sum(ex.filter((t) => weekday(t.day) >= 5))
  out.push(`Weekends account for <b>${pct(weekend / spent.value)}</b> of your spending (they're 29% of the days).`)

  const small = ex.filter((t) => t.amount < 10)
  if (small.length > 5) out.push(`<b>${small.length}</b> purchases were under ${money(10)} — together they add up to ${money(sum(small))}.`)

  if (recurring.value.length) out.push(`You have <b>${recurring.value.length}</b> recurring payments, roughly <b>${money(recurringMonthly.value)}</b> a month.`)

  if (showIncome.value && earned.value > 0) {
    out.push(
      net.value >= 0
        ? `You kept <b>${pct(net.value / earned.value)}</b> of your income (${money(net.value)}).`
        : `You spent <b>${money(-net.value)}</b> more than you earned in this period.`,
    )
  }
  if (invested.value > 0) {
    out.push(`You put <b>${money(invested.value)}</b> into investments/savings${earned.value > 0 && showIncome.value ? ` — ${pct(invested.value / earned.value)} of your income` : ''}.`)
  }
  return out
})
const sum3 = (rows: { total: number }[]) => rows.reduce((s, r) => s + r.total, 0)

const rangeLabel = computed(() => `${formatDay(from.value)} – ${formatDay(to.value)}`)
const granularityLabel = computed(() => ({ day: 'per day', week: 'per week', month: 'per month' })[granularity.value])

// Runs last so every filter ref above exists before the first reset.
watch(
  dataset,
  (d) => {
    if (!d) return
    setCurrency(d.currency)
    resetFilters()
  },
  { immediate: true },
)
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="brand">
        <span class="logo" aria-hidden="true">€</span>
        <div>
          <h1>Money Manager</h1>
          <p v-if="dataset" class="muted small">
            {{ dataset.fileName }} · {{ txns.length }} transactions · {{ formatDay(firstDay) }} – {{ formatDay(lastDay) }}
          </p>
        </div>
      </div>
      <div v-if="dataset" class="top-actions">
        <UploadZone compact :busy="busy" @file="onFile" />
        <button type="button" class="btn ghost" @click="clearData">Clear</button>
      </div>
    </header>

    <main v-if="!dataset" class="welcome">
      <h2>See where your money goes</h2>
      <p class="muted">
        Upload the Excel export from your money tracker (columns like <i>Period, Accounts, Category, Note, Income/Expense, Amount</i>).
        The file is read entirely in your browser — nothing is uploaded anywhere.
      </p>
      <UploadZone :busy="busy" :error="error" @file="onFile" />
    </main>

    <main v-else>
      <div class="filters" role="search">
        <div class="field">
          <label class="field-label" for="preset">Period</label>
          <select id="preset" :value="preset" @change="applyPreset(($event.target as HTMLSelectElement).value as PresetId)">
            <option v-for="p in presets" :key="p.id" :value="p.id" :disabled="p.id === 'custom'">{{ p.label }}</option>
          </select>
        </div>
        <div class="field dates">
          <span class="field-label">From – to</span>
          <div class="date-pair">
            <input v-model="from" type="date" aria-label="From" :max="to" @change="onDateInput" />
            <input v-model="to" type="date" aria-label="To" :min="from" @change="onDateInput" />
          </div>
        </div>
        <MultiSelect v-model="categories" label="Categories" all-label="All categories" :options="categoryOptions" />
        <MultiSelect v-model="accounts" label="Accounts" all-label="All accounts" :options="accountOptions" />
        <div class="field grow">
          <label class="field-label" for="q">Search notes</label>
          <input id="q" v-model="search" type="search" placeholder="e.g. Rewe, zalando…" />
        </div>
        <label v-if="investCats.size" class="toggle" :title="`Categories: ${[...investCats].join(', ')}`">
          <input v-model="separateInvest" type="checkbox" />
          Count investments as savings
        </label>
        <button v-if="isFiltered" type="button" class="btn ghost reset" @click="resetFilters">Reset</button>
      </div>

      <p class="range muted">{{ rangeLabel }} · {{ filtered.length }} transactions</p>

      <div v-if="!filtered.length" class="card empty-state">
        <p>No transactions match these filters.</p>
        <button type="button" class="btn" @click="resetFilters">Reset filters</button>
      </div>

      <template v-else>
        <section class="tiles">
          <div v-for="t in tiles" :key="t.label" class="tile">
            <span class="tile-label">{{ t.label }}</span>
            <span class="tile-value">{{ t.value }}</span>
            <span v-if="t.note" class="tile-note" :class="t.tone">{{ t.note }}</span>
          </div>
        </section>

        <div class="grid">
          <ChartCard class="span-2" :title="showIncome ? 'Income vs spending' : 'Spending over time'" :subtitle="`Totals ${granularityLabel}`">
            <TrendChart :txns="flows" :from="from" :to="to" :granularity="granularity" :show-income="showIncome" />
          </ChartCard>

          <ChartCard title="Spending by category" subtitle="Click a bar to focus on that category">
            <CategoryChart :expenses="expenses" @select="focusCategory" />
          </ChartCard>

          <ChartCard title="Highlights" :subtitle="rangeLabel">
            <ul class="insights">
              <li v-for="(s, i) in insights" :key="i" v-html="s" />
            </ul>
          </ChartCard>

          <ChartCard class="span-2" title="Category mix over time" :subtitle="`Spending ${granularityLabel}, top categories in color`">
            <MixChart :expenses="expenses" :from="from" :to="to" :granularity="granularity" :colors="categoryColors" />
          </ChartCard>

          <ChartCard title="Top places" subtitle="By total spent (from the Note column)">
            <RankList :rows="merchants" :limit="10" />
          </ChartCard>

          <div class="stack">
            <ChartCard title="Spending by day of week" subtitle="Average spent on each weekday">
              <WeekdayChart :expenses="expenses" :from="from" :to="to" />
            </ChartCard>
            <ChartCard title="By account">
              <RankList :rows="accountSplit" />
            </ChartCard>
          </div>

          <ChartCard class="span-2" title="Recurring payments" :subtitle="recurring.length ? `About ${money(recurringMonthly)} per month — same payee, similar amount, at least 3 months` : 'Same payee and similar amount in at least 3 different months'">
            <div v-if="recurring.length" class="table-wrap">
              <table class="simple">
                <thead>
                  <tr><th>Payee</th><th>Category</th><th class="num">Typical</th><th class="num">Months</th><th class="num">Total</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in recurring" :key="r.name">
                    <td class="cap">{{ r.name }}</td>
                    <td>{{ r.category }}</td>
                    <td class="num">{{ money(r.typical) }}</td>
                    <td class="num">{{ r.months }}</td>
                    <td class="num">{{ money(r.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="muted">No recurring payments found in this range.</p>
          </ChartCard>

          <ChartCard class="span-2" title="Transactions">
            <TransactionsTable :txns="filtered" />
          </ChartCard>
        </div>
      </template>
    </main>
  </div>
</template>
