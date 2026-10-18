import { readSheet } from 'read-excel-file/browser'
import type { Dataset, Transaction, TxnType } from './types'

type Cell = string | number | boolean | Date | null

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

/** Excel dates arrive as UTC-encoded wall-clock times, so read them with UTC getters. */
function toDay(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(v: Cell): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') {
    // Excel serial date (days since 1899-12-30).
    return new Date(Math.round((v - 25569) * 86400 * 1000))
  }
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim()
    // dd.mm.yyyy or dd/mm/yyyy
    const eu = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
    if (eu) {
      const [, d, m, y, hh = '0', mm = '0', ss = '0'] = eu
      return new Date(Date.UTC(+y!, +m! - 1, +d!, +hh, +mm, +ss))
    }
    const t = Date.parse(s.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? '' : 'Z'))
    return isNaN(t) ? null : new Date(t)
  }
  return null
}

function parseAmount(v: Cell): number | null {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    let s = v.replace(/[^\d,.-]/g, '')
    // "1.234,56" → "1234.56"; "1,234.56" → "1234.56"
    if (s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
    const n = parseFloat(s)
    return isNaN(n) ? null : n
  }
  return null
}

function parseType(v: Cell, amount: number): TxnType | null {
  const s = norm(v)
  if (s.startsWith('exp') || s === 'expense' || s === 'expenses') return 'expense'
  if (s.startsWith('inc')) return 'income'
  // Transfers between own accounts are neither spending nor income.
  if (s.startsWith('transfer')) return null
  if (!s) return amount < 0 ? 'expense' : 'income'
  return null
}

/**
 * Parses an export in the "Money Manager" layout:
 * Period | Accounts | Category | Subcategory | Note | <base currency> | Income/Expense | Description | Amount | Currency | Accounts
 */
export function parseRows(rows: Cell[][], fileName: string): Dataset {
  const headerIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'category'))
  if (headerIdx === -1) throw new Error('Could not find a header row with a "Category" column.')
  const header = rows[headerIdx]!.map(norm)
  const col = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n)
      if (i !== -1) return i
    }
    return -1
  }

  const iDate = col('period', 'date')
  const iAccount = col('accounts', 'account')
  const iCategory = col('category')
  const iSub = col('subcategory')
  const iNote = col('note', 'payee', 'merchant')
  const iType = col('income/expense', 'type')
  const iDesc = col('description', 'memo')
  // The column right before "Income/Expense" holds the amount converted to the base
  // currency (its header is the currency code); fall back to the raw "Amount" column.
  const iBase = iType > 0 ? iType - 1 : -1
  const iAmount = col('amount')
  const amountIdx = iBase !== -1 && iBase !== iNote ? iBase : iAmount
  const currency =
    amountIdx === iBase && /^[a-z]{3}$/.test(header[iBase] ?? '')
      ? header[iBase]!.toUpperCase()
      : String(rows[headerIdx + 1]?.[col('currency')] ?? 'EUR').toUpperCase()

  if (iDate === -1) throw new Error('Could not find a "Period" or "Date" column.')
  if (amountIdx === -1) throw new Error('Could not find an amount column.')

  const transactions: Transaction[] = []
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r]!
    const date = parseDate(row[iDate] ?? null)
    const raw = parseAmount(row[amountIdx] ?? null)
    if (!date || raw === null) continue
    const type = parseType(iType === -1 ? null : (row[iType] ?? null), raw)
    if (!type) continue
    const category = String(row[iCategory] ?? '').trim() || 'Uncategorized'
    const sub = iSub === -1 ? '' : String(row[iSub] ?? '').trim()
    transactions.push({
      id: transactions.length,
      day: toDay(date),
      time: date.getTime(),
      account: iAccount === -1 ? 'Default' : String(row[iAccount] ?? '').trim() || 'Default',
      category: sub ? `${category} › ${sub}` : category,
      note: iNote === -1 ? '' : String(row[iNote] ?? '').trim(),
      description: iDesc === -1 ? '' : String(row[iDesc] ?? '').trim(),
      amount: Math.abs(raw),
      type,
    })
  }
  if (!transactions.length) throw new Error('No transactions found in this file.')
  transactions.sort((a, b) => b.time - a.time)
  transactions.forEach((t, i) => (t.id = i))

  return { fileName, currency, importedAt: new Date().toISOString(), transactions }
}

export async function parseFile(file: File): Promise<Dataset> {
  const rows = (await readSheet(file)) as Cell[][]
  return parseRows(rows, file.name)
}
