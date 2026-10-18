/** Day strings are `YYYY-MM-DD`; all math is done in UTC to avoid DST drift. */

export const toUTC = (day: string) => Date.parse(day + 'T00:00:00Z')

export function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(day: string, n: number): string {
  return fromUTC(toUTC(day) + n * 86400000)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86400000) + 1
}

export function startOfMonth(day: string): string {
  return day.slice(0, 8) + '01'
}

export function endOfMonth(day: string): string {
  const d = new Date(toUTC(startOfMonth(day)))
  d.setUTCMonth(d.getUTCMonth() + 1)
  d.setUTCDate(0)
  return fromUTC(d.getTime())
}

export function addMonths(day: string, n: number): string {
  const d = new Date(toUTC(startOfMonth(day)))
  d.setUTCMonth(d.getUTCMonth() + n)
  return fromUTC(d.getTime())
}

/** Monday of the ISO week containing `day`. */
export function startOfWeek(day: string): string {
  const dow = (new Date(toUTC(day)).getUTCDay() + 6) % 7
  return addDays(day, -dow)
}

/** 0 = Monday … 6 = Sunday */
export function weekday(day: string): number {
  return (new Date(toUTC(day)).getUTCDay() + 6) % 7
}

export type Granularity = 'day' | 'week' | 'month'

export function pickGranularity(from: string, to: string): Granularity {
  const n = daysBetween(from, to)
  if (n <= 35) return 'day'
  if (n <= 120) return 'week'
  return 'month'
}

export function bucketOf(day: string, g: Granularity): string {
  if (g === 'month') return day.slice(0, 7)
  if (g === 'week') return startOfWeek(day)
  return day
}

/** Every bucket key between `from` and `to`, so empty periods still show up. */
export function bucketRange(from: string, to: string, g: Granularity): string[] {
  const keys: string[] = []
  if (g === 'month') {
    for (let d = startOfMonth(from); d <= to; d = addMonths(d, 1)) keys.push(d.slice(0, 7))
  } else {
    const step = g === 'week' ? 7 : 1
    for (let d = bucketOf(from, g); d <= to; d = addDays(d, step)) keys.push(d)
  }
  return keys
}

const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit', timeZone: 'UTC' })
const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const monthLongFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function bucketLabel(key: string, g: Granularity): string {
  if (g === 'month') return monthFmt.format(toUTC(key + '-01'))
  return dayFmt.format(toUTC(key))
}

export const formatDay = (day: string) => longFmt.format(toUTC(day))
export const formatMonth = (month: string) => monthLongFmt.format(toUTC(month + '-01'))
