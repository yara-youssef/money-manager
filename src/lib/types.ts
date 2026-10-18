export type TxnType = 'expense' | 'income'

export interface Transaction {
  id: number
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string
  /** Milliseconds, for sorting. */
  time: number
  account: string
  category: string
  note: string
  description: string
  amount: number
  type: TxnType
}

export interface Dataset {
  fileName: string
  currency: string
  importedAt: string
  transactions: Transaction[]
}

export interface Filters {
  from: string
  to: string
  categories: Set<string>
  accounts: Set<string>
  search: string
}
