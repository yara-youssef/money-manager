import type { Transaction } from './types'
import { bucketOf, bucketRange, daysBetween, type Granularity, weekday } from './dates'

export const sum = (ts: Transaction[]) => ts.reduce((s, t) => s + t.amount, 0)

export function totalsBy(ts: Transaction[], key: (t: Transaction) => string) {
  const m = new Map<string, { total: number; count: number }>()
  for (const t of ts) {
    const k = key(t)
    const e = m.get(k) ?? { total: 0, count: 0 }
    e.total += t.amount
    e.count++
    m.set(k, e)
  }
  return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total)
}

export function seriesByBucket(ts: Transaction[], from: string, to: string, g: Granularity) {
  const keys = bucketRange(from, to, g)
  const idx = new Map(keys.map((k, i) => [k, i]))
  const spend = keys.map(() => 0)
  const income = keys.map(() => 0)
  for (const t of ts) {
    const i = idx.get(bucketOf(t.day, g))
    if (i === undefined) continue
    if (t.type === 'expense') spend[i]! += t.amount
    else income[i]! += t.amount
  }
  return { keys, spend, income }
}

/** Per-bucket spend split by category; categories outside `named` fold into "Other". */
export function categoryMix(expenses: Transaction[], from: string, to: string, g: Granularity, named: string[]) {
  const keys = bucketRange(from, to, g)
  const idx = new Map(keys.map((k, i) => [k, i]))
  const rows = new Map<string, number[]>()
  for (const n of [...named, 'Everything else']) rows.set(n, keys.map(() => 0))
  for (const t of expenses) {
    const i = idx.get(bucketOf(t.day, g))
    if (i === undefined) continue
    const row = rows.get(named.includes(t.category) ? t.category : 'Everything else')!
    row[i]! += t.amount
  }
  return { keys, rows }
}

export function weekdayTotals(expenses: Transaction[], from: string, to: string) {
  const totals = [0, 0, 0, 0, 0, 0, 0]
  for (const t of expenses) totals[weekday(t.day)]! += t.amount
  // How many of each weekday the range contains, for a fair per-day average.
  const occurrences = [0, 0, 0, 0, 0, 0, 0]
  const n = daysBetween(from, to)
  const first = weekday(from)
  for (let i = 0; i < 7; i++) occurrences[(first + i) % 7] = Math.floor(n / 7) + (i < n % 7 ? 1 : 0)
  return totals.map((t, i) => ({ total: t, avg: occurrences[i] ? t / occurrences[i]! : 0 }))
}

export interface Recurring {
  name: string
  category: string
  months: number
  typical: number
  total: number
}

/** Payees charged in at least 3 different months with a fairly stable amount. */
export function recurringPayments(expenses: Transaction[]): Recurring[] {
  const groups = new Map<string, Transaction[]>()
  for (const t of expenses) {
    if (!t.note) continue
    const k = t.note.toLowerCase()
    groups.set(k, [...(groups.get(k) ?? []), t])
  }
  const out: Recurring[] = []
  for (const list of groups.values()) {
    const months = new Set(list.map((t) => t.day.slice(0, 7)))
    if (months.size < 3) continue
    const amounts = list.map((t) => t.amount).sort((a, b) => a - b)
    const median = amounts[Math.floor(amounts.length / 2)]!
    const stable = list.filter((t) => Math.abs(t.amount - median) <= Math.max(1, median * 0.15)).length
    // Most charges in the group should sit close to the typical amount, and roughly one per month.
    if (stable / list.length < 0.6 || list.length > months.size * 1.6) continue
    out.push({
      name: list[0]!.note,
      category: totalsBy(list, (t) => t.category)[0]!.name,
      months: months.size,
      typical: median,
      total: sum(list),
    })
  }
  return out.sort((a, b) => b.typical - a.typical)
}
